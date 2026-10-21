// Headless test harness: loads the deterministic simulation (dist/sim.cjs) and plays rounds.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
import { createRequire } from 'node:module'
// Loads the deterministic simulation (dist/sim.cjs). No DOM needed: the sim never touches the browser.
export function loadGame(file = process.env.SIM_JS || path.join(here, '..', 'dist', 'sim.cjs')) {
  const require = createRequire(import.meta.url)
  const { createSim } = require(path.resolve(file))
  const sim = createSim({ seed: (Math.random() * 4294967296) >>> 0 })
  return { ...sim, createSim, ROUND_SECONDS: 30 }
}

/**
 * Run one round. controllers[i] (optional) overrides bean i's input: (bean, t, arena, beans, botInput) => input.
 * Bean 0 is the "player" seat (human flag, full speed). Spawn order is shuffled like the real game.
 */
export function runRound(G, key, n, controllers = {}, opts = {}) {
  const A = G.ARENAS[key]
  const beans = Array.from({ length: n }, (_, i) => { const b = G.makeBean(i, i === 0 && !opts.allBots); if (opts.botSkill) { b.skill = opts.botSkill; b.speedMul = opts.botSpeed ?? b.speedMul } return b })
  if (!opts.allBots) { beans[0].skill = opts.playerSkill ?? 0.8; beans[0].speedMul = 1 }
  G.setArena(A)
  A.init([...beans].sort(() => Math.random() - 0.5))
  const dt = 1 / 60
  let t = 0, w = null, frame = 0
  while (!w && t < 45) {
    t += dt; frame++
    for (const b of beans) {
      const hu = b.human; b.human = false
      let inp = A.botInput(b, t)
      b.human = hu
      const c = controllers[b.i]
      if (c) inp = c(b, t, A, beans, inp, frame)
      G.stepBean(b, inp, dt, A.maxSpeed, A.diveSpeed, A.mods?.(b))
    }
    G.collide(beans)
    A.update(dt, t)
    w = A.winner(t, t >= A.timeout)
  }
  return { winner: w, t, beans }
}
