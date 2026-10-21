import type { Hash, Hex, Address } from 'viem'
import type pg from 'pg'
import {
  type AuditEvent,
  type EscrowLedgerEntry,
  type Ledger,
  type SettlementTx,
  GENESIS_HASH,
  POLICY_VERSION,
  auditHash,
} from './ledger.ts'

/** PostgreSQL ledger. Apply db/schema.sql first. */
export class PgLedger implements Ledger {
  private readonly pool: pg.Pool

  constructor(pool: pg.Pool) {
    this.pool = pool
  }

  async getCursor() {
    const r = await this.pool.query('SELECT block, block_hash FROM indexer_cursor WHERE id = 1')
    return r.rowCount ? { block: BigInt(r.rows[0].block), hash: r.rows[0].block_hash as Hash } : null
  }

  async setCursor(block: bigint, hash: Hash) {
    await this.pool.query(
      `INSERT INTO indexer_cursor (id, block, block_hash) VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE SET block = EXCLUDED.block, block_hash = EXCLUDED.block_hash`,
      [block.toString(), hash],
    )
  }

  async upsertEntries(entries: EscrowLedgerEntry[]) {
    if (!entries.length) return
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      for (const e of entries) {
        await client.query(
          `INSERT INTO wallet_ledger (tx_hash, log_index, match_id, kind, account, amount_wei, escrow_delta_wei, block_number, block_hash)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (tx_hash, log_index) DO UPDATE SET block_number = EXCLUDED.block_number, block_hash = EXCLUDED.block_hash`,
          [e.txHash, e.logIndex, e.matchId, e.kind, e.account, e.amountWei.toString(), e.escrowDeltaWei.toString(), e.blockNumber.toString(), e.blockHash],
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  async deleteEntriesFrom(block: bigint) {
    await this.pool.query('DELETE FROM wallet_ledger WHERE block_number >= $1', [block.toString()])
  }

  async entriesForMatch(matchId: Hex): Promise<EscrowLedgerEntry[]> {
    const r = await this.pool.query('SELECT * FROM wallet_ledger WHERE match_id = $1 ORDER BY block_number, log_index', [matchId])
    return r.rows.map((x) => ({
      matchId: x.match_id,
      kind: x.kind,
      account: x.account as Address | null,
      amountWei: BigInt(x.amount_wei),
      escrowDeltaWei: BigInt(x.escrow_delta_wei),
      txHash: x.tx_hash,
      logIndex: x.log_index,
      blockNumber: BigInt(x.block_number),
      blockHash: x.block_hash,
    }))
  }

  async recordTx(tx: Omit<SettlementTx, 'updatedAt'>) {
    await this.pool.query(
      `INSERT INTO settlement_txs (tx_hash, match_id, action, subject, progress) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tx_hash) DO UPDATE SET progress = EXCLUDED.progress, updated_at = now()`,
      [tx.hash, tx.matchId, tx.action, tx.subject ?? null, tx.progress],
    )
  }

  async txsForMatch(matchId: Hex): Promise<SettlementTx[]> {
    const r = await this.pool.query('SELECT * FROM settlement_txs WHERE match_id = $1 ORDER BY updated_at', [matchId])
    return r.rows.map((x) => ({
      matchId: x.match_id,
      action: x.action,
      hash: x.tx_hash,
      progress: x.progress,
      subject: x.subject ?? undefined,
      updatedAt: new Date(x.updated_at).getTime(),
    }))
  }

  /** Serialized with an advisory lock so the hash chain has a single writer. */
  async appendAudit(e: { actor: string; event: string; matchId: Hex | null; payload: unknown }): Promise<AuditEvent> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock(7744001)')
      const last = await client.query('SELECT seq, integrity_hash FROM audit_events ORDER BY seq DESC LIMIT 1')
      const prevHash = (last.rows[0]?.integrity_hash as Hex) ?? GENESIS_HASH
      const seq = Number(last.rows[0]?.seq ?? 0) + 1
      const base = { seq, ...e, policyVersion: POLICY_VERSION, at: Date.now() }
      const integrityHash = auditHash(prevHash, base)
      const payloadJson = JSON.stringify(e.payload, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))
      await client.query(
        `INSERT INTO audit_events (seq, actor, event, match_id, payload, policy_version, at, prev_hash, integrity_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [seq, e.actor, e.event, e.matchId, payloadJson, POLICY_VERSION, base.at, prevHash, integrityHash],
      )
      await client.query('COMMIT')
      return { ...base, prevHash, integrityHash }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  async auditLog(): Promise<AuditEvent[]> {
    const r = await this.pool.query('SELECT * FROM audit_events ORDER BY seq')
    return r.rows.map((x) => ({
      seq: Number(x.seq),
      actor: x.actor,
      event: x.event,
      matchId: x.match_id,
      payload: JSON.parse(x.payload),
      policyVersion: x.policy_version,
      at: Number(x.at),
      prevHash: x.prev_hash,
      integrityHash: x.integrity_hash,
    }))
  }
}
