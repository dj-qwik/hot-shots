import { type Address, type Hash, type Hex, keccak256, stringToHex } from 'viem'
import type { TxProgress } from '@hotshots/shared'

/** One escrow event, as indexed from chain logs. Idempotent key: (txHash, logIndex). */
export interface EscrowLedgerEntry {
  matchId: Hex
  kind: 'deposit' | 'leave' | 'refund' | 'settled' | 'credit' | 'claim' | 'pushed'
  account: Address | null
  /** Signed effect on the match's escrow balance (deposit +, leave/refund/settle -). Credits/claims are 0 here. */
  escrowDeltaWei: bigint
  amountWei: bigint
  txHash: Hash
  logIndex: number
  blockNumber: bigint
  blockHash: Hash
}

export type SettlementAction = 'create' | 'lock' | 'submit_result' | 'finalize' | 'abort' | 'refund'

export interface SettlementTx {
  matchId: Hex
  action: SettlementAction
  hash: Hash
  progress: TxProgress
  subject?: Address // e.g. refunded player
  updatedAt: number
}

export interface AuditEvent {
  seq: number
  actor: string
  event: string
  matchId: Hex | null
  payload: unknown
  policyVersion: string
  at: number
  prevHash: Hex
  integrityHash: Hex
}

export interface Ledger {
  getCursor(): Promise<{ block: bigint; hash: Hash } | null>
  setCursor(block: bigint, hash: Hash): Promise<void>
  upsertEntries(entries: EscrowLedgerEntry[]): Promise<void>
  /** Reorg handling: drop everything indexed at or after this block. */
  deleteEntriesFrom(block: bigint): Promise<void>
  entriesForMatch(matchId: Hex): Promise<EscrowLedgerEntry[]>
  recordTx(tx: Omit<SettlementTx, 'updatedAt'>): Promise<void>
  txsForMatch(matchId: Hex): Promise<SettlementTx[]>
  appendAudit(e: { actor: string; event: string; matchId: Hex | null; payload: unknown }): Promise<AuditEvent>
  auditLog(): Promise<AuditEvent[]>
}

export const POLICY_VERSION = 'hotshots-rules-v1'
export const GENESIS_HASH = keccak256(stringToHex('hotshots-audit-genesis'))

const json = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))

export function auditHash(prevHash: Hex, e: Omit<AuditEvent, 'integrityHash' | 'prevHash'>): Hex {
  return keccak256(stringToHex(prevHash + json([e.seq, e.actor, e.event, e.matchId, e.payload, e.policyVersion, e.at])))
}

/** Recomputes the hash chain; any edited, deleted or reordered row breaks it. */
export function verifyAuditChain(events: AuditEvent[]): boolean {
  let prev = GENESIS_HASH
  for (const e of events) {
    if (e.prevHash !== prev) return false
    if (auditHash(prev, e) !== e.integrityHash) return false
    prev = e.integrityHash
  }
  return true
}

/** Net escrow balance per the ledger. Must equal 0 once a match is SETTLED or REFUNDED. */
export function escrowBalance(entries: EscrowLedgerEntry[]): bigint {
  return entries.reduce((s, e) => s + e.escrowDeltaWei, 0n)
}

/** In-memory implementation for tests and local dev. Production uses PgLedger. */
export class MemoryLedger implements Ledger {
  private cursor: { block: bigint; hash: Hash } | null = null
  private entries = new Map<string, EscrowLedgerEntry>()
  private txs = new Map<Hash, SettlementTx>()
  private audit: AuditEvent[] = []

  async getCursor() {
    return this.cursor
  }
  async setCursor(block: bigint, hash: Hash) {
    this.cursor = { block, hash }
  }
  async upsertEntries(entries: EscrowLedgerEntry[]) {
    for (const e of entries) this.entries.set(`${e.txHash}:${e.logIndex}`, e)
  }
  async deleteEntriesFrom(block: bigint) {
    for (const [k, e] of this.entries) if (e.blockNumber >= block) this.entries.delete(k)
  }
  async entriesForMatch(matchId: Hex) {
    return [...this.entries.values()]
      .filter((e) => e.matchId === matchId)
      .sort((a, b) => (a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1))
  }
  async recordTx(tx: Omit<SettlementTx, 'updatedAt'>) {
    this.txs.set(tx.hash, { ...tx, updatedAt: Date.now() })
  }
  async txsForMatch(matchId: Hex) {
    return [...this.txs.values()].filter((t) => t.matchId === matchId)
  }
  async appendAudit(e: { actor: string; event: string; matchId: Hex | null; payload: unknown }) {
    const prevHash = this.audit.at(-1)?.integrityHash ?? GENESIS_HASH
    const base = { seq: this.audit.length + 1, ...e, policyVersion: POLICY_VERSION, at: Date.now() }
    const row: AuditEvent = { ...base, prevHash, integrityHash: auditHash(prevHash, base) }
    this.audit.push(row)
    return row
  }
  async auditLog() {
    return [...this.audit]
  }
}
