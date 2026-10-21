// Frame-time probe: node tools/perf.mjs <arenaKey> [seconds]   (uses GAME_HTML)
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire('/opt/node22/lib/node_modules/')
const { chromium } = require('playwright')
const [key = 'hex', secs = '4'] = process.argv.slice(2)
const html = fs.readFileSync(process.env.GAME_HTML || 'dist/hotshots-arena.html', 'utf8')
const tmp = path.resolve(process.env.GAME_HTML || 'dist/x.html').replace(/[^/]+$/, '_perf.html')
fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}[hidden]{display:none!important}</style></head><body style="height:720px">${html}</body></html>`)
const browser = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] })
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await p.goto('file://' + tmp); await p.waitForTimeout(800)
const r = await p.evaluate(async ([k, s]) => {
  game.mode = 'practice'; game.size = 8; startMatch(); arena = ARENAS[k]; game.active = game.beans; arena.init(game.beans); game.phase = 'play'; game.t = 0; snapScores(); showOverlay('');
  // time just our draw work per frame (independent of vsync)
  const times = []; const orig = arena.draw.bind(arena);
  const of = window.frame;
  let n = 0; const t0 = performance.now();
  await new Promise((res) => { const tick = () => { const a = performance.now(); orig(game.t); applyWorld(); drawFx(); times.push(performance.now() - a); if (performance.now() - t0 < s * 1000) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
  times.sort((a, b) => a - b);
  return { frames: times.length, median: times[times.length >> 1].toFixed(2), p95: times[Math.floor(times.length * 0.95)].toFixed(2) };
}, [key, +secs])
console.log(key, `arena draw ms: median ${r.median}, p95 ${r.p95} over ${r.frames} frames (software-rendered headless; real GPUs are faster)`)
await browser.close()
