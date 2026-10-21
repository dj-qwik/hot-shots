import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePrivy, useWallets, type ConnectedWallet } from '@privy-io/react-auth'
import { type Address, type WalletClient, createWalletClient, custom } from 'viem'
import { chain, env } from '../lib/env.ts'
import { publicClient } from '../lib/clients.ts'

export interface HotShotsWallet {
  ready: boolean
  authenticated: boolean
  login: () => void
  logout: () => Promise<void>
  wallet: ConnectedWallet | null
  address: Address | null
  /** 'privy' for the embedded wallet; otherwise the external wallet's client type (metamask, etc.). */
  provider: string | null
  /** Chain the wallet is currently on (null until known). */
  walletChainId: number | null
  wrongChain: boolean
  balanceWei: bigint | null
  refreshBalance: () => Promise<void>
  switchToRobinhood: () => Promise<void>
  /** viem WalletClient bound to Robinhood Chain; switches chain first if needed. */
  getWalletClient: () => Promise<WalletClient>
}

/** CAIP-2 'eip155:46630' -> 46630 */
function parseCaip2(id: string | undefined): number | null {
  const n = Number(id?.split(':')[1])
  return Number.isFinite(n) ? n : null
}

export function useHotShotsWallet(): HotShotsWallet {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()

  // Prefer the Privy embedded wallet; fall back to the first external wallet.
  const wallet = useMemo(
    () => wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0] ?? null,
    [wallets],
  )
  const address = (wallet?.address as Address | undefined) ?? null
  const walletChainId = parseCaip2(wallet?.chainId)
  const wrongChain = walletChainId !== null && walletChainId !== env.chainId

  const [balanceWei, setBalance] = useState<bigint | null>(null)
  const refreshBalance = useCallback(async () => {
    if (!address) return setBalance(null)
    setBalance(await publicClient.getBalance({ address }))
  }, [address])

  useEffect(() => {
    void refreshBalance()
    const t = setInterval(refreshBalance, 10_000)
    return () => clearInterval(t)
  }, [refreshBalance])

  const switchToRobinhood = useCallback(async () => {
    if (!wallet) throw new Error('No wallet connected')
    await wallet.switchChain(env.chainId)
  }, [wallet])

  const getWalletClient = useCallback(async () => {
    if (!wallet) throw new Error('No wallet connected')
    if (parseCaip2(wallet.chainId) !== env.chainId) await wallet.switchChain(env.chainId)
    const provider = await wallet.getEthereumProvider()
    const client = createWalletClient({ account: wallet.address as Address, chain, transport: custom(provider) })
    // Defence in depth: never sign a deposit on any chain but the configured one.
    const actual = await client.getChainId()
    if (actual !== env.chainId) throw new Error(`Wallet is on chain ${actual}; switch to ${chain.name}`)
    return client
  }, [wallet])

  return {
    ready,
    authenticated,
    login,
    logout,
    wallet,
    address,
    provider: wallet?.walletClientType ?? null,
    walletChainId,
    wrongChain,
    balanceWei,
    refreshBalance,
    switchToRobinhood,
    getWalletClient,
  }
}
