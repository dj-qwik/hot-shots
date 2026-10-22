// practice-match screenshots of one arena: node tools/practice_shot.mjs <arena> <outPrefix> <ms,ms,...>   (HOLD=KeyW, TOUR=y,y,…, TRACKTOUR=0.2,0.5 for turnpike)
import { createRequire } from 'node:module'
import fs from 'node:fs'; import path from 'node:path'
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')
const [key, out, times = '6000,12000'] = process.argv.slice(2)
const html = fs.readFileSync(new URL('../dist/hotshots-arena.html', import.meta.url), 'utf8')
const tmp = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'dist', '_p.html')
fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;height:720px">${html}</body></html>`)
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1100, height: 720 } })
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()) })
await p.addInitScript((k) => { try { localStorage.setItem('hs-deck', JSON.stringify([k])) } catch {} }, key)
await p.goto('file://' + tmp); await p.waitForTimeout(800)
await p.click('#goPractice'); await p.waitForTimeout(400)
await p.click(`[data-dbg-arena="${key}"]`); await p.waitForTimeout(200)
if (process.env.MENU_SHOT) await p.screenshot({ path: `${out}_menu.png` })
await p.click('#dbgStart')
await p.waitForTimeout(500); await p.keyboard.press('Space')
if (process.env.HOLD) { await p.waitForTimeout(3500); await p.keyboard.down(process.env.HOLD) }
let last = 0
if (process.env.TRACKTOUR) {
  for (const f of process.env.TRACKTOUR.split(',').map(Number)) { await p.evaluate((f) => { const tr = ROUND.arena.debug().track, i = Math.floor(tr.length * f), me = ROUND.beans.find((b) => b.human); me.x = tr[i].x; me.y = tr[i].y; me.ti = i; me.stun = 99 }, f); await p.waitForTimeout(900); await p.screenshot({ path: `${out}_f${f}.png` }) }
}
if (process.env.TOUR) { // teleport "you" up the course and shoot each stretch
  for (const y of process.env.TOUR.split(',').map(Number)) { await p.evaluate((y) => { const me = (typeof ROUND !== 'undefined' && ROUND ? ROUND.beans : game.beans).find((b) => b.human); me.y = y; me.x = 480; me.stun = 99 }, y); await p.waitForTimeout(700); await p.screenshot({ path: `${out}_y${y}.png` }) }
}
for (const ms of times.split(',').map(Number)) { await p.waitForTimeout(ms - last); last = ms; await p.screenshot({ path: `${out}_${ms}.png` }) }
console.log(errs.length ? 'ERRORS: ' + [...new Set(errs)].slice(0, 6).join(' | ') : 'no errors')
await b.close()
