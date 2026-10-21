import { test } from 'node:test'
import assert from 'node:assert/strict'
import { type Address, type Hex, concat, keccak256 } from 'viem'
import {
  matchLengthMinutes,
  splitPot,
  formatEthExact,
  parseEthExact,
  formatFiatApprox,
  maxRounds,
  championFromRounds,
  finalistsFor,
  WINS_TO_CHAMPION,
  RoundLedgerError,
  buildAllowlist,
  allowlistLeaf,
  rosterHash,
  sortAddresses,
  computeResultHash,
  verifyEvidence,
  EvidenceError,
  type MatchEvidence,
} from '../src/index.ts'

const addr = (i: number) => `0x${(i + 1).toString(16).padStart(40, '0')}` as Address

test('spec §2 example: 8 x 0.01 ETH', () => {
  const s = splitPot(parseEthExact('0.01'), 8)
  assert.equal(formatEthExact(s.pot), '0.08')
  assert.equal(formatEthExact(s.champion), '0.072')
  assert.equal(formatEthExact(s.house), '0.008')
})

test('dust goes to champion, house never exceeds 10%', () => {
  const s = splitPot(7n, 3)
  assert.deepEqual(s, { pot: 21n, champion: 19n, house: 2n })
  for (let n = 2; n <= 16; n++) {
    for (const e of [1n, 3n, 999n, 10n ** 15n + 7n]) {
      const { pot, champion, house } = splitPot(e, n)
      assert.equal(champion + house, pot)
      assert.ok(house * 10n <= pot)
      assert.ok(champion * 10n >= pot * 9n)
    }
  }
})

test('splitPot rejects invalid input', () => {
  assert.throws(() => splitPot(0n, 4))
  assert.throws(() => splitPot(1n, 1))
  assert.throws(() => splitPot(1n, 17))
})

test('exact ETH formatting round-trips', () => {
  for (const s of ['0', '1', '0.000000000000000001', '0.072', '123.456']) {
    assert.equal(formatEthExact(parseEthExact(s)), s)
  }
  assert.throws(() => parseEthExact('0.0000000000000000001'))
  assert.throws(() => parseEthExact('-1'))
  assert.throws(() => parseEthExact('1e18'))
})

test('fiat label is approximate and optional', () => {
  assert.equal(formatFiatApprox(parseEthExact('0.072'), null), null)
  assert.equal(formatFiatApprox(parseEthExact('0.072'), 2500), '≈ $180.00 USD')
})

test('best 2 of 3: exhaustive enumeration of every legal match for N=2..5', () => {
  for (let n = 2; n <= 5; n++) {
    const roster = Array.from({ length: n }, (_, i) => addr(i))
    let longest = 0, count = 0
    const walk = (winners: Address[]) => {
      const finalists = finalistsFor(winners)
      const eligible = finalists ?? roster
      for (const w of eligible) {
        const next = [...winners, w]
        const wins = next.filter((x) => x === w).length
        if (wins === WINS_TO_CHAMPION) {
          count++
          longest = Math.max(longest, next.length)
          assert.equal(championFromRounds(next, roster), w)
        } else walk(next)
      }
    }
    walk([])
    assert.equal(longest, maxRounds(n), `N=${n}`)
    assert.ok(count > 0)
  }
  assert.equal(maxRounds(2), 3)
  assert.equal(maxRounds(16), 4)
})

test('ledger validation rejects every rule violation', () => {
  const [a, b, c, d] = [addr(0), addr(1), addr(2), addr(3)]
  const r4 = [a, b, c, d]
  assert.equal(championFromRounds([a, a], r4), a) // quickest
  assert.equal(championFromRounds([a, b, a], r4), a)
  assert.equal(championFromRounds([a, b, c, b], r4), b) // final among round winners
  assert.throws(() => championFromRounds([a], r4), RoundLedgerError) // too short
  assert.throws(() => championFromRounds([a, a, b], r4), RoundLedgerError) // continued past champion
  assert.throws(() => championFromRounds([a, b, c, d], r4), RoundLedgerError) // non-finalist wins the final
  assert.throws(() => championFromRounds([a, b, c], r4), RoundLedgerError) // nobody has 2
  assert.throws(() => championFromRounds([a, b, a, b], r4), RoundLedgerError) // round 4 without 3 distinct winners
  assert.throws(() => championFromRounds([a, b, c, a, b], r4), RoundLedgerError) // > 4 rounds
  assert.throws(() => championFromRounds([a, b, a, b], [a, b]), RoundLedgerError) // 2 players cap at 3
  assert.throws(() => championFromRounds([a, addr(9)], r4), RoundLedgerError) // non-roster winner
  for (let n = 2; n <= 16; n++) {
    const roster = Array.from({ length: n }, (_, i) => addr(i))
    const worst = n >= 3 ? [roster[0], roster[1], roster[2], roster[2]] : [roster[0], roster[1], roster[1]]
    assert.equal(worst.length, maxRounds(n))
    assert.equal(championFromRounds(worst, roster), worst.at(-1))
  }
})

test('allowlist proofs verify with OZ sorted-pair semantics', () => {
  const members = Array.from({ length: 7 }, (_, i) => addr(i))
  const list = buildAllowlist(members)
  const verify = (leaf: Hex, proof: Hex[]) =>
    proof.reduce((h, p) => (BigInt(h) < BigInt(p) ? keccak256(concat([h, p])) : keccak256(concat([p, h]))), leaf) ===
    list.root
  for (const m of members) assert.ok(verify(allowlistLeaf(m), list.proofFor(m)))
  assert.throws(() => list.proofFor(addr(99)))
  assert.ok(!verify(allowlistLeaf(addr(99)), list.proofFor(members[0])))
})

test('evidence verification', () => {
  const roster = sortAddresses([addr(3), addr(1), addr(2)])
  const seed = (i: number) => `0x${i.toString(16).padStart(64, '0')}` as Hex
  const rounds = [roster[2], roster[0], roster[2]].map((winner, i) => ({
    round: i + 1,
    stageId: 10 + i,
    stageRevision: 1,
    seedReveal: seed(i + 100),
    seedCommitment: keccak256(seed(i + 100)),
    winner,
    scoreEvidenceHash: seed(i + 500),
  }))
  const ev: MatchEvidence = {
    chainId: 46630,
    escrow: addr(500),
    matchId: seed(1),
    rosterHash: rosterHash(roster),
    configHash: seed(2),
    rounds,
  }
  assert.equal(verifyEvidence(ev, roster), roster[2])
  const h = computeResultHash(ev)
  assert.match(h, /^0x[0-9a-f]{64}$/)
  assert.notEqual(computeResultHash({ ...ev, rounds: rounds.slice(0, 2) }), h)

  const badSeed = { ...ev, rounds: rounds.map((r, i) => (i === 1 ? { ...r, seedReveal: seed(1) } : r)) }
  assert.throws(() => verifyEvidence(badSeed, roster), EvidenceError)
  assert.throws(() => verifyEvidence(ev, [addr(1), addr(2)]), EvidenceError)
})

test('match length disclosure for 30-second rounds', () => {
  assert.deepEqual(matchLengthMinutes(16), { typical: 3, worstCase: 3 }) // 4 rounds x 45 s
  assert.deepEqual(matchLengthMinutes(2), { typical: 2, worstCase: 3 })
  for (let n = 2; n <= 16; n++) assert.ok(matchLengthMinutes(n).worstCase * 60 < 3 * 3600, 'fits on-chain result deadline')
})
