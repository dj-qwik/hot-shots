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
  // Plays the round exactly like the real game (createRound: bot lapses, shared power-ups, the arena's own
  // bots on their own RNG stream). Controlled seats get the arena's bot input as a starting point.
  const r32 = () => (Math.random() * 4294967296) >>> 0
  const sim = G.createSim({ seed: r32() })
  const player = (i) => i === 0 && !opts.allBots
  const players = Array.from({ length: n }, (_, i) => ({
    i, human: player(i),
    skill: player(i) ? (opts.playerSkill ?? 0.8) : (opts.botSkill ?? 0.55 + Math.random() * 0.27),
    speedMul: player(i) ? 1 : (opts.botSpeed ?? 0.9 + Math.random() * 0.07),
  }))
  const R = sim.createRound({ key, seed: r32(), players, active: players.map((p) => p.i), botSalt: String(r32()) }, {})
  let w = null, frame = 0
  while (!w && R.t < 45) {
    frame++
    const inputs = {}
    for (const [i, c] of Object.entries(controllers)) {
      const b = R.beans[+i]; if (!b || typeof c !== 'function') continue
      const hu = b.human; b.human = false
      const base = R.arena.botInput(b, R.t + 1 / 60) || {}
      b.human = hu
      inputs[i] = sim.packInput(c(b, R.t + 1 / 60, R.arena, R.beans, base, frame) || {})
    }
    w = R.step(inputs)
  }
  return { winner: w, t: R.t, beans: R.beans, round: R }
}
