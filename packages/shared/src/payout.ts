/**
 * Prize math. Mirrors HotShotsEscrow.splitPot exactly (integer wei, no floats anywhere).
 *
 * Published dust rule: house = floor(pot * 10%); champion = pot - house.
 * Any rounding remainder goes to the champion. Network gas is never deducted from the pot.
 */
export const BPS = 10_000n
export const HOUSE_BPS = 1_000n
export const CHAMPION_BPS = BPS - HOUSE_BPS

export interface PotSplit {
  pot: bigint
  champion: bigint
  house: bigint
}

export function splitPot(entryWei: bigint, playerCount: number | bigint): PotSplit {
  const n = BigInt(playerCount)
  if (entryWei <= 0n) throw new RangeError('entry must be > 0 wei')
  if (n < 2n || n > 16n) throw new RangeError('player count must be 2..16')
  const pot = entryWei * n
  const house = (pot * HOUSE_BPS) / BPS
  return { pot, champion: pot - house, house }
}

const WEI_PER_ETH = 10n ** 18n

/** Exact ETH string with no rounding: 72000000000000000n -> "0.072". */
export function formatEthExact(wei: bigint): string {
  const neg = wei < 0n
  const abs = neg ? -wei : wei
  const whole = abs / WEI_PER_ETH
  const frac = (abs % WEI_PER_ETH).toString().padStart(18, '0').replace(/0+$/, '')
  return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`
}

/** Parse a decimal ETH string to wei exactly. Rejects more than 18 decimals. */
export function parseEthExact(eth: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,18}))?$/.exec(eth.trim())
  if (!m) throw new RangeError(`invalid ETH amount: ${eth}`)
  return BigInt(m[1]) * WEI_PER_ETH + BigInt((m[2] ?? '').padEnd(18, '0') || '0')
}

/**
 * Approximate fiat label. Display only: always labelled approximate, never used for any
 * calculation, and omitted entirely when no rate is available.
 */
export function formatFiatApprox(wei: bigint, usdPerEth: number | null | undefined): string | null {
  if (usdPerEth == null || !Number.isFinite(usdPerEth) || usdPerEth <= 0) return null
  // Scale to micro-ETH before converting to Number to keep precision for display.
  const microEth = Number(wei / 10n ** 12n) / 1e6
  const usd = microEth * usdPerEth
  return `≈ $${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
}

/** Stake tiers offered in public lobbies (wei). Adjust per legal/eligibility review. */
export const STAKE_TIERS_WEI: readonly bigint[] = [
  parseEthExact('0.001'),
  parseEthExact('0.005'),
  parseEthExact('0.01'),
  parseEthExact('0.05'),
]

export const LEGAL_MATCH_SIZES = [2, 4, 6, 8, 12, 16] as const
