/**
 * Settlement coordinator: indexes escrow events and drives active matches to settlement/refund.
 *   node src/main.ts            (Node >= 22.18 runs TypeScript directly)
 * Env: see .env.example
 */
import pg from 'pg'
import type { Hex } from 'viem'
import { loadConfig, readDevPrivateKey } from './config.ts'
import { devAccount } from './keys.ts'
import { EscrowClient } from './escrowClient.ts'
import { EscrowIndexer } from './indexer.ts'
import { PgLedger } from './pgLedger.ts'
import { MemoryLedger, type Ledger } from './ledger.ts'
import { SettlementWorker, type EvidenceSource } from './worker.ts'
import { httpCosigner } from './http.ts'

const cfg = loadConfig()
const operator = devAccount(readDevPrivateKey(process.env, 'OPERATOR_PRIVATE_KEY', cfg.chainId))
const escrow = new EscrowClient(cfg.chainId, cfg.rpcUrl, cfg.escrowAddress, operator)
await escrow.assertChain()

const ledger: Ledger = cfg.databaseUrl ? new PgLedger(new pg.Pool({ connectionString: cfg.databaseUrl })) : new MemoryLedger()
if (!cfg.databaseUrl) console.warn('DATABASE_URL not set: using in-memory ledger (dev only)')

// Wire this to the authoritative game server's signed match ledger.
const evidence: EvidenceSource = {
  async get(matchId: Hex) {
    const base = process.env.MATCH_DIRECTOR_URL
    if (!base) return null
    const r = await fetch(new URL(`/matches/${matchId}/evidence`, base))
    return r.status === 200 ? r.json() : null
  },
}

const indexer = new EscrowIndexer(escrow, ledger, cfg.escrowDeployBlock, cfg.indexerLagBlocks)
const worker = new SettlementWorker(
  escrow,
  ledger,
  evidence,
  cfg.cosignerUrls.map((u) => httpCosigner(u, cfg.cosignerAuthToken)),
)

// Matches the worker is driving. Fed by indexed MatchLocked/ResultSubmitted/MatchAborted events, so a
// restart re-discovers in-flight matches by re-indexing from the stored cursor.
// TODO(prod): also load unfinished matches from the matches table on boot.
const active = new Set<Hex>()

async function loop() {
  try {
    const r = await indexer.tick()
    if (r && r.entries) console.log(`indexed ${r.entries} events in blocks ${r.from}-${r.to}`)
    for (const id of r?.touched ?? []) active.add(id)
    for (const id of active) {
      const step = await worker.tick(id)
      if (step.kind === 'sent') console.log(`${id} ${step.action} ${step.hash}`)
      if (step.kind === 'done') {
        console.log(`${id} ${step.status} reconciled=${step.reconciled}`)
        active.delete(id)
      }
    }
  } catch (e) {
    console.error('settlement loop error', e)
  } finally {
    setTimeout(loop, cfg.pollIntervalMs)
  }
}

console.log(`settlement coordinator on chain ${cfg.chainId}, escrow ${cfg.escrowAddress}, operator ${operator.address}`)
loop()
