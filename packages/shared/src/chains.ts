import type { Chain, Hash, Address } from 'viem'
import { robinhood, robinhoodTestnet } from 'viem/chains'

/**
 * Robinhood Chain (Arbitrum Orbit L2, ETH gas). Verified Oct 2026 against docs.robinhood.com/chain,
 * Privy's supported-chains table (eip155:4663 / eip155:46630) and viem's chain registry.
 * Re-verify before each production release.
 */
export const ROBINHOOD_MAINNET_ID = 4663 as const
export const ROBINHOOD_TESTNET_ID = 46630 as const
export type SupportedChainId = typeof ROBINHOOD_MAINNET_ID | typeof ROBINHOOD_TESTNET_ID

export const OFFICIAL_RPC: Record<SupportedChainId, string> = {
  [ROBINHOOD_MAINNET_ID]: 'https://rpc.mainnet.chain.robinhood.com',
  [ROBINHOOD_TESTNET_ID]: 'https://rpc.testnet.chain.robinhood.com',
}

export function isSupportedChainId(id: number): id is SupportedChainId {
  return id === ROBINHOOD_MAINNET_ID || id === ROBINHOOD_TESTNET_ID
}

/**
 * Chain object for viem/Privy. RPC is pinned to the URL you pass (use a dedicated provider such as
 * Alchemy in production) or the official public endpoint. viem's built-in definition also lists a
 * third-party RPC; we deliberately drop it so money-moving traffic only hits endpoints you chose.
 */
export function getChain(id: SupportedChainId, rpcUrl?: string): Chain {
  const base = id === ROBINHOOD_MAINNET_ID ? robinhood : robinhoodTestnet
  return {
    ...base,
    rpcUrls: { default: { http: [rpcUrl ?? OFFICIAL_RPC[id]] } },
  }
}

export function explorerTxUrl(chainId: SupportedChainId, hash: Hash): string {
  return `${getChain(chainId).blockExplorers!.default.url}/tx/${hash}`
}

export function explorerAddressUrl(chainId: SupportedChainId, address: Address): string {
  return `${getChain(chainId).blockExplorers!.default.url}/address/${address}`
}
