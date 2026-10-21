// Screenshot helper: node tools/shot.mjs out.png [arenaKey|home] [waitMs] [w h]
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const [out = 'shot.png', which = 'home', wait = '3500', w = '1100', h = '720'] = process.argv.slice(2)
const html = fs.readFileSync(process.env.GAME_HTML || new URL('../dist/hotshots-arena.html', import.meta.url), 'utf8')
const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body style="height:${h}px">${html}</body></html>`
const tmp = path.resolve(process.env.GAME_HTML || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'dist', 'x.html')).replace(/[^/]+$/, '_render.html')
fs.writeFileSync(tmp, page)
const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: +w, height: +h } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()) })
await p.goto('file://' + tmp); await p.waitForTimeout(900)
if (which !== 'home') {
  await p.evaluate((k) => { game.mode = 'practice'; game.size = 6; startMatch(); arena = ARENAS[k]; game.active = game.beans; game.isFinal = false; arena.init(game.beans); game.phase = 'play'; game.t = 0; snapScores(); showOverlay(''); $('#hud').hidden = false; }, which)
}
await p.waitForTimeout(+wait)
await p.screenshot({ path: out })
console.log(errs.length ? 'ERRORS: ' + errs.slice(0, 5).join(' | ') : 'no page errors')
await browser.close()
