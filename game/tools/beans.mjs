// Close-up of all 8 beans in different states: node tools/beans.mjs out.png
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const out = process.argv[2] || 'beans.png'
const html = fs.readFileSync(process.env.GAME_HTML || new URL('../dist/hotshots-arena.html', import.meta.url), 'utf8')
const tmp = path.resolve(process.env.GAME_HTML || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'dist', 'x.html')).replace(/[^/]+$/, '_render.html')
fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}[hidden]{display:none!important}</style></head><body style="height:720px">${html}</body></html>`)
const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 2.5 })
await p.goto('file://' + tmp); await p.waitForTimeout(900)
await p.evaluate(() => {
  game.mode = 'practice'; game.size = 8; startMatch(); arena = ARENAS.bumper; game.active = game.beans; arena.init(game.beans); game.phase = 'done'; game.phaseT = 99; showOverlay('');
  const st = [{}, { fx: 1, fy: 0, vx: 200, walk: 1.2 }, { z: 40 }, { proneT: 0.5, fx: 1, fy: 0 }, { stun: 1 }, { happyT: 3 }, { fy: -1, fx: 0 }, { fatigue: 2 }];
  game.beans.forEach((b, i) => { Object.assign(b, { x: 150 + i * 95, y: 330, fx: 0, fy: 1, vx: 0, vy: 0 }, st[i]); });
  arena.update = () => {}; stepBean = () => {};
})
await p.waitForTimeout(500)
const box = await p.evaluate(() => { const r = document.querySelector('#cv').getBoundingClientRect(); return { x: r.left, y: r.top, s: r.width / 960 } })
await p.screenshot({ path: out, clip: { x: box.x + 100 * box.s, y: box.y + 270 * box.s, width: 780 * box.s, height: 110 * box.s } })
await browser.close()
