#!/usr/bin/env node
// Build the game (no dependencies; Node ≥ 22).
//   dist/sim.cjs              deterministic simulation only (server, co-signers, tests): createSim(env), createFollower()
//   dist/game.js              browser bundle: simulation + renderer + menus
//   dist/hotshots-arena.html  single-file page fragment (offline test mode / artifact)
//   dist-web/index.html       full page served by the game server, with online play switched on
// Simulation code (src/sim/*, src/arenas/*) is wrapped in createSim(): inside it Math.random becomes a seeded RNG
// and Math.sin/cos/atan2/atan/exp/hypot become DET_MATH, so every JS engine computes identical physics.
// Effects/sounds the simulation triggers are injected through env.fx (no-ops on the server).
//   options: --out <dir> (default dist)   --only key1,key2 (bundle only these arenas)
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const S = path.join(ROOT, 'src')
// Retired (files kept for reference, stage ids kept in packages/shared/src/replay.ts): bubblegum, jelly
let ARENAS = ['runway', 'hex', 'crown', 'laser', 'crossing', 'turnpike', 'rodeo', 'skyrail', 'floes', 'storm',
  'marbles', 'bumper', 'iceberg', 'crater', 'disco', 'meteor', 'lantern', 'paint', 'bounce', 'fuse']
// Client functions the simulation may call (effects, sounds, announcer). Checked by tools/freevars.mjs.
const FX_NAMES = ['puff', 'sparks', 'ring', 'confetti', 'part', 'popText', 'shake', 'hype', 'announce', 'feed',
  'fxStep', 'fxLand', 'fxDive', 'fxTackle', 'fxOut', 'fxScore', 'fxWin', 'beep', 'tone', 'crowdRoar']
const FX_OBJECTS = ['SFX']
const args = process.argv.slice(2)
const outDir = path.join(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist')
if (args.includes('--only')) { const keep = args[args.indexOf('--only') + 1].split(','); ARENAS = ARENAS.filter((k) => keep.includes(k)) }

const rd = (...p) => fs.readFileSync(path.join(S, ...p), 'utf8')
const detTransform = (js) => js.replaceAll('Math.random()', 'RNG()').replace(/\bMath\.(sin|cos|atan2|atan|exp|hypot)\(/g, 'DM.$1(')

const det = rd('sim', '00_det.js'), base = rd('sim', '01_base.js'), follow = rd('sim', '99_follow.js')
const body = [
  ...['01_base.js', '20_beans.js', '30_kit.js', '40_power.js'].map((f) => `// ═════ sim/${f} ═════\n` + detTransform(rd('sim', f))),
  ...ARENAS.map((k) => `// ═════ arenas/${k}.js ═════\n` + detTransform(rd('arenas', k + '.js'))),
  '// ═════ sim/90_round.js ═════\n' + detTransform(rd('sim', '90_round.js')),
]
const createSimSrc = `// ═════════════════ createSim(env) — one isolated, deterministic simulation instance ═════════════════
// env = { seed, fx: { puff, sparks, …, SFX } }. Create a fresh instance per round so no state leaks between rounds.
function createSim(env = {}) {
  const FX = env.fx || {}, NOOP = () => {};
${FX_NAMES.map((n) => `  const ${n} = FX.${n} || NOOP;`).join('\n')}
${FX_OBJECTS.map((n) => `  const ${n} = FX.${n} || new Proxy({}, { get: () => NOOP });`).join('\n')}
  const DM = DET_MATH;
  const VRAND = env.vrand || Math.random; // visual-only randomness (particles, flicker): never affects play
  let RNG = makeRng(env.seed == null ? 1 : env.seed);
  let arena = null;
${body.join('\n')}
  return { ARENAS, makeBean, stepBean, collide, kill, R, DIVE, DT, createRound, packInput, unpackInput, IDLE_INPUT, POWERS,
    setArena(a) { arena = a; }, reseed(s) { RNG = makeRng(s); }, random: () => RNG() };
}
`
fs.mkdirSync(outDir, { recursive: true })
const sim = `'use strict';\n${det}\n${createSimSrc}\n${follow}\nif (typeof module === 'object' && module.exports) module.exports = { createSim, createFollower, DET_MATH, makeRng, hashNums, shuffleWith };\n`
fs.writeFileSync(path.join(outDir, 'sim.cjs'), sim)

// ── browser bundle
const envFx = FX_NAMES.map((n) => `${n}: (...a) => ${n}(...a)`).join(', ')
const envObj = FX_OBJECTS.map((n) => `${n}: new Proxy({}, { get: (_, k) => (...a) => ${n}[k](...a) })`).join(', ')
const client = fs.readdirSync(S).filter((f) => f.endsWith('.js') && /^\d\d/.test(f)).sort()
const js = ["'use strict';", det,
  '// browser global scope: real randomness + native maths (visuals); the simulation scope rebinds both',
  'const DM = Math;\nconst RNG = Math.random;',
  "const ONLINE = !!(typeof window !== 'undefined' && window.HS_ONLINE); // set by the server-hosted page",
  '// ═════ sim/01_base.js (global copy) ═════\n' + base, createSimSrc, follow,
  `const FX_ENV = { ${envFx}, ${envObj} };`,
  'const SIM0 = createSim({ fx: FX_ENV, seed: 1 }); // menus, attract mode, portraits',
  'const { ARENAS, makeBean, stepBean, collide, R, DIVE, POWERS } = SIM0;',
  ...client.map((f) => `// ═════ ${f} ═════\n` + rd(f)),
].join('\n')
fs.writeFileSync(path.join(outDir, 'game.js'), js)
const head = rd('head.html')
fs.writeFileSync(path.join(outDir, 'hotshots-arena.html'), `${head}\n<script>\n${js}</script>\n`)
// full page for the game server
const webDir = path.join(ROOT, 'dist-web')
fs.mkdirSync(webDir, { recursive: true })
fs.writeFileSync(path.join(webDir, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0d2a">
<meta name="description" content="Hot Shots: thirty-second mini games, best 2 out of 3. Play online.">
<title>Hot Shots</title>
</head>
<body>
${head}
<script>window.HS_ONLINE = true;</script>
<script type="module" src="/wallet/wallet.js"></script>
<script>
${js}</script>
</body>
</html>
`)
for (const f of ['sim.cjs', 'game.js']) execFileSync(process.execPath, ['--check', path.join(outDir, f)], { stdio: 'inherit' })
console.log(`built ${path.relative(ROOT, outDir)}: sim.cjs ${(sim.length / 1024) | 0} KB, game.js ${(js.length / 1024) | 0} KB, arenas: ${ARENAS.length}; + dist-web/index.html; syntax ok`)
