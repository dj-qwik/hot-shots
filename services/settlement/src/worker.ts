import type { Address, Hash, Hex } from 'viem'
import { type MatchEvidence, MatchStatus, computeResultHash, sortAddresses } from '@hotshots/shared'
import type { EscrowClient } from './escrowClient.ts'
import type { CosignRequest, CosignResponse } from './cosigner.ts'
import { checkTx } from './finality.ts'
import { type Ledger, type SettlementAction, escrowBalance } from './ledger.ts'

/** Source of finished match evidence (the match director / authoritative game server). */
export interface EvidenceSource {
  get(matchId: Hex): Promise<MatchEvidence | null>
}

/** Transport to the independent co-signers (HTTP in production, direct calls in tests). */
export type CosignerTransport = (req: CosignRequest) => Promise<CosignResponse>

export type WorkerStep =
  | { kind: 'idle'; reason: string }
  | { kind: 'sent'; action: SettlementAction; hash: Hash; subject?: Address }
  | { kind: 'done'; status: 'SETTLED' | 'REFUNDED'; reconciled: boolean }

/**
 * Drives one match from LOCKED to SETTLED (or ABORTED to REFUNDED). Stateless and idempotent:
 * every tick re-reads chain state and takes at most one action, so crashes, retries and concurrent
 * workers are safe (the contract rejects duplicates). The relayer pays gas; the pot is never touched.
 */
export class SettlementWorker {
  private readonly escrow: EscrowClient
  private readonly ledger: Ledger
  private readonly evidence: EvidenceSource
  private readonly cosigners: CosignerTransport[]
  private readonly now: () => Promise<bigint>

  constructor(
    escrow: EscrowClient,
    ledger: Ledger,
    evidence: EvidenceSource,
    cosigners: CosignerTransport[],
    now: () => Promise<bigint> = async () => (await escrow.pub.getBlock()).timestamp,
  ) {
    this.escrow = escrow
    this.ledger = ledger
    this.evidence = evidence
    this.cosigners = cosigners
    this.now = now
  }

  async tick(matchId: Hex): Promise<WorkerStep> {
    // Don't stack a new tx on one that is still pending.
    for (const t of await this.ledger.txsForMatch(matchId)) {
      if (t.progress === 'broadcast') {
        const s = await checkTx(this.escrow.pub, t.hash)
        await this.ledger.recordTx({ ...t, progress: s.progress })
        if (s.progress === 'broadcast') return { kind: 'idle', reason: `waiting on ${t.action} ${t.hash}` }
      }
    }

    const m = await this.escrow.getMatch(matchId)
    const now = await this.now()

    switch (m.status) {
      case MatchStatus.LOCKED: {
        if (now > m.resultDeadline) return this.send(matchId, 'abort', () => this.escrow.abortMatch(matchId))
        const ev = await this.evidence.get(matchId)
        if (!ev) return { kind: 'idle', reason: 'match in progress' }
        const sigs = await this.collectSignatures(ev)
        if (!sigs) return { kind: 'idle', reason: 'insufficient co-signatures' }
        return this.send(matchId, 'submit_result', () =>
          this.escrow.submitResult(matchId, sigs.winner, sigs.resultHash, sigs.signatures),
        )
      }
      case MatchStatus.RESULT_FINAL: {
        const at = m.resultSubmittedAt + BigInt(m.disputeWindow)
        if (now < at) return { kind: 'idle', reason: `dispute window open until ${at}` }
        return this.send(matchId, 'finalize', () => this.escrow.finalizeSettlement(matchId))
      }
      case MatchStatus.ABORTED: {
        // Relayer pushes refunds so players don't need gas. Funds can only go to each depositor.
        for (const p of await this.escrow.getPlayers(matchId)) {
          if (!(await this.escrow.refundClaimed(matchId, p))) {
            return this.send(matchId, 'refund', () => this.escrow.claimRefundFor(matchId, p), p)
          }
        }
        return { kind: 'idle', reason: 'refunds pending indexing' }
      }
      case MatchStatus.SETTLED:
      case MatchStatus.REFUNDED: {
        const reconciled = escrowBalance(await this.ledger.entriesForMatch(matchId)) === 0n
        return { kind: 'done', status: m.status === MatchStatus.SETTLED ? 'SETTLED' : 'REFUNDED', reconciled }
      }
      default:
        return { kind: 'idle', reason: `status ${m.status}: lobby phase` }
    }
  }

  /**
   * Ask every co-signer; keep valid responses that agree on (winner, resultHash), order them by
   * signer address as the contract requires, and return them once the on-chain threshold is met.
   */
  private async collectSignatures(ev: MatchEvidence) {
    const expectedHash = computeResultHash(ev)
    const threshold = await this.escrow.signerThreshold()
    const settled = await Promise.allSettled(this.cosigners.map((c) => c({ evidence: ev })))
    const ok = settled
      .filter((r): r is PromiseFulfilledResult<CosignResponse> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((r) => r.resultHash === expectedHash)

    const winners = new Set(ok.map((r) => r.winner.toLowerCase()))
    if (winners.size > 1) {
      await this.ledger.appendAudit({
        actor: 'settlement-worker',
        event: 'cosigner_disagreement',
        matchId: ev.matchId,
        payload: ok.map((r) => ({ signer: r.signer, winner: r.winner })),
      })
      return null
    }
    const bySigner = new Map(ok.map((r) => [r.signer.toLowerCase(), r]))
    if (bySigner.size < threshold) return null
    const order = sortAddresses([...bySigner.values()].map((r) => r.signer))
    const signatures = order.slice(0, Math.max(threshold, 1)).map((a) => bySigner.get(a.toLowerCase())!.signature)
    return { winner: ok[0].winner, resultHash: expectedHash, signatures }
  }

  private async send(matchId: Hex, action: SettlementAction, fn: () => Promise<Hash>, subject?: Address): Promise<WorkerStep> {
    const hash = await fn()
    await this.ledger.recordTx({ matchId, action, hash, progress: 'broadcast', subject })
    await this.ledger.appendAudit({ actor: 'settlement-worker', event: action, matchId, payload: { hash, subject } })
    return { kind: 'sent', action, hash, subject }
  }
}
