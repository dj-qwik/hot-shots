// Screenshots of every menu screen: node tools/screens.mjs outdir   (uses GAME_HTML or dist/hotshots-arena.html)
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const outDir = process.argv[2] || '.'
const W = +(process.env.VW || 1100), H = +(process.env.VH || 720)
const html = fs.readFileSync(process.env.GAME_HTML || new URL('../dist/hotshots-arena.html', import.meta.url), 'utf8')
const tmp = path.resolve(process.env.GAME_HTML || 'dist/x.html').replace(/[^/]+$/, '_screens.html')
fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0}[hidden]{display:none!important}</style></head><body style="height:${H}px">${html}</body></html>`)
const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: W, height: H } })
const errs = []; p.on('pageerror', (e) => errs.push(e.message))
const shot = async (n) => { await p.screenshot({ path: path.join(outDir, `scr_${n}.png`) }) }
await p.goto('file://' + tmp); await p.waitForTimeout(1200)
await p.click('#goCash'); await p.waitForTimeout(600); await shot('lobby')
await p.click('#deposit'); await p.waitForTimeout(1500); await shot('lobbyfill')
await p.waitForTimeout(3500); await shot('intro')
await p.evaluate(() => { startCountdown(); })
await p.waitForTimeout(6500); await shot('play')
await p.evaluate(() => { const w = game.active[1]; endRound(w); })
await p.waitForTimeout(800); await shot('slowmo')
await p.waitForTimeout(1600); await shot('round')
await p.evaluate(() => { game.wins[0] = 1; endRound(game.beans[0]); })
await p.waitForTimeout(3200); await shot('champ')
console.log(errs.length ? 'ERRORS: ' + errs.join(' | ') : 'no page errors')
await browser.close()
