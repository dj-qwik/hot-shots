/**
 * End-to-end: real contract bytecode + real service code against a local anvil node running with
 * chain id 46630 (Robinhood Chain testnet id). Requires `anvil` on PATH and `forge build` output.
 *   node --test services/settlement/test/e2e.anvil.test.ts
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  type Address,
  type Hex,
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  keccak256,
  parseEther,
  toHex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import {
  type MatchEvidence,
  MatchStatus,
  buildAllowlist,
  escrowAbi,
  getChain,
  rosterHash,
  sortAddresses,
  splitPot,
} from '@hotshots/shared'
import { EscrowClient } from '../src/escrowClient.ts'
import { EscrowIndexer } from '../src/indexer.ts'
import { LobbyEscrow } from '../src/lobby.ts'
import { MemoryLedger, escrowBalance, verifyAuditChain } from '../src/ledger.ts'
import { SettlementWorker, type CosignerTransport, type EvidenceSource } from '../src/worker.ts'
import { CosignRefusal, cosign } from '../src/cosigner.ts'
import { checkTx } from '../src/finality.ts'

const CHAIN_ID = 46630
const PORT = 18545 + Math.floor(Math.random() * 1000)
const RPC = `http://127.0.0.1:${PORT}`
const ANVIL = process.env.ANVIL_BIN ?? 'anvil'

// anvil's well-known dev keys (public test keys; never use on a real network)
const K = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
] as const satisfies readonly Hex[]

const chain = getChain(CHAIN_ID, RPC)
const pub = createPublicClient({ chain, transport: http(RPC) })
const testClient = createTestClient({ chain, transport: http(RPC), mode: 'anvil' })
const admin = privateKeyToAccount(K[0])
const operator = privateKeyToAccount(K[1])
const guardian = privateKeyToAccount(K[2])
const cosignerAccts = [privateKeyToAccount(K[3]), privateKeyToAccount(K[4]), privateKeyToAccount(K[5])]
const treasury = '0x000000000000000000000000000000000000dEaD' as Address
const STAKE = parseEther('0.01')
const DISPUTE = 60 * 60

let anvil: ChildProcess
let escrowAddr: Address
let opClient: EscrowClient
let readClient: EscrowClient

function playerKey(i: number): Hex {
  return keccak256(toHex(`hotshots-e2e-player-${i}`))
}
const player = (i: number) => privateKeyToAccount(playerKey(i))

async function fund(addr: Address) {
  await testClient.setBalance({ address: addr, value: parseEther('10') })
}

async function join(i: number, matchId: Hex, proof: Hex[] = []) {
  const acct = player(i)
  const w = createWalletClient({ chain, transport: http(RPC), account: acct })
  const hash = await w.writeContract({ address: escrowAddr, abi: escrowAbi, functionName: 'joinMatch', args: [matchId, proof], value: STAKE })
  const r = await pub.waitForTransactionReceipt({ hash })
  assert.equal(r.status, 'success')
  return acct.address
}

async function mineUntilIdle(hashes: Hex[]) {
  for (const h of hashes) await pub.waitForTransactionReceipt({ hash: h })
}

const directCosigners: CosignerTransport[] = cosignerAccts.map((a) => (req) => cosign(readClient, a, req))

function evidenceFor(matchId: Hex, roster: Address[], winners: Address[], cfgHash: Hex): MatchEvidence {
  return {
    chainId: CHAIN_ID,
    escrow: escrowAddr,
    matchId,
    rosterHash: rosterHash(roster),
    configHash: cfgHash,
    rounds: winners.map((w, i) => {
      const seedReveal = keccak256(toHex(`${matchId}-seed-${i}`))
      return {
        round: i + 1,
        stageId: (i * 7) % 50 + 1,
        stageRevision: 1,
        seedCommitment: keccak256(seedReveal),
        seedReveal,
        winner: w,
        scoreEvidenceHash: keccak256(toHex(`${matchId}-score-${i}`)),
      }
    }),
  }
}

before(async () => {
  anvil = spawn(ANVIL, ['--chain-id', String(CHAIN_ID), '--port', String(PORT), '--silent'], { stdio: 'ignore' })
  for (let i = 0; i < 100; i++) {
    try {
      if ((await pub.getChainId()) === CHAIN_ID) break
    } catch {}
    await new Promise((r) => setTimeout(r, 100))
  }

  const artifact = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../contracts/out/HotShotsEscrow.sol/HotShotsEscrow.json', import.meta.url)), 'utf8'),
  )
  const deployer = createWalletClient({ chain, transport: http(RPC), account: admin })
  const signers = sortAddresses(cosignerAccts.map((a) => a.address))
  const hash = await deployer.deployContract({
    abi: escrowAbi,
    bytecode: artifact.bytecode.object,
    args: [BigInt(CHAIN_ID), admin.address, 2 * 24 * 3600, treasury, signers, 2, DISPUTE, 3n * 3600n],
  })
  escrowAddr = (await pub.waitForTransactionReceipt({ hash })).contractAddress!

  const opRole = await pub.readContract({ address: escrowAddr, abi: escrowAbi, functionName: 'OPERATOR_ROLE' })
  const gRole = await pub.readContract({ address: escrowAddr, abi: escrowAbi, functionName: 'GUARDIAN_ROLE' })
  await mineUntilIdle([
    await deployer.writeContract({ address: escrowAddr, abi: escrowAbi, functionName: 'grantRole', args: [opRole, operator.address] }),
  ])
  await mineUntilIdle([
    await deployer.writeContract({ address: escrowAddr, abi: escrowAbi, functionName: 'grantRole', args: [gRole, guardian.address] }),
  ])

  opClient = new EscrowClient(CHAIN_ID, RPC, escrowAddr, operator)
  readClient = new EscrowClient(CHAIN_ID, RPC, escrowAddr)
  for (let i = 0; i < 20; i++) await fund(player(i).address)
})

after(() => {
  anvil?.kill()
})

test('assertChain accepts the right chain and contract', async () => {
  await opClient.assertChain()
})

test('happy path: open → deposits → ready-check lock → co-signed result → dispute window → 90/10 payout', async () => {
  const ledger = new MemoryLedger()
  const lobby = new LobbyEscrow(opClient, ledger)
  const indexer = new EscrowIndexer(readClient, ledger, 0n)
  const evidenceStore = new Map<Hex, MatchEvidence>()
  const evidence: EvidenceSource = { get: async (id) => evidenceStore.get(id) ?? null }
  const worker = new SettlementWorker(opClient, ledger, evidence, directCosigners)

  const opened = await lobby.open({
    lobbyId: 'lobby-happy',
    region: 'us-west',
    capacity: 4,
    stakeWei: STAKE,
    admissionSeconds: 600,
    rulesVersion: 'rules-v1',
    stagePoolVersion: 'stages-50-v1',
  })
  await pub.waitForTransactionReceipt({ hash: opened.hash })
  const { matchId } = opened

  const players = [] as Address[]
  for (let i = 0; i < 4; i++) players.push(await join(i, matchId))

  // Ready check: one player missing → no lock
  const partial = await lobby.lockIfReady(matchId, players.slice(0, 3))
  assert.equal(partial.locked, false)

  const locked = await lobby.lockIfReady(matchId, players)
  assert.ok(locked.locked)
  await pub.waitForTransactionReceipt({ hash: locked.hash })

  const m = await readClient.getMatch(matchId)
  assert.equal(m.status, MatchStatus.LOCKED)
  assert.equal(m.rosterHash, rosterHash(players), 'TS roster hash must equal contract roster hash')

  // Worker idles while the match is being played
  assert.deepEqual(await worker.tick(matchId), { kind: 'idle', reason: 'match in progress' })

  // Match director publishes evidence: round winners a, b, c (all different) → final among them, c wins
  const roster = sortAddresses(players)
  const [a, b, c, d] = roster
  const winners = [a, b, c, c]
  void d
  evidenceStore.set(matchId, evidenceFor(matchId, roster, winners, opened.configHash))

  const champBefore = await pub.getBalance({ address: c })
  const treasuryBefore = await pub.getBalance({ address: treasury })

  const s1 = await worker.tick(matchId)
  assert.equal(s1.kind, 'sent')
  assert.equal(s1.kind === 'sent' && s1.action, 'submit_result')
  await pub.waitForTransactionReceipt({ hash: (s1 as { hash: Hex }).hash })
  assert.equal((await readClient.getMatch(matchId)).winner, c)

  const s2 = await worker.tick(matchId)
  assert.equal(s2.kind, 'idle')
  assert.match((s2 as { reason: string }).reason, /dispute window/)

  await testClient.increaseTime({ seconds: DISPUTE })
  await testClient.mine({ blocks: 1 })

  const s3 = await worker.tick(matchId)
  assert.equal(s3.kind === 'sent' && s3.action, 'finalize')
  const finHash = (s3 as { hash: Hex }).hash
  await pub.waitForTransactionReceipt({ hash: finHash })

  const { champion, house } = splitPot(STAKE, 4)
  assert.equal((await pub.getBalance({ address: c })) - champBefore, champion)
  assert.equal((await pub.getBalance({ address: treasury })) - treasuryBefore, house)
  assert.equal(champion, parseEther('0.036'))
  assert.equal(house, parseEther('0.004'))
  assert.equal(await pub.getBalance({ address: escrowAddr }), 0n)

  // Finality tracking reports more than "broadcast"
  const fin = await checkTx(pub, finHash)
  assert.ok(['included', 'safe', 'finalized'].includes(fin.progress), fin.progress)

  // Ledger reconciles to zero and audit chain verifies
  await indexer.tick()
  const done = await worker.tick(matchId)
  assert.deepEqual(done, { kind: 'done', status: 'SETTLED', reconciled: true })
  const entries = await ledger.entriesForMatch(matchId)
  assert.equal(entries.filter((e) => e.kind === 'deposit').length, 4)
  assert.equal(escrowBalance(entries), 0n)
  assert.ok(verifyAuditChain(await ledger.auditLog()))

  // Tampering with the audit log is detected
  const log = await ledger.auditLog()
  log[1] = { ...log[1], payload: { tampered: true } }
  assert.equal(verifyAuditChain(log), false)
})

test('co-signers refuse invalid evidence; worker will not submit', async () => {
  const ledger = new MemoryLedger()
  const lobby = new LobbyEscrow(opClient, ledger)
  const opened = await lobby.open({
    lobbyId: 'lobby-bad-evidence',
    region: 'us-west',
    capacity: 2,
    stakeWei: STAKE,
    admissionSeconds: 600,
    rulesVersion: 'rules-v1',
    stagePoolVersion: 'stages-50-v1',
  })
  await pub.waitForTransactionReceipt({ hash: opened.hash })
  const ps = [await join(4, opened.matchId), await join(5, opened.matchId)]
  const l = await lobby.lockIfReady(opened.matchId, ps)
  assert.ok(l.locked)
  await pub.waitForTransactionReceipt({ hash: l.hash })
  const [x, y] = sortAddresses(ps)

  // Match "continued" after x reached 2 wins
  const bad = evidenceFor(opened.matchId, [x, y], [x, x, y], opened.configHash)
  await assert.rejects(cosign(readClient, cosignerAccts[0], { evidence: bad }), CosignRefusal)

  // Seed reveal doesn't match commitment
  const good = evidenceFor(opened.matchId, [x, y], [y, x, y], opened.configHash)
  const forged = { ...good, rounds: good.rounds.map((r, i) => (i === 0 ? { ...r, seedReveal: keccak256('0x01') } : r)) }
  await assert.rejects(cosign(readClient, cosignerAccts[0], { evidence: forged }), /seed reveal/)

  // Wrong roster
  const outsider = player(19).address
  await assert.rejects(
    cosign(readClient, cosignerAccts[0], { evidence: evidenceFor(opened.matchId, [x, outsider], [x, x], opened.configHash) }),
    /roster/,
  )

  // Only one honest co-signer available (threshold 2) → worker idles
  const worker = new SettlementWorker(opClient, ledger, { get: async () => good }, [directCosigners[0], async () => { throw new Error('down') }])
  const step = await worker.tick(opened.matchId)
  assert.deepEqual(step, { kind: 'idle', reason: 'insufficient co-signatures' })

  // A direct submission with a single signature is rejected by the contract itself
  const one = await cosign(readClient, cosignerAccts[0], { evidence: good })
  await assert.rejects(opClient.submitResult(opened.matchId, one.winner, one.resultHash, [one.signature]))
})

test('lobby that never starts: cancel → relayer pushes full refunds', async () => {
  const ledger = new MemoryLedger()
  const lobby = new LobbyEscrow(opClient, ledger)
  const indexer = new EscrowIndexer(readClient, ledger, 0n)
  const worker = new SettlementWorker(opClient, ledger, { get: async () => null }, directCosigners)
  const opened = await lobby.open({
    lobbyId: 'lobby-cancel',
    region: 'eu-west',
    capacity: 6,
    stakeWei: STAKE,
    admissionSeconds: 600,
    rulesVersion: 'rules-v1',
    stagePoolVersion: 'stages-50-v1',
  })
  await pub.waitForTransactionReceipt({ hash: opened.hash })
  const ps = [await join(6, opened.matchId), await join(7, opened.matchId)]
  const balsAfterJoin = await Promise.all(ps.map((p) => pub.getBalance({ address: p })))

  const h = await lobby.cancel(opened.matchId, 'lobby expired before filling')
  assert.ok(h)
  await pub.waitForTransactionReceipt({ hash: h })

  for (let i = 0; i < 5; i++) {
    const s = await worker.tick(opened.matchId)
    if (s.kind === 'sent') await pub.waitForTransactionReceipt({ hash: s.hash })
    if (s.kind === 'done') break
  }
  await indexer.tick()
  const done = await worker.tick(opened.matchId)
  assert.deepEqual(done, { kind: 'done', status: 'REFUNDED', reconciled: true })
  const balsAfterRefund = await Promise.all(ps.map((p) => pub.getBalance({ address: p })))
  balsAfterRefund.forEach((b, i) => assert.equal(b - balsAfterJoin[i], STAKE, 'full stake back, relayer paid gas'))
})

test('locked match with no result: worker aborts after deadline and refunds', async () => {
  const ledger = new MemoryLedger()
  const lobby = new LobbyEscrow(opClient, ledger)
  const worker = new SettlementWorker(opClient, ledger, { get: async () => null }, directCosigners)
  const opened = await lobby.open({
    lobbyId: 'lobby-stalled',
    region: 'us-east',
    capacity: 2,
    stakeWei: STAKE,
    admissionSeconds: 600,
    rulesVersion: 'rules-v1',
    stagePoolVersion: 'stages-50-v1',
  })
  await pub.waitForTransactionReceipt({ hash: opened.hash })
  const ps = [await join(8, opened.matchId), await join(9, opened.matchId)]
  const l = await lobby.lockIfReady(opened.matchId, ps)
  assert.ok(l.locked)
  await pub.waitForTransactionReceipt({ hash: l.hash })

  await testClient.increaseTime({ seconds: 3 * 3600 + 1 })
  await testClient.mine({ blocks: 1 })
  const actions: string[] = []
  for (let i = 0; i < 6; i++) {
    const s = await worker.tick(opened.matchId)
    if (s.kind === 'sent') {
      actions.push(s.action)
      await pub.waitForTransactionReceipt({ hash: s.hash })
    }
    if (s.kind === 'done') break
  }
  assert.deepEqual(actions, ['abort', 'refund', 'refund'])
  assert.equal((await readClient.getMatch(opened.matchId)).status, MatchStatus.REFUNDED)
})

test('private lobby: allowlisted wallets join with TS-built proofs; outsiders are rejected', async () => {
  const ledger = new MemoryLedger()
  const lobby = new LobbyEscrow(opClient, ledger)
  const members = [player(10).address, player(11).address, player(12).address]
  const opened = await lobby.open({
    lobbyId: 'lobby-private',
    region: 'us-west',
    capacity: 5, // custom size allowed for private lobbies
    stakeWei: STAKE,
    admissionSeconds: 600,
    rulesVersion: 'rules-v1',
    stagePoolVersion: 'stages-50-v1',
    allowlist: members,
    private: true,
  })
  await pub.waitForTransactionReceipt({ hash: opened.hash })
  const list = buildAllowlist(members)
  assert.equal(opened.allowlistRoot, list.root)
  for (const i of [10, 11, 12]) await join(i, opened.matchId, list.proofFor(player(i).address))
  await assert.rejects(join(13, opened.matchId, list.proofFor(members[0])))
  assert.equal((await readClient.getMatch(opened.matchId)).playerCount, 3)
})

test('co-signers over HTTP: auth enforced, signatures accepted on-chain', async () => {
  const { cosignerServer, httpCosigner } = await import('../src/http.ts')
  const token = 'test-token'
  const servers = cosignerAccts.slice(0, 2).map((a) => cosignerServer(readClient, a, token))
  const ports = await Promise.all(
    servers.map((s) => new Promise<number>((r) => s.listen(0, () => r((s.address() as { port: number }).port)))),
  )
  try {
    const unauth = await fetch(`http://127.0.0.1:${ports[0]}/sign`, { method: 'POST', body: '{}' })
    assert.equal(unauth.status, 401)

    const ledger = new MemoryLedger()
    const lobby = new LobbyEscrow(opClient, ledger)
    const opened = await lobby.open({
      lobbyId: 'lobby-http', region: 'us-west', capacity: 2, stakeWei: STAKE,
      admissionSeconds: 600, rulesVersion: 'rules-v1', stagePoolVersion: 'stages-50-v1',
    })
    await pub.waitForTransactionReceipt({ hash: opened.hash })
    const ps = [await join(14, opened.matchId), await join(15, opened.matchId)]
    const l = await lobby.lockIfReady(opened.matchId, ps)
    assert.ok(l.locked)
    await pub.waitForTransactionReceipt({ hash: l.hash })
    const [x, y] = sortAddresses(ps)
    const ev = evidenceFor(opened.matchId, [x, y], [x, y, y], opened.configHash)

    const transports = ports.map((p) => httpCosigner(`http://127.0.0.1:${p}`, token))
    const worker = new SettlementWorker(opClient, ledger, { get: async () => ev }, transports)
    const s = await worker.tick(opened.matchId)
    assert.equal(s.kind === 'sent' && s.action, 'submit_result')
    await pub.waitForTransactionReceipt({ hash: (s as { hash: Hex }).hash })
    assert.equal((await readClient.getMatch(opened.matchId)).winner, y)
  } finally {
    servers.forEach((s) => s.close())
  }
})

test('indexer recovers from a reorg', async () => {
  const ledger = new MemoryLedger()
  const lobby = new LobbyEscrow(opClient, ledger)
  const opened = await lobby.open({
    lobbyId: 'lobby-reorg', region: 'us-west', capacity: 4, stakeWei: STAKE,
    admissionSeconds: 600, rulesVersion: 'rules-v1', stagePoolVersion: 'stages-50-v1',
  })
  await pub.waitForTransactionReceipt({ hash: opened.hash })
  const indexer = new EscrowIndexer(readClient, ledger, 0n)
  await indexer.tick()

  const snap = await testClient.snapshot()
  await join(16, opened.matchId) // will be reorged out
  await indexer.tick()
  assert.equal((await ledger.entriesForMatch(opened.matchId)).length, 1)

  await testClient.revert({ id: snap })
  await testClient.mine({ blocks: 3 }) // different blocks at the same heights
  await join(17, opened.matchId)
  await indexer.tick()

  const entries = await ledger.entriesForMatch(opened.matchId)
  assert.equal(entries.length, 1, 'orphaned deposit removed, canonical deposit indexed')
  assert.equal(entries[0].account, player(17).address)
  assert.ok((await ledger.auditLog()).some((e) => e.event === 'reorg_rewind'))
})
