// Round pacing: median / p90 / max length and timeout share, all-bot 4 and 8 player rounds.
import { loadGame, runRound } from './harness.mjs'
const G = loadGame()
const keys = process.argv.slice(2), N = +(process.env.N || 40)
for (const key of keys) {
  const out = []
  for (const n of [4, 8]) {
    const ts = []; let to = 0
    for (let k = 0; k < N; k++) { const r = runRound(G, key, n, {}, { allBots: true }); ts.push(r.t); if (r.t >= G.ARENAS[key].timeout - 0.05) to++ }
    ts.sort((a, b) => a - b)
    out.push(`${n}p med ${ts[N >> 1].toFixed(1)} p90 ${ts[(N * 0.9) | 0].toFixed(1)} max ${ts[N - 1].toFixed(1)} cap ${Math.round(to / N * 100)}%`)
  }
  console.log(key.padEnd(8), out.join('  |  '))
}
