import { type Address, type Hex, getAddress, keccak256, stringToHex } from 'viem'

/**
 * Round replays: everything needed to re-run a round of the deterministic game simulation and get the
 * same winner the game server announced. The server publishes one per round; its hash is the round's
 * scoreEvidenceHash in the on-chain result, and every co-signer replays it before signing.
 */
export interface RoundReplay {
  n: number // round number, 1-based
  key: string // arena key
  seedReveal: Hex // 32 random bytes; keccak256(seedReveal) is the round's seed commitment
  active: number[] // seats playing this round (all, or the 3 finalists)
  players: { i: number; speedMul: number }[] // every seat in the match
  seats: Address[] // wallet address of each seat
  inputs: number[][] // per tick: packed input of each active seat, in `active` order
}

/** Canonical arena list: stageId = index + 1 (stable forever; append only). */
export const ARENA_KEYS = ['runway', 'hex', 'crown', 'laser', 'bubblegum', 'turnpike', 'rodeo', 'skyrail', 'floes', 'storm',
  'marbles', 'bumper', 'iceberg', 'crater', 'disco', 'meteor', 'jelly', 'lantern', 'paint', 'bounce'] as const

export function stageIdOf(key: string): number {
  const i = (ARENA_KEYS as readonly string[]).indexOf(key)
  if (i < 0) throw new Error(`unknown arena ${key}`)
  return i + 1
}

/** The simulation seed is derived from the 32-byte reveal, so the published commitment can't be brute-forced. */
export function simSeed(seedReveal: Hex): number {
  return Number.parseInt(keccak256(seedReveal).slice(2, 10), 16) >>> 0
}

/** Stable serialization (fixed key order) → keccak256. */
export function replayHash(r: RoundReplay): Hex {
  const canonical = JSON.stringify({
    n: r.n, key: r.key, seedReveal: r.seedReveal, active: r.active,
    players: r.players.map((p) => ({ i: p.i, speedMul: p.speedMul })),
    seats: r.seats.map((a) => getAddress(a)), inputs: r.inputs,
  })
  return keccak256(stringToHex(canonical))
}

export class ReplayError extends Error {}

/** Minimal shape of game/dist/sim.cjs that a verifier needs. */
export interface SimFactory {
  (env: object): {
    createRound(cfg: object, rng?: object): {
      step(inputs: Record<number, number>): unknown
      readonly winner: { i: number } | null
      readonly tick: number
    }
  }
}

/**
 * Re-run one round and return the winning seat's address. Rejects logs that are padded after the
 * finish or that end before anyone has won.
 */
export function replayWinner(createSim: SimFactory, r: RoundReplay): Address {
  if (!r.active.length || r.active.some((s) => !r.players.some((p) => p.i === s))) throw new ReplayError('bad active seats')
  if (r.seats.length !== r.players.length) throw new ReplayError('seat/address count mismatch')
  const R = createSim({ seed: 0 }).createRound({
    key: r.key, seed: simSeed(r.seedReveal), players: r.players, active: r.active, isFinal: r.active.length !== r.players.length,
  })
  for (let k = 0; k < r.inputs.length; k++) {
    const row = r.inputs[k]
    if (!Array.isArray(row) || row.length !== r.active.length) throw new ReplayError(`tick ${k + 1}: wrong input count`)
    const inp: Record<number, number> = {}
    r.active.forEach((s, j) => { inp[s] = row[j] >>> 0 })
    R.step(inp)
    if (R.winner && k !== r.inputs.length - 1) throw new ReplayError(`round decided at tick ${k + 1} but log continues`)
  }
  if (!R.winner) throw new ReplayError('log ends before the round is decided')
  return getAddress(r.seats[R.winner.i])
}
