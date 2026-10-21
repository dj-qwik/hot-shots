import { loadGame, runRound } from './harness.mjs'
const G = loadGame(); const [key, N = 400] = process.argv.slice(2); const w = [0, 0, 0, 0]
for (let k = 0; k < +N; k++) { const r = runRound(G, key, 4, {}, { allBots: true, botSkill: 0.85, botSpeed: 1 }); w[r.winner.i]++ }
const e = N / 4; console.log(key, w.join('/'), 'chi', w.reduce((a, x) => a + (x - e) ** 2 / e, 0).toFixed(1), '(fail > 11.3)')
