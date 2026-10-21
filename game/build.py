#!/usr/bin/env python3
"""Build the game.

  dist/sim.cjs              the deterministic simulation only (server, co-signers, tests): createSim(env)
  dist/game.js              browser bundle: simulation + renderer + menus
  dist/hotshots-arena.html  single-file page (offline test mode / artifact)

Simulation code (src/sim/*, src/arenas/*) is wrapped in createSim(): inside it, Math.random is replaced by a
seeded RNG and Math.sin/cos/atan2/atan/exp/hypot by DET_MATH, so every engine computes identical physics.
Effects/sounds the simulation triggers (puff, sparks, beep, …) are injected via env.fx (no-ops on the server).

options: --out <dir> (default dist)   --only key1,key2 (bundle only these arenas)
"""
import os, re, sys, subprocess, json
ROOT = os.path.dirname(os.path.abspath(__file__))
S = os.path.join(ROOT, 'src')
ARENAS = ['runway', 'hex', 'crown', 'laser', 'bubblegum', 'turnpike', 'rodeo', 'skyrail', 'floes', 'storm',
          'marbles', 'bumper', 'iceberg', 'crater', 'disco', 'meteor', 'jelly', 'lantern', 'paint', 'bounce']
# Client-side functions the simulation may call (effects, sounds, announcer). Checked by tools/freevars.mjs.
FX_NAMES = ['puff', 'sparks', 'ring', 'confetti', 'part', 'popText', 'shake', 'hype', 'announce', 'feed',
            'fxStep', 'fxLand', 'fxDive', 'fxTackle', 'fxOut', 'fxScore', 'fxWin', 'beep', 'tone', 'crowdRoar']
FX_OBJECTS = ['SFX']
out_dir = os.path.join(ROOT, 'dist')
a = sys.argv[1:]
if '--out' in a: out_dir = os.path.join(ROOT, a[a.index('--out') + 1])
if '--only' in a: ARENAS = [k for k in ARENAS if k in a[a.index('--only') + 1].split(',')]

def rd(*p): return open(os.path.join(S, *p)).read()
def det_transform(js):
    js = js.replace('Math.random()', 'RNG()')
    return re.sub(r'\bMath\.(sin|cos|atan2|atan|exp|hypot)\(', r'DM.\1(', js)

det = rd('sim', '00_det.js')
base = rd('sim', '01_base.js')
sim_files = ['01_base.js', '20_beans.js', '30_kit.js']
body = [f'// ═════ sim/{f} ═════\n' + det_transform(rd('sim', f)) for f in sim_files]
body += [f'// ═════ arenas/{k}.js ═════\n' + det_transform(rd('arenas', k + '.js')) for k in ARENAS]
body.append('// ═════ sim/90_round.js ═════\n' + det_transform(rd('sim', '90_round.js')))
fx_bind = '\n'.join(f'  const {n} = FX.{n} || NOOP;' for n in FX_NAMES)
fx_obj = '\n'.join(f'  const {n} = FX.{n} || new Proxy({{}}, {{ get: () => NOOP }});' for n in FX_OBJECTS)
create_sim = f"""// ═════════════════ createSim(env) — one isolated, deterministic simulation instance ═════════════════
// env = {{ seed, fx: {{ puff, sparks, …, SFX }} }}. Create a fresh instance per round so no state leaks between rounds.
function createSim(env = {{}}) {{
  const FX = env.fx || {{}}, NOOP = () => {{}};
{fx_bind}
{fx_obj}
  const DM = DET_MATH;
  const VRAND = env.vrand || Math.random; // visual-only randomness (particles, flicker): never affects play
  let RNG = makeRng(env.seed == null ? 1 : env.seed);
  let arena = null;
{chr(10).join(body)}
  return {{ ARENAS, makeBean, stepBean, collide, kill, R, DIVE, DT, createRound, packInput, unpackInput, IDLE_INPUT,
    setArena(a) {{ arena = a; }}, reseed(s) {{ RNG = makeRng(s); }}, random: () => RNG() }};
}}
"""
os.makedirs(out_dir, exist_ok=True)
follow = rd('sim', '99_follow.js')
sim = "'use strict';\n" + det + '\n' + create_sim + '\n' + follow + "\nif (typeof module === 'object' && module.exports) module.exports = { createSim, createFollower, DET_MATH, makeRng, hashNums, shuffleWith };\n"
open(os.path.join(out_dir, 'sim.cjs'), 'w').write(sim)

# ── browser bundle
env_fx = ', '.join(f'{n}: (...a) => {n}(...a)' for n in FX_NAMES)
env_obj = ', '.join(f'{n}: new Proxy({{}}, {{ get: (_, k) => (...a) => {n}[k](...a) }})' for n in FX_OBJECTS)
client = sorted(f for f in os.listdir(S) if f.endswith('.js') and f[:2].isdigit())
parts = ["'use strict';", det,
         '// browser global scope: real randomness + native maths (visuals); the simulation scope rebinds both',
         'const DM = Math;\nconst RNG = Math.random;', '// ═════ sim/01_base.js (global copy) ═════\n' + base, create_sim, follow,
         f'const FX_ENV = {{ {env_fx}, {env_obj} }};',
         'const SIM0 = createSim({ fx: FX_ENV, seed: 1 }); // menus, attract mode, portraits',
         'const { ARENAS, makeBean, stepBean, collide, R, DIVE } = SIM0;']
parts += [f'// ═════ {f} ═════\n' + rd(f) for f in client]
js = '\n'.join(parts)
open(os.path.join(out_dir, 'game.js'), 'w').write(js)
html = rd('head.html') + '\n<script>\n' + js + '</script>\n'
open(os.path.join(out_dir, 'hotshots-arena.html'), 'w').write(html)
for f in ('sim.cjs', 'game.js'):
    r = subprocess.run(['node', '--check', os.path.join(out_dir, f)], capture_output=True, text=True)
    if r.returncode: print(r.stderr); sys.exit(1)
print(f'built {os.path.relpath(out_dir, ROOT)}: sim.cjs {len(sim)//1024} KB, game.js {len(js)//1024} KB, arenas: {len(ARENAS)}; syntax ok')
