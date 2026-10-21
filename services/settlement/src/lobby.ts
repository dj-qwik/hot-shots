import type { Address, Hash, Hex } from 'viem'
import {
  LEGAL_MATCH_SIZES,
  MatchStatus,
  STAKE_TIERS_WEI,
  buildAllowlist,
  configHash,
  matchIdFromLobby,
  sortAddresses,
} from '@hotshots/shared'
import type { EscrowClient } from './escrowClient.ts'
import type { Ledger } from './ledger.ts'

export interface LobbySpec {
  lobbyId: string
  region: string
  capacity: number
  stakeWei: bigint
  /** Seconds from now until entries close and an unlocked lobby becomes refundable. */
  admissionSeconds: number
  rulesVersion: string
  stagePoolVersion: string
  /** Private lobby: only these wallets may deposit. */
  allowlist?: Address[]
  /** Custom private lobbies may use any size 2..16 (spec §4). */
  private?: boolean
}

const ZERO32 = `0x${'0'.repeat(64)}` as Hex

/** Bridges the off-chain LobbyService to the escrow: open, ready-check lock, expiry abort. */
export class LobbyEscrow {
  private readonly escrow: EscrowClient
  private readonly ledger: Ledger

  constructor(
    escrow: EscrowClient,
    ledger: Ledger,
  ) {
    this.escrow = escrow
    this.ledger = ledger
  }

  async open(spec: LobbySpec): Promise<{ matchId: Hex; configHash: Hex; allowlistRoot: Hex; hash: Hash }> {
    if (!spec.private && !(LEGAL_MATCH_SIZES as readonly number[]).includes(spec.capacity)) {
      throw new Error(`public lobbies must be one of ${LEGAL_MATCH_SIZES.join('/')}`)
    }
    if (!spec.private && !STAKE_TIERS_WEI.includes(spec.stakeWei)) throw new Error('stake is not a published tier')

    const matchId = matchIdFromLobby(spec.lobbyId)
    const cfgHash = configHash({
      rulesVersion: spec.rulesVersion,
      stakeTierWei: spec.stakeWei,
      capacity: spec.capacity,
      region: spec.region,
      stagePoolVersion: spec.stagePoolVersion,
    })
    const allowlistRoot = spec.allowlist?.length ? buildAllowlist(spec.allowlist).root : ZERO32
    const head = await this.escrow.pub.getBlock()
    const hash = await this.escrow.createMatch(
      matchId,
      {
        entryAmount: spec.stakeWei,
        capacity: spec.capacity,
        admissionDeadline: head.timestamp + BigInt(spec.admissionSeconds),
        configHash: cfgHash,
      },
      allowlistRoot,
    )
    await this.ledger.recordTx({ matchId, action: 'create', hash, progress: 'broadcast' })
    await this.ledger.appendAudit({ actor: 'lobby', event: 'escrow_open', matchId, payload: { ...spec, configHash: cfgHash, hash } })
    return { matchId, configHash: cfgHash, allowlistRoot, hash }
  }

  /**
   * Called once every seated player has passed the ready check. Locks only if the on-chain
   * depositor set is exactly the set of ready players; otherwise returns the mismatch so the
   * lobby can wait, kick, or cancel. If someone joins/leaves in the instant between this check and
   * the lock, the contract still locks whoever deposited; seat players from the returned roster.
   */
  async lockIfReady(
    matchId: Hex,
    readyPlayers: Address[],
  ): Promise<{ locked: true; hash: Hash; roster: Address[] } | { locked: false; missingDeposit: Address[]; notReady: Address[] }> {
    const onchain = sortAddresses(await this.escrow.getPlayers(matchId))
    const ready = sortAddresses(readyPlayers)
    const onSet = new Set(onchain.map((a) => a.toLowerCase()))
    const readySet = new Set(ready.map((a) => a.toLowerCase()))
    const missingDeposit = ready.filter((a) => !onSet.has(a.toLowerCase()))
    const notReady = onchain.filter((a) => !readySet.has(a.toLowerCase()))
    if (missingDeposit.length || notReady.length || onchain.length < 2) {
      return { locked: false, missingDeposit, notReady }
    }
    const { hash, roster } = await this.escrow.lockMatch(matchId)
    await this.ledger.recordTx({ matchId, action: 'lock', hash, progress: 'broadcast' })
    await this.ledger.appendAudit({ actor: 'lobby', event: 'escrow_lock', matchId, payload: { roster, hash } })
    return { locked: true, hash, roster }
  }

  /** Lobby never started: cancel so every depositor is refunded (worker pushes refunds). */
  async cancel(matchId: Hex, reason: string): Promise<Hash | null> {
    const m = await this.escrow.getMatch(matchId)
    if (m.status !== MatchStatus.CREATED && m.status !== MatchStatus.FUNDED) return null
    const hash = await this.escrow.abortMatch(matchId)
    await this.ledger.recordTx({ matchId, action: 'abort', hash, progress: 'broadcast' })
    await this.ledger.appendAudit({ actor: 'lobby', event: 'escrow_cancel', matchId, payload: { reason, hash } })
    return hash
  }
}
