// Real-flow test: click Practice with a forced arena, sit through intro, play; report errors + state.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const [key = 'bumper', out = 'flow.png', size = '4'] = process.argv.slice(2)
const html = fs.readFileSync(process.env.GAME_HTML || 'dist/hotshots-arena.html', 'utf8')
const tmp = path.resolve('dist/_flow.html')
fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body style="height:720px;margin:0">${html}</body></html>`)
const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: 1100, height: 720 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' ')))
p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errs.push(m.text()) })
await p.goto('file://' + tmp); await p.waitForTimeout(800)
await p.evaluate(([k, n]) => { window.pickArena = () => ARENAS[k]; try { pickArena = () => ARENAS[k] } catch (e) {} }, [key, +size])
await p.click('#goPractice')
const states = []
for (let i = 0; i < +(process.env.SECS || 14); i++) { await p.waitForTimeout(1000); states.push(await p.evaluate(() => `${game.phase}/${arena && arena.key}/beans=${(game.beans||[]).length}/active=${(game.active||[]).length}/t=${(game.t||0).toFixed(1)}`)) }
await p.screenshot({ path: out })
console.log(states.slice(-1).join('\n'))
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 6).join('\n') : 'no page errors')
await browser.close()
