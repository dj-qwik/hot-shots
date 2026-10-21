// Plays a full practice match through the real UI (fast-forwarded), logging every page error with round + arena.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const seq = (process.argv[2] || '').split(',').filter(Boolean)
const html = fs.readFileSync(process.env.GAME_HTML || 'dist/hotshots-arena.html', 'utf8')
const tmp = path.resolve('dist/_match.html')
fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body style="height:720px;margin:0">${html}</body></html>`)
const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: +(process.env.VW || 1100), height: +(process.env.VH || 720) }, deviceScaleFactor: +(process.env.DPR || 1) })
const errs = []
p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()) })
p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message))
await p.goto('file://' + tmp); await p.waitForTimeout(800)
await p.exposeFunction('__log', (s) => errs.push(s))
await p.evaluate((seq) => {
  if (seq.length) { let i = 0; pickArena = () => ARENAS[seq[i++ % seq.length]] }
  const oe = console.error; console.error = (...a) => { window.__log(`[r${game.round} ${arena && arena.key} ${game.phase}] ` + a.map((x) => x && x.stack ? x.stack.split('\n').slice(0, 3).join(' | ') : String(x)).join(' ')); }
}, seq)
await p.click('#goPractice')
let shots = 0
for (let i = 0; i < 150; i++) {
  await p.waitForTimeout(500)
  const st = await p.evaluate(() => { if (game.phase === 'play') game.speed = 3; return `${game.round}|${arena && arena.key}|${game.phase}|${document.querySelector('#nextRound') ? 'next' : ''}|${document.querySelector('#again') ? 'again' : ''}` })
  const [r, k, ph, nx, ag] = st.split('|')
  if (ph === 'play' && +r >= 2 && shots < 2) { await p.waitForTimeout(1500); await p.screenshot({ path: `../match_r${r}.png` }); shots++ }
  if (nx) { await p.click('#nextRound').catch(() => {}) }
  if (ag) { console.log('match finished at round', r); break }
}
console.log(errs.length ? errs.slice(0, 8).join('\n') : 'no errors')
await browser.close()
