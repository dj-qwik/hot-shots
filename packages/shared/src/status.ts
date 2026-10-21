/** Mirrors HotShotsEscrow.Status (uint8). Keep in sync with the contract enum order. */
export const MatchStatus = {
  NONE: 0,
  CREATED: 1,
  FUNDED: 2,
  LOCKED: 3,
  RESULT_FINAL: 4,
  SETTLED: 5,
  ABORTED: 6,
  REFUNDED: 7,
} as const
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus]

export const matchStatusLabel: Record<MatchStatus, string> = {
  0: 'Not created',
  1: 'Open',
  2: 'Accepting entries',
  3: 'Locked — match in progress',
  4: 'Result posted — dispute window open',
  5: 'Settled',
  6: 'Cancelled — refunds available',
  7: 'Refunded',
}

/**
 * Off-chain settlement progress shown to players (spec §15: never call a payout complete on a
 * broadcast hash). Arbitrum Orbit: "included" = sequencer soft-confirmation; "safe" = batch posted
 * to Ethereum; "finalized" = Ethereum-finalized batch (strongest; can take tens of minutes).
 */
export type TxProgress = 'not_sent' | 'broadcast' | 'included' | 'safe' | 'finalized' | 'reverted' | 'dropped'
