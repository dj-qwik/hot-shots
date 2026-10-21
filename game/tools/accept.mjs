// Acceptance suite. Usage: node tools/accept.mjs [arenaKey ...] [--quick]
// Every arena must pass all checks:
//   LENGTH   no round longer than 30 s (2, 4, 8 players), every round produces a winner, no exceptions
//   FAIR     identical bots: no bean/seat wins significantly more (chi-square p > 0.01)
//   MASH     player who taps dive constantly wins no more than a fair share
//   EXPLOIT  lazy strategies (stand still, hold one direction, beeline to centre, hold forward + spam jump)
//            win no more than a fair share — the game must demand real decisions
//   SKILL    the player seat using the arena's own good strategy wins at least as often as lazy play
import { loadGame, runRound } from './harness.mjs'

const args = process.argv.slice(2)
const quick = args.includes('--quick')
const keys = args.filter((a) => !a.startsWith('--'))
const G = loadGame()
const list = keys.length ? keys : Object.keys(G.ARENAS)
const N = quick ? 16 : 30
const P = 4, FAIR = 1 / P

const dir = (x, y) => () => ({ x, y, jump: false, dive: false })
const LAZY = {
  idle: dir(0, 0),
  'hold up': dir(0, -1),
  'hold down': dir(0, 1),
  'hold left': dir(-1, 0),
  'hold right': dir(1, 0),
  'beeline centre': (b) => { const dx = 480 - b.x, dy = (b.y > 700 ? b.y - 400 : 300) - b.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l, jump: false, dive: false } },
  'up + jump spam': (b, t, A, beans, inp, f) => ({ x: 0, y: -1, jump: f % 20 < 2, dive: false }),
}
// Exploit/skill checks are judged against full-strength opponents (good players), not the deliberately
// softened practice bots: what matters for real-money play is whether lazy play beats people who play well.
const winRate = (ctl, n = N) => { let w = 0; for (let k = 0; k < n; k++) if (runRound(G, KEY, P, { 0: ctl }, { botSkill: 0.85, botSpeed: 1 }).winner?.i === 0) w++; return w / n }
let KEY = ''
let allPass = true
const pct = (x) => `${Math.round(x * 100)}%`.padStart(4)

for (const key of list) {
  KEY = key
  const fails = []
  const t0 = Date.now()
  // LENGTH
  let maxT = 0, errors = 0, noWinner = 0
  for (const n of [2, 4, 8]) for (let k = 0; k < (quick ? 5 : 10); k++) {
    try { const r = runRound(G, key, n, {}, { allBots: true }); maxT = Math.max(maxT, r.t); if (!r.winner) noWinner++ } catch (e) { errors++; if (errors === 1) console.log('   error:', e.stack.split('\n').slice(0, 3).join(' | ')) }
  }
  if (maxT > 30.05 || errors || noWinner) fails.push(`LENGTH max ${maxT.toFixed(1)}s, errors ${errors}, no-winner ${noWinner}`)
  // FAIR
  const wins = [0, 0, 0, 0], FN = quick ? 40 : 80
  for (let k = 0; k < FN; k++) { const r = runRound(G, key, 4, {}, { allBots: true, botSkill: 0.85, botSpeed: 0.98 }); if (r.winner) wins[r.winner.i]++ }
  const e = FN / 4, chi = wins.reduce((a, w) => a + (w - e) ** 2 / e, 0)
  if (chi > 11.34) fails.push(`FAIR wins by bean ${wins.join('/')}`)
  // SKILL baseline, MASH, EXPLOIT
  const skill = winRate(null)
  const mash = winRate((b, t, A, beans, inp, f) => ({ ...inp, dive: f % 2 === 0 }))
  const lazy = Object.fromEntries(Object.entries(LAZY).map(([k, c]) => [k, winRate(c)]))
  const limit = quick ? 0.25 : 0.2 // lazy play and mashing must stay at or below ~a fair share (noise allowance in quick mode)
  if (mash > limit) fails.push(`MASH ${pct(mash)}`)
  for (const [k, v] of Object.entries(lazy)) if (v > limit) fails.push(`EXPLOIT "${k}" wins ${pct(v)}`)
  const bestLazy = Math.max(...Object.values(lazy))
  if (skill + 0.1 < bestLazy) fails.push(`SKILL good play ${pct(skill)} < lazy ${pct(bestLazy)}`)
  const ok = !fails.length; allPass &&= ok
  console.log(`${ok ? 'PASS' : 'FAIL'} ${key.padEnd(10)} max ${maxT.toFixed(0)}s · skill ${pct(skill)} · mash ${pct(mash)} · lazy best ${pct(bestLazy)} (${Object.entries(lazy).sort((a, b) => b[1] - a[1])[0][0]}) · fair ${wins.join('/')}  [${((Date.now() - t0) / 1000).toFixed(0)}s]`)
  for (const f of fails) console.log('     ✗ ' + f)
}
process.exit(allPass ? 0 : 1)
