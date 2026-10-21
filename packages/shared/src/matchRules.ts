import type { Address } from 'viem'

/**
 * Match format (product decision, Oct 2026): best 2 out of 3.
 *  - First player to WIN 2 rounds is champion.
 *  - Rounds 1–3 are open to everyone.
 *  - With 3+ players, three rounds can produce three different winners. Then round 4 is a
 *    deciding final contested only by those three round winners; its winner has 2 wins.
 * So a match lasts 2–3 rounds for 2 players and 2–4 rounds otherwise.
 */
export const WINS_TO_CHAMPION = 2
export const OPEN_ROUNDS = 3
export const MIN_ROUNDS = WINS_TO_CHAMPION

export function maxRounds(playerCount: number): number {
  return playerCount >= 3 ? OPEN_ROUNDS + 1 : OPEN_ROUNDS
}

/** Who may compete in the next round given the winners so far (null = everyone). */
export function finalistsFor(roundWinners: readonly Address[]): Address[] | null {
  if (roundWinners.length < OPEN_ROUNDS) return null
  const distinct = new Set(roundWinners.map((a) => a.toLowerCase()))
  return distinct.size === OPEN_ROUNDS ? [...roundWinners.slice(0, OPEN_ROUNDS)] : null
}

export class RoundLedgerError extends Error {}

/**
 * Validates an ordered list of round winners against the locked roster and returns the champion.
 * Enforces every invariant checkable from the ledger:
 *  - exactly one winner per round, always a roster member
 *  - the match ends the moment someone reaches 2 wins (no extra rounds)
 *  - round 4 exists only after three distinct winners, and only a finalist can win it
 *  - the final round's winner has exactly 2 wins
 */
export function championFromRounds(roundWinners: readonly Address[], roster: readonly Address[]): Address {
  const members = new Set(roster.map((a) => a.toLowerCase()))
  if (members.size !== roster.length) throw new RoundLedgerError('roster has duplicates')
  if (roundWinners.length < MIN_ROUNDS) throw new RoundLedgerError(`fewer than ${MIN_ROUNDS} rounds`)
  if (roundWinners.length > maxRounds(roster.length)) {
    throw new RoundLedgerError(`more than ${maxRounds(roster.length)} rounds for ${roster.length} players`)
  }

  const wins = new Map<string, number>()
  roundWinners.forEach((w, i) => {
    const key = w.toLowerCase()
    if (!members.has(key)) throw new RoundLedgerError(`round ${i + 1} winner ${w} not on roster`)
    if (i === OPEN_ROUNDS) {
      const finalists = finalistsFor(roundWinners.slice(0, OPEN_ROUNDS))
      if (!finalists) throw new RoundLedgerError('round 4 played without three distinct round winners')
      if (!finalists.some((f) => f.toLowerCase() === key)) throw new RoundLedgerError(`round 4 winner ${w} was not a finalist`)
    }
    const next = (wins.get(key) ?? 0) + 1
    wins.set(key, next)
    if (next >= WINS_TO_CHAMPION && i !== roundWinners.length - 1) {
      throw new RoundLedgerError(`${w} reached ${WINS_TO_CHAMPION} wins at round ${i + 1} but match continued`)
    }
  })

  const champion = roundWinners[roundWinners.length - 1]
  if (wins.get(champion.toLowerCase()) !== WINS_TO_CHAMPION) {
    throw new RoundLedgerError(`final round winner does not have exactly ${WINS_TO_CHAMPION} wins`)
  }
  return champion
}

/**
 * Round pacing: every arena is a 30-second mini game (hard timeout; if nobody has finished the
 * objective, the arena's published objective score decides). Used for the pre-entry disclosure.
 */
export const ROUND_SECONDS = 30
export const TRANSITION_SECONDS = 15

/** Typical and worst-case match length in minutes for N players. */
export function matchLengthMinutes(playerCount: number): { typical: number; worstCase: number } {
  const per = ROUND_SECONDS + TRANSITION_SECONDS
  const typicalRounds = playerCount <= 2 ? 2.5 : 3
  return {
    typical: Math.ceil((typicalRounds * per) / 60),
    worstCase: Math.ceil((maxRounds(playerCount) * per) / 60),
  }
}
