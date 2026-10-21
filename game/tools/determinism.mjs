// Determinism proof: a "server" run (sim.cjs, bots, no effects) records the packed input of every bean on
// every tick plus a state hash. A "browser" run (the full client bundle game.js with real effects firing,
// one bean flagged as the local player, and arena.draw() called every tick) replays those inputs and must
// produce the identical hash on every tick. Also emits a JSON fixture for the in-browser check.
//   node tools/determinism.mjs [rounds-per-arena=3] [--fixture out.json]
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(here, '..', 'dist')
const require = createRequire(import.meta.url)
const { createSim } = require(path.join(dist, 'sim.cjs'))
const args = process.argv.slice(2)
const PER = +(args.find((a) => /^\d+$/.test(a)) || 3)
const fixtureOut = args.includes('--fixture') ? args[args.indexOf('--fixture') + 1] : null

// ── load the browser bundle with a stub DOM/canvas (draw calls become no-ops but still run all their code)
function loadClient() {
  const js = fs.readFileSync(path.join(dist, 'game.js'), 'utf8')
  const noop = () => {}
  const grad = () => ({ addColorStop: noop })
  const ctx2d = new Proxy({}, {
    get: (t, k) => {
      if (k in t) return t[k]
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient') return grad
      if (k === 'createPattern') return () => ({ setTransform: noop })
      if (k === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
      if (k === 'measureText') return () => ({ width: 10 })
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) })
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h })
      return noop
    },
    set: (t, k, v) => { t[k] = v; return true },
  })
  const el = () => new Proxy({ style: {}, dataset: {}, classList: { toggle: noop, add: noop, remove: noop }, addEventListener: noop, setAttribute: noop, removeAttribute: noop, closest: () => null, focus: noop, setPointerCapture: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }), getContext: () => ctx2d, clientWidth: 960, clientHeight: 600, width: 960, height: 600, appendChild: noop, querySelector: () => el(), toDataURL: () => '' }, {
    get: (t, k) => (k in t ? t[k] : k === 'innerHTML' || k === 'textContent' ? '' : undefined),
    set: (t, k, v) => { t[k] = v; return true },
  })
  const cache = {}, g = {}
  Object.assign(g, {
    document: { body: el(), documentElement: el(), querySelector: (s) => (cache[s] ||= el()), getElementById: (s) => (cache['#' + s] ||= el()), createElement: () => el(), addEventListener: noop, fonts: { ready: Promise.resolve() } },
    addEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }), requestAnimationFrame: noop,
    localStorage: { getItem: () => null, setItem: noop }, OffscreenCanvas: class { constructor(w, h) { this.width = w; this.height = h } getContext() { return ctx2d } },
    Image: class { set src(v) {} }, devicePixelRatio: 1, innerWidth: 1100, innerHeight: 720, navigator: { getGamepads: () => [], maxTouchPoints: 0 },
  })
  g.window = g
  const names = Object.keys(g)
  return new Function(...names, js + ';return { createSim, FX_ENV, stepFx, drawFx, applyWorld, SPRITES }')(...names.map((n) => g[n]))
}
const C = loadClient()

const KEYS = Object.keys(createSim({ seed: 1 }).ARENAS)
const fixture = []
let ok = 0, bad = 0, totalDraws = 0
for (const key of KEYS) {
  for (let r = 0; r < PER; r++) {
    const n = [2, 4, 8][r % 3]
    const seed = (Math.random() * 4294967296) >>> 0
    const players = Array.from({ length: n }, (_, i) => ({ i, name: 'P' + i }))
    const cfg = { key, seed, players, active: players.map((p) => p.i) }
    // server: bots fill every input
    const rec = [], S = createSim({ seed }).createRound(cfg, { record: rec })
    const initDraws = rec.splice(0), inputs = [], hashes = [], draws = []
    while (!S.winner && S.t < 45) { const inp = {}; S.step(inp); inputs.push(players.map((p) => inp[p.i] ?? 0)); hashes.push(S.hash()); draws.push(rec.splice(0)) }
    // browser: replay the exact inputs, local player = random seat, effects + draw every tick
    const me = (Math.random() * n) | 0
    // the browser never sees the seed: random draws are fed in as the server streams them
    const sim = C.createSim({ seed: 999, fx: C.FX_ENV })
    let q = initDraws.slice()
    const feed = () => { if (!q.length) throw new Error('rng underflow'); return q.shift() }
    const B = sim.createRound({ ...cfg, seed: 0, players: players.map((p) => ({ ...p, human: p.i === me })) }, { feed })
    let diverged = -1
    for (let k = 0; k < inputs.length; k++) {
      q = draws[k].slice()
      const inp = {}; players.forEach((p, j) => { inp[p.i] = inputs[k][j] })
      B.step(inp)
      C.stepFx(1 / 60); C.applyWorld(); B.arena.draw(B.t); C.SPRITES.length = 0
      if (B.hash() !== hashes[k] || q.length) { diverged = k; break }
    }
    totalDraws += initDraws.length + draws.reduce((a, d) => a + d.length, 0)
    const sameWinner = (B.winner?.i ?? -1) === (S.winner?.i ?? -1)
    if (diverged < 0 && sameWinner) ok++
    else { bad++; console.log(`DIVERGED ${key} n=${n} seed=${seed} at tick ${diverged} (of ${inputs.length}) winner server=${S.winner?.i} browser=${B.winner?.i}`) }
    if (fixtureOut && r === 0) fixture.push({ cfg: { ...cfg, seed: 0 }, me, initDraws, draws, inputs, hashes, winner: S.winner?.i ?? -1 })
  }
}
console.log(`${bad ? 'FAIL' : 'PASS'} determinism: ${ok}/${ok + bad} rounds identical on every tick (${KEYS.length} arenas, 2/4/8 players; seedless clients fed ${totalDraws} random draws)`)
if (fixtureOut) { fs.writeFileSync(fixtureOut, JSON.stringify(fixture)); console.log('fixture →', fixtureOut, (fs.statSync(fixtureOut).size / 1024 | 0) + ' KB') }
process.exit(bad ? 1 : 0)
