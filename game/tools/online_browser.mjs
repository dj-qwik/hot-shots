// Two real browsers play a full online match against each other through the real server.
// Screenshots each phase, then checks: no page errors, no desyncs, both browsers agree on every round result.
//   node tools/online_browser.mjs [size=2] [outdir=../shots-online]
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const SIZE = +(process.argv[2] || 2), OUT = path.resolve(process.argv[3] || '../shots-online')
fs.mkdirSync(OUT, { recursive: true })
const PORT = 21000 + ((Math.random() * 9000) | 0)
const srv = spawn('node', ['server/index.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] })
let srvLog = ''; srv.stdout.on('data', (d) => { srvLog += d }); srv.stderr.on('data', (d) => { srvLog += d })
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/healthz`)).ok) break } catch {} await new Promise((r) => setTimeout(r, 500)) }
const browser = await chromium.launch()
const base = `http://127.0.0.1:${PORT}/`
const pages = []
for (let i = 0; i < SIZE; i++) {
  const p = await browser.newPage({ viewport: { width: 1100, height: 720 } })
  p.errs = []; p.warns = []
  p.on('pageerror', (e) => p.errs.push(e.message))
  p.on('console', (m) => { const t = m.text(); if (t.includes('ERR_TUNNEL') || t.includes('fonts.g')) return; if (m.type() === 'error') p.errs.push(t); if (t.includes('desync')) p.warns.push(t) })
  await p.goto(base); await p.waitForTimeout(600)
  await p.click('#goOnline'); await p.waitForTimeout(200)
  await p.click(`[data-netsize="${SIZE}"]`); await p.waitForTimeout(100)
  await p.fill('#netName', ['Dave', 'Rival', 'Ace', 'Neo'][i])
  if (i === 0) await p.screenshot({ path: path.join(OUT, '1_setup.png') })
  await p.click('#netFind')
  pages.push(p)
  if (i === 0) { await p.waitForTimeout(700); await p.screenshot({ path: path.join(OUT, '2_lobby.png') }) }
}
// play: each browser holds random directions, taps jump and dive
const keysets = ['KeyW', 'KeyA', 'KeyS', 'KeyD']
let shots = 0, t0 = Date.now(), done = false
const results = pages.map(() => [])
while (!done && Date.now() - t0 < 300e3) {
  for (const [i, p] of pages.entries()) {
    const k = keysets[(Math.random() * 4) | 0]
    p.keyboard.down(k).catch(() => {}); setTimeout(() => p.keyboard.up(k).catch(() => {}), 150 + Math.random() * 400)
    if (Math.random() < 0.15) p.keyboard.press('Space').catch(() => {})
    if (Math.random() < 0.05) p.keyboard.press('ShiftLeft').catch(() => {})
  }
  await new Promise((r) => setTimeout(r, 250))
  const st = await pages[0].evaluate(() => ({ phase: game.phase, round: game.round, key: arena && arena.key, t: game.t, ov: !document.getElementById('ov').hidden, champ: !!document.getElementById('again'), card: document.querySelector('#ov .card')?.className || '' }))
  if (st.phase === 'intro' && st.round === 1 && shots === 0) { shots++; await pages[0].screenshot({ path: path.join(OUT, '3_intro.png') }) }
  if (st.phase === 'play' && st.t > 6 && shots === 1) { shots++; await pages[0].screenshot({ path: path.join(OUT, '4_play.png') }); await pages[1].screenshot({ path: path.join(OUT, '4_play_other.png') }) }
  if (st.card.includes('result') && !st.champ && shots === 2) { shots++; await pages[0].screenshot({ path: path.join(OUT, '5_round.png') }) }
  if (st.champ) { await pages[0].waitForTimeout(800); await pages[0].screenshot({ path: path.join(OUT, '6_champion.png') }); done = true }
}
for (const [i, p] of pages.entries()) results[i] = await p.evaluate(() => ({ wins: game.wins.slice(), rw: game.roundWinners.slice(), me: game.me, round: game.round, rtt: Math.round(NET.state.rtt), starve: NET.state.F?.starve ?? -1, target: NET.state.F?.target ?? -1 }))
const agree = results.every((r) => JSON.stringify(r.rw) === JSON.stringify(results[0].rw)) && results[0].wins.filter((w) => w >= 2).length === 1 && Math.max(...results[0].wins) === 2
const errs = pages.flatMap((p) => p.errs), warns = pages.flatMap((p) => p.warns)
console.log(JSON.stringify(results))
console.log(`${done && agree && !errs.length && !warns.length ? 'PASS' : 'FAIL'} online browsers: champion reached=${done} · rounds=${results[0].round} · browsers agree=${agree} · page errors=${errs.length} · desyncs=${warns.length}`)
if (errs.length) console.log(errs.slice(0, 5).join('\n'))
if (warns.length) console.log(warns.slice(0, 5).join('\n'))
console.log(srvLog.split('\n').filter((l) => /match|error/i.test(l)).slice(0, 6).join('\n'))
await browser.close(); srv.kill()
process.exit(0)
