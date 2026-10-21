// Real-money (escrowed ETH on Robinhood Chain) side of the game server.
//  - Derives its operator wallet from a secret Render generates (no human ever handles a key).
//  - First boot with no escrow configured: deploys HotShotsEscrow (testnet), grants itself OPERATOR,
//    makes OWNER_ADDRESS the guardian (pause/veto) and fee treasury, registers the co-signers.
//  - Cash lobbies are on-chain matches: players deposit from their own wallet (Privy) into the escrow; the
//    lobby fills from on-chain deposits, locks, and plays with no bots. Unfilled lobbies are cancelled and
//    every deposit is refunded automatically.
//  - Finished matches publish evidence + full round replays; independent co-signers replay and sign;
//    the settlement worker submits, waits out the dispute window, and pays the champion.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createPublicClient, createWalletClient, http, keccak256, getAddress, isAddress, formatEther, parseEther } from 'viem'
import {
  getChain, escrowAbi, isSupportedChainId, ROBINHOOD_MAINNET_ID, STAKE_TIERS_WEI, LEGAL_MATCH_SIZES,
  rosterHash, configHash, matchIdFromLobby, sortAddresses, stageIdOf, replayHash, MatchStatus,
} from '@hotshots/shared'
import { EscrowClient } from '../../services/settlement/src/escrowClient.ts'
import { LobbyEscrow } from '../../services/settlement/src/lobby.ts'
import { SettlementWorker } from '../../services/settlement/src/worker.ts'
import { EscrowIndexer } from '../../services/settlement/src/indexer.ts'
import { MemoryLedger } from '../../services/settlement/src/ledger.ts'
import { httpCosigner } from '../../services/settlement/src/http.ts'
import { derivedAccount } from '../../services/settlement/src/keys.ts'

const BYTECODE = JSON.parse(fs.readFileSync(new URL('../../packages/shared/src/escrowBytecode.json', import.meta.url), 'utf8')).bytecode
const log = (...a) => console.log(new Date().toISOString(), '[cash]', ...a)
export const RULES_VERSION = 'hotshots-rules-1'
export const ADMISSION_SECONDS = 600 // an unfilled lobby is cancelled (and refunded) after 10 minutes
const CASH_SIZES = [2, 4, 6, 8].filter((n) => LEGAL_MATCH_SIZES.includes(n))

/** Wallet derived from a long random secret (Render `generateValue`). Testnet only; mainnet needs a KMS signer. */
export function deriveAccount(secret, role, chainId) {
  if (chainId === ROBINHOOD_MAINNET_ID && process.env.ALLOW_RAW_KEYS_ON_MAINNET !== 'i-understand') throw new Error(`${role}: derived keys are disabled on mainnet; use a KMS-backed signer`)
  return derivedAccount(secret, role)
}

// tiny persistent settings store: Postgres when DATABASE_URL is set, else a JSON file (local dev)
async function settingsStore() {
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg')
    // Render's internal Postgres hostnames have no dots and don't use TLS; external ones need it
    const host = new URL(process.env.DATABASE_URL).hostname
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === 'off' || !host.includes('.') ? false : { rejectUnauthorized: false } })
    await pool.query('create table if not exists hs_settings (k text primary key, v jsonb not null, at timestamptz default now())')
    await pool.query('create table if not exists hs_evidence (match_id text primary key, evidence jsonb not null, replays jsonb not null, at timestamptz default now())')
    return {
      pool,
      get: async (k) => (await pool.query('select v from hs_settings where k=$1', [k])).rows[0]?.v ?? null,
      set: (k, v) => pool.query('insert into hs_settings(k,v) values($1,$2) on conflict (k) do update set v=excluded.v, at=now()', [k, JSON.stringify(v)]),
      putEvidence: (id, ev, rp) => pool.query('insert into hs_evidence(match_id,evidence,replays) values($1,$2,$3) on conflict (match_id) do nothing', [id, JSON.stringify(ev), JSON.stringify(rp)]),
      getEvidence: async (id) => { const r = (await pool.query('select evidence, replays from hs_evidence where match_id=$1', [id])).rows[0]; return r ? { evidence: r.evidence, replays: r.replays } : null },
    }
  }
  const file = path.resolve(process.env.DATA_DIR || '.data', 'cash.json')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { settings: {}, evidence: {} }
  const save = () => fs.writeFileSync(file, JSON.stringify(db))
  return {
    get: async (k) => db.settings[k] ?? null,
    set: async (k, v) => { db.settings[k] = v; save() },
    putEvidence: async (id, ev, rp) => { db.evidence[id] ??= { evidence: ev, replays: rp }; save() },
    getEvidence: async (id) => db.evidence[id] || null,
  }
}

export async function createCash({ createMatch, onLobbyChange }) {
  const chainId = Number(process.env.CHAIN_ID || 46630)
  if (!isSupportedChainId(chainId)) throw new Error('CHAIN_ID must be 4663 or 46630')
  const rpcUrl = process.env.RPC_URL || (chainId === 46630 ? 'https://rpc.testnet.chain.robinhood.com' : 'https://rpc.mainnet.chain.robinhood.com')
  const chain = getChain(chainId, rpcUrl)
  const operator = deriveAccount(process.env.OPERATOR_SECRET, 'operator', chainId)
  const owner = process.env.OWNER_ADDRESS && isAddress(process.env.OWNER_ADDRESS) ? getAddress(process.env.OWNER_ADDRESS) : null
  const cosignerUrls = (process.env.COSIGNER_URLS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const authToken = process.env.COSIGNER_AUTH_TOKEN || ''
  const pub = createPublicClient({ chain, transport: http(rpcUrl) })
  const wallet = createWalletClient({ chain, transport: http(rpcUrl), account: operator })
  const store = await settingsStore()
  const C = {
    chainId, rpcUrl, operator: operator.address, owner, escrow: null, deployBlock: 0n, status: 'starting', error: null,
    lobbies: new Map(), // matchId → lobby
    balanceWei: 0n, pub, store,
  }

  // ── status for /api/config and the setup page
  C.publicConfig = () => ({
    enabled: C.status === 'ready', status: C.status, error: C.error, chainId, rpcUrl, escrow: C.escrow, escrowDeployBlock: String(C.deployBlock),
    operator: C.operator, operatorBalance: formatEther(C.balanceWei), owner, tiers: STAKE_TIERS_WEI.map((w) => formatEther(w)), sizes: CASH_SIZES,
    privyAppId: process.env.PRIVY_APP_ID || null, explorer: chain.blockExplorers?.default?.url || null, admissionSeconds: ADMISSION_SECONDS,
  })
  const refreshBalance = async () => { try { C.balanceWei = await pub.getBalance({ address: C.operator }) } catch {} }

  // ── co-signer addresses (each co-signer reports its own at /health)
  async function cosignerAddresses() {
    const out = []
    for (const u of cosignerUrls) {
      try { const r = await fetch(new URL('/health', u), { signal: AbortSignal.timeout(90000) }); const j = await r.json(); if (isAddress(j.signer)) out.push(getAddress(j.signer)) } catch (e) { log('co-signer unreachable', u, e.message) }
    }
    return out
  }

  // ── find or deploy the escrow
  const ESCROW_KEY = `escrow:${chainId}:v2`
  // 0 = winners are paid in the same transaction that records the co-signed result
  const DISPUTE_WINDOW = Number(process.env.DISPUTE_WINDOW ?? 0)
  async function ensureEscrow() {
    if (process.env.ESCROW_ADDRESS) { C.escrow = getAddress(process.env.ESCROW_ADDRESS); C.deployBlock = BigInt(process.env.ESCROW_DEPLOY_BLOCK || 0); return }
    // v2 = instant-payout escrow (dispute window 0). An older escrow keeps a "legacy" lane below so
    // matches still pending on it get paid.
    const saved = await store.get(ESCROW_KEY)
    if (saved) { C.escrow = getAddress(saved.address); C.deployBlock = BigInt(saved.block); return }
    if (chainId === ROBINHOOD_MAINNET_ID) throw new Error('mainnet: deploy the escrow with the Safe as admin and set ESCROW_ADDRESS')
    if (!owner) throw new Error('set OWNER_ADDRESS (your wallet: receives the 10% house fee and can pause/veto)')
    // wait for gas money and for the co-signers to report in
    for (;;) {
      await refreshBalance()
      if (C.balanceWei >= parseEther('0.002')) break
      C.status = 'needs-gas'; await new Promise((r) => setTimeout(r, 15000))
    }
    C.status = 'waiting-for-cosigners'
    let signers = []
    for (let tries = 0; tries < 40; tries++) { signers = await cosignerAddresses(); if (signers.length >= Math.min(2, cosignerUrls.length) && signers.length) break; await new Promise((r) => setTimeout(r, 15000)) }
    if (!signers.length) throw new Error('no co-signers reachable (COSIGNER_URLS)')
    const threshold = Math.min(2, signers.length)
    C.status = 'deploying'
    log(`deploying HotShotsEscrow on ${chainId}: admin(operator)=${C.operator} guardian+treasury=${owner} signers=${signers.join(',')} m=${threshold}`)
    const hash = await wallet.deployContract({ abi: escrowAbi, bytecode: BYTECODE,
      args: [BigInt(chainId), C.operator, 2 * 24 * 3600, owner, sortAddresses(signers), threshold, DISPUTE_WINDOW, 3 * 3600] })
    const rc = await pub.waitForTransactionReceipt({ hash, timeout: 180000 })
    if (rc.status !== 'success' || !rc.contractAddress) throw new Error('escrow deploy failed ' + hash)
    const escrow = getAddress(rc.contractAddress)
    for (const [role, who] of [['OPERATOR_ROLE', C.operator], ['GUARDIAN_ROLE', owner]]) {
      const id = await pub.readContract({ address: escrow, abi: escrowAbi, functionName: role })
      const h = await wallet.writeContract({ address: escrow, abi: escrowAbi, functionName: 'grantRole', args: [id, who] })
      await pub.waitForTransactionReceipt({ hash: h, timeout: 180000 })
    }
    await store.set(ESCROW_KEY, { address: escrow, block: String(rc.blockNumber), signers, threshold, tx: hash })
    C.escrow = escrow; C.deployBlock = rc.blockNumber
    log('escrow live at', escrow, 'block', rc.blockNumber)
  }

  // ── settlement machinery (shared, tested code from services/settlement)
  let escrow, lobbyEscrow, worker, indexer
  const ledger = new MemoryLedger()
  const active = new Set()
  const evidenceSource = { async get(matchId) { const e = await store.getEvidence(matchId); return e ? e.evidence : null } }

  // older escrow (before instant payouts): keep finalizing whatever is still pending there
  async function startLegacy() {
    const old = await store.get(`escrow:${chainId}`)
    if (!old || !C.escrow || getAddress(old.address) === C.escrow) return
    const lesc = new EscrowClient(chainId, rpcUrl, getAddress(old.address), operator)
    const lledger = new MemoryLedger()
    const lworker = new SettlementWorker(lesc, lledger, evidenceSource, cosignerUrls.map((u) => httpCosigner(u, authToken)))
    const lindexer = new EscrowIndexer(lesc, lledger, BigInt(old.block), 0n)
    const lactive = new Set(), quiet = { n: 0 }
    log('legacy escrow lane', old.address)
    const tick = async () => {
      let r = null
      try {
        r = await lindexer.tick()
        for (const id of r?.touched ?? []) lactive.add(id)
        for (const id of [...lactive]) {
          const step = await lworker.tick(id)
          C.settleStatus.set(id, step)
          if (step.kind === 'sent') log('legacy', id.slice(0, 10), step.action, step.hash)
          if (step.kind === 'done') lactive.delete(id)
        }
        C.legacy = { escrow: old.address, pending: lactive.size }
      } catch (e) { log('legacy lane', e.message) }
      setTimeout(tick, r ? 300 : 30000) // catch up quickly, then idle
    }
    tick()
    C.legacyEscrow = lesc
  }

  C.start = async () => {
    try {
      await refreshBalance()
      await ensureEscrow()
      startLegacy().catch((e) => log('legacy lane failed', e.message))
      escrow = new EscrowClient(chainId, rpcUrl, C.escrow, operator)
      await escrow.assertChain()
      lobbyEscrow = new LobbyEscrow(escrow, ledger)
      worker = new SettlementWorker(escrow, ledger, evidenceSource, cosignerUrls.map((u) => httpCosigner(u, authToken)))
      indexer = new EscrowIndexer(escrow, ledger, C.deployBlock, 0n)
      const pending = (await store.get('active-matches')) || []
      pending.forEach((id) => active.add(id))
      C.status = 'ready'; C.error = null
      log('ready: escrow', C.escrow, 'operator', C.operator, 'balance', formatEther(C.balanceWei))
      settleLoop(); lobbyLoop()
    } catch (e) {
      C.status = 'error'; C.error = e.message; log('cash setup failed:', e.message)
      setTimeout(C.start, 30000)
    }
  }

  // ── lobbies
  // lobby = { matchId, lobbyId, stakeWei, size, state: opening|open|locking|playing|cancelled, deadline, depositors[], waiting: Map(wallet → conn), match }
  C.findOrOpen = async (stakeWei, size) => {
    for (const L of C.lobbies.values()) if (L.stakeWei === stakeWei && L.size === size && (L.state === 'open' || L.state === 'opening') && L.depositors.length < size) return L
    const lobbyId = crypto.randomUUID()
    const L = { lobbyId, matchId: matchIdFromLobby(lobbyId), stakeWei, size, state: 'opening', depositors: [], waiting: new Map(), deadline: Date.now() + ADMISSION_SECONDS * 1000, createdAt: Date.now() }
    C.lobbies.set(L.matchId, L)
    lobbyEscrow.open({ lobbyId, region: 'oregon', capacity: size, stakeWei, admissionSeconds: ADMISSION_SECONDS, rulesVersion: RULES_VERSION, stagePoolVersion: 'arenas-20' })
      .then(async ({ hash }) => {
        const rc = await pub.waitForTransactionReceipt({ hash, timeout: 180000 })
        if (rc.status !== 'success') throw new Error('createMatch reverted')
        L.state = 'open'; L.openTx = hash; onLobbyChange(L)
      })
      .catch((e) => { log('open lobby failed', e.message); L.state = 'failed'; L.error = e.message; onLobbyChange(L); C.lobbies.delete(L.matchId) })
    return L
  }
  C.lobbyView = (L, wallet) => ({
    t: 'cashLobby', matchId: L.matchId, size: L.size, stake: formatEther(L.stakeWei), state: L.state, deadlineMs: Math.max(0, L.deadline - Date.now()),
    seats: L.depositors.map((a) => ({ wallet: a, you: wallet && a.toLowerCase() === wallet.toLowerCase(), online: L.waiting.has(a.toLowerCase()) })),
    youDeposited: !!(wallet && L.depositors.some((a) => a.toLowerCase() === wallet.toLowerCase())), escrow: C.escrow, chainId, error: L.error || null,
  })
  async function lobbyLoop() {
    for (const L of [...C.lobbies.values()]) {
      try {
        if (L.state !== 'open') continue
        const players = (await escrow.getPlayers(L.matchId)).map((a) => getAddress(a))
        const changed = players.join() !== L.depositors.join()
        L.depositors = players
        if (players.length >= L.size) {
          L.state = 'locking'; onLobbyChange(L)
          const r = await lobbyEscrow.lockIfReady(L.matchId, players)
          if (!r.locked) { L.state = 'open'; continue }
          await pub.waitForTransactionReceipt({ hash: r.hash, timeout: 180000 })
          L.roster = sortAddresses(r.roster)
          active.add(L.matchId); await store.set('active-matches', [...active])
          L.state = 'playing'; L.match = createMatch(L); onLobbyChange(L)
        } else if (Date.now() > L.deadline) {
          L.state = 'cancelled'; onLobbyChange(L)
          await lobbyEscrow.cancel(L.matchId, 'lobby did not fill'); active.add(L.matchId) // the worker pushes refunds
          await store.set('active-matches', [...active])
          C.lobbies.delete(L.matchId)
        } else if (changed) onLobbyChange(L)
      } catch (e) { log('lobby', L.matchId.slice(0, 10), e.message) }
    }
    setTimeout(lobbyLoop, 2500)
  }

  // ── evidence from a finished match (seats are the locked roster in sorted order)
  C.publishEvidence = async (L, m) => {
    const seats = L.roster
    const replays = m.audit.map((a) => ({ n: a.n, key: a.key, seedReveal: a.seedReveal, active: a.active, players: a.players, seats, inputs: a.inputs }))
    const rounds = replays.map((r, k) => ({
      round: r.n, stageId: stageIdOf(r.key), stageRevision: Number(process.env.STAGE_REVISION || 1),
      seedCommitment: keccak256(r.seedReveal), seedReveal: r.seedReveal, winner: seats[m.roundWinners[k]], scoreEvidenceHash: replayHash(r),
    }))
    const evidence = { chainId, escrow: C.escrow, matchId: L.matchId, rosterHash: rosterHash(seats), configHash: (await escrow.getMatch(L.matchId)).configHash, rounds }
    await store.putEvidence(L.matchId, evidence, replays)
    log('evidence published', L.matchId.slice(0, 10), 'rounds', rounds.length, 'champion', seats[m.champion])
    active.add(L.matchId); kick() // settle right away: winners are paid the moment the co-signers agree
  }
  C.getEvidence = (matchId) => store.getEvidence(matchId)

  // ── settlement loop: index events, drive every locked/aborted match to payout/refund
  C.settleStatus = new Map() // matchId → last step text
  let loopTimer = null, looping = false, again = false
  function kick() { if (looping) { again = true; return } clearTimeout(loopTimer); settleLoop() }
  async function settleLoop() {
    looping = true
    try {
      const r = await indexer.tick()
      for (const id of r?.touched ?? []) active.add(id)
      for (const id of [...active]) {
        const step = await worker.tick(id)
        C.settleStatus.set(id, step)
        if (step.kind === 'sent') log(id.slice(0, 10), step.action, step.hash)
        if (step.kind === 'done') { log(id.slice(0, 10), step.status); active.delete(id); await store.set('active-matches', [...active]) }
      }
      await refreshBalance()
    } catch (e) { log('settle loop', e.message) }
    looping = false
    loopTimer = setTimeout(settleLoop, again ? 250 : Number(process.env.POLL_INTERVAL_MS || 4000)); again = false
  }
  C.matchStatus = async (matchId) => {
    let m = await escrow.getMatch(matchId)
    if (!m.status && C.legacyEscrow) m = await C.legacyEscrow.getMatch(matchId) // older match
    const step = C.settleStatus.get(matchId)
    return { status: Object.keys(MatchStatus).find((k) => MatchStatus[k] === m.status) || String(m.status), winner: m.winner, resultSubmittedAt: String(m.resultSubmittedAt), disputeWindow: m.disputeWindow, step: step ? (step.reason || step.action || step.status || step.kind) : null }
  }
  return C
}
