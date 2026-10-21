import { type Address, type Hex, type LocalAccount, getAddress } from 'viem'
import {
  type MatchEvidence,
  MatchStatus,
  computeResultHash,
  matchResultTypedData,
  rosterHash,
  verifyEvidence,
  type RoundReplay,
  replayHash,
  replayWinner,
  type SimFactory,
} from '@hotshots/shared'
import type { EscrowClient } from './escrowClient.ts'

export interface CosignRequest {
  evidence: MatchEvidence
}

export interface CosignResponse {
  signer: Address
  winner: Address
  resultHash: Hex
  signerSetVersion: string
  signature: Hex
}

export class CosignRefusal extends Error {}

/** Optional deep check: fetch the round replays and re-run the game simulation for every round. */
export interface ReplayCheck {
  createSim: SimFactory
  fetchReplays: (matchId: Hex) => Promise<RoundReplay[] | null>
  stageRevision?: number
}

/** Every round's winner must be exactly what the deterministic simulation produces from the logged inputs. */
export async function verifyReplays(ev: MatchEvidence, players: readonly Address[], check: ReplayCheck): Promise<void> {
  const replays = await check.fetchReplays(ev.matchId)
  if (!replays || replays.length !== ev.rounds.length) throw new CosignRefusal('round replays missing')
  const roster = players.map((a) => getAddress(a))
  ev.rounds.forEach((r, k) => {
    const rp = replays[k]
    if (rp.n !== r.round) throw new CosignRefusal(`replay ${k}: round number mismatch`)
    if (replayHash(rp) !== r.scoreEvidenceHash) throw new CosignRefusal(`round ${r.round}: replay does not match its evidence hash`)
    if (rp.seedReveal !== r.seedReveal) throw new CosignRefusal(`round ${r.round}: seed mismatch`)
    if (check.stageRevision != null && r.stageRevision !== check.stageRevision) throw new CosignRefusal(`round ${r.round}: rules revision ${r.stageRevision} ≠ mine ${check.stageRevision}`)
    if (rp.seats.length !== roster.length || rp.seats.some((a) => !roster.includes(getAddress(a)))) throw new CosignRefusal(`round ${r.round}: seats are not the locked roster`)
    let w: Address
    try { w = replayWinner(check.createSim, rp) } catch (e) { throw new CosignRefusal(`round ${r.round}: replay failed: ${(e as Error).message}`) }
    if (getAddress(w) !== getAddress(r.winner)) throw new CosignRefusal(`round ${r.round}: replay winner ${w} ≠ claimed ${r.winner}`)
  })
}

/**
 * One independent result co-signer. Each runs in its own process with its own key and RPC, and
 * signs ONLY after re-deriving everything from chain state plus the published evidence:
 *  - match is LOCKED on the expected chain/escrow
 *  - roster hash in the evidence equals the on-chain locked roster
 *  - round ledger is valid (one winner per round, champion has exactly 2 (best 2 of 3,
 *    plus a finalists-only round 4 when rounds 1–3 had three different winners),
 *    seed reveals match commitments)
 * It never takes the winner from the requester; it computes it.
 */
export async function cosign(escrow: EscrowClient, account: LocalAccount, req: CosignRequest, replay?: ReplayCheck): Promise<CosignResponse> {
  const ev = req.evidence
  if (ev.chainId !== escrow.chainId) throw new CosignRefusal('wrong chain')
  if (getAddress(ev.escrow) !== getAddress(escrow.address)) throw new CosignRefusal('wrong escrow')

  const [m, players, version] = await Promise.all([
    escrow.getMatch(ev.matchId),
    escrow.getPlayers(ev.matchId),
    escrow.signerSetVersion(),
  ])
  if (m.status !== MatchStatus.LOCKED) throw new CosignRefusal(`match not LOCKED (status ${m.status})`)
  if (m.rosterHash !== ev.rosterHash || rosterHash(players) !== m.rosterHash) {
    throw new CosignRefusal('roster hash does not match on-chain lock')
  }
  if (m.configHash !== ev.configHash) throw new CosignRefusal('config hash mismatch')

  let winner: Address
  try {
    winner = verifyEvidence(ev, players)
  } catch (e) {
    throw new CosignRefusal(`evidence invalid: ${(e as Error).message}`)
  }

  if (replay) await verifyReplays(ev, players, replay)

  const resultHash = computeResultHash(ev)
  const signature = await account.signTypedData(
    matchResultTypedData(escrow.chainId, escrow.address, {
      matchId: ev.matchId,
      winner,
      rosterHash: m.rosterHash,
      resultHash,
      signerSetVersion: version,
      resultNonce: m.resultNonce,
    }),
  )
  return { signer: account.address, winner, resultHash, signerSetVersion: version.toString(), signature }
}
