// Replays dist/det_fixture.json (recorded by the Node "server") inside real Chromium using the browser bundle,
// with the arena drawn on a real canvas every tick, and checks every tick's state hash.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const dist = path.resolve('dist')
const fixture = fs.readFileSync(path.join(dist, 'det_fixture.json'), 'utf8')
const html = fs.readFileSync(path.join(dist, 'hotshots-arena.html'), 'utf8')
const tmp = path.join(dist, '_det.html'); fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"></head><body style="height:720px;margin:0">${html}</body></html>`)
const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: 1100, height: 720 } })
const errs = []; p.on('pageerror', (e) => errs.push(e.message))
await p.goto('file://' + tmp); await p.waitForTimeout(500)
const res = await p.evaluate((fx) => {
  const out = []
  for (const f of JSON.parse(fx)) {
    const sim = createSim({ seed: 7, fx: FX_ENV })
    let q = f.initDraws.slice()
    const feed = () => { if (!q.length) throw new Error('rng underflow'); return q.shift() }
    const B = sim.createRound({ ...f.cfg, players: f.cfg.players.map((p) => ({ ...p, human: p.i === f.me })) }, { feed })
    let bad = -1
    for (let k = 0; k < f.inputs.length; k++) {
      q = f.draws[k].slice()
      const inp = {}; f.cfg.players.forEach((p, j) => { inp[p.i] = f.inputs[k][j] })
      B.step(inp); applyWorld(); B.arena.draw(B.t); SPRITES.length = 0
      if (B.hash() !== f.hashes[k] || q.length) { bad = k; break }
    }
    out.push({ key: f.cfg.key, n: f.cfg.players.length, bad, win: B.winner ? B.winner.i : -1, want: f.winner })
  }
  return out
}, fixture)
const fails = res.filter((r) => r.bad >= 0 || r.win !== r.want)
fails.forEach((r) => console.log('DIVERGED', JSON.stringify(r)))
console.log(`${fails.length || errs.length ? 'FAIL' : 'PASS'} browser determinism: ${res.length - fails.length}/${res.length} rounds identical to the Node server on every tick` + (errs.length ? ' · page errors: ' + errs.slice(0, 3).join(' | ') : ''))
await browser.close()
