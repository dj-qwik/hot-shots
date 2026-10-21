/**
 * Wallet bridge for the game page. The game itself is plain JavaScript; Privy needs React. This mounts
 * PrivyProvider in a hidden root and exposes a tiny promise API on `window.HSWallet`:
 *   state() · login() · logout() · balance() · sign(message) · deposit(matchId, stakeEth) · leave(matchId)
 *   · claim() · claimRefund(matchId) · waitTx(hash) · explorerTx(hash)
 * and fires a `hswallet` event on window whenever login state or the wallet changes.
 * Config (Privy app id, chain, escrow) comes from the game server's /api/config at runtime.
 * Privy shows its own login + transaction-confirmation UI; nothing here can move funds without the
 * player approving it there.
 */
import { createRoot } from 'react-dom/client'
import { useEffect, useRef } from 'react'
import { PrivyProvider, usePrivy, useWallets, type ConnectedWallet } from '@privy-io/react-auth'
import { createPublicClient, createWalletClient, custom, http, parseEther, type Address, type Chain, type Hex, type PublicClient } from 'viem'
import { escrowAbi, getChain, type SupportedChainId } from '@hotshots/shared'

interface CashConfig { enabled: boolean; chainId: SupportedChainId; rpcUrl: string; escrow: Address | null; explorer: string | null }
interface WalletState { ready: boolean; authenticated: boolean; address: Address | null; embedded: boolean; chainId: number }
export interface HSWalletApi {
  state(): WalletState
  login(): void
  logout(): Promise<void>
  balance(): Promise<string | null>
  sign(message: string): Promise<Hex>
  deposit(matchId: Hex, stakeEth: string): Promise<Hex>
  leave(matchId: Hex): Promise<Hex>
  claim(): Promise<Hex>
  claimRefund(matchId: Hex): Promise<Hex>
  waitTx(hash: Hex): Promise<'success' | 'reverted'>
  explorerTx(hash: Hex): string | null
  exportWallet(): Promise<void>
}
declare global { interface Window { HSWallet?: HSWalletApi } }

// returns nothing on purpose: React treats an effect's return value as its cleanup function
const fire = (): void => { window.dispatchEvent(new Event('hswallet')) }

function Bridge({ cfg, chain, pub }: { cfg: CashConfig; chain: Chain; pub: PublicClient }) {
  const privy = usePrivy()
  const { wallets } = useWallets()
  // Prefer the Privy embedded wallet; fall back to an external one (MetaMask, Coinbase, …).
  const wallet: ConnectedWallet | null = wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0] ?? null
  const cur = useRef({ privy, wallet })
  cur.current = { privy, wallet }

  useEffect(() => {
    const escrow = () => { if (!cfg.escrow) throw new Error('Escrow not deployed yet'); return cfg.escrow }
    async function client() {
      const w = cur.current.wallet
      if (!w) throw new Error('Sign in first')
      if (Number(w.chainId?.split(':')[1]) !== cfg.chainId) await w.switchChain(cfg.chainId)
      const provider = await w.getEthereumProvider()
      return { w, wc: createWalletClient({ account: w.address as Address, chain, transport: custom(provider) }) }
    }
    const write = async (functionName: 'joinMatch' | 'leaveMatch' | 'claim' | 'claimRefund', args: readonly unknown[], value?: bigint): Promise<Hex> => {
      const { w, wc } = await client()
      // simulate first so a stale lobby / wrong amount fails here instead of costing gas
      const { request } = await pub.simulateContract({ address: escrow(), abi: escrowAbi, functionName, args, value, account: w.address as Address } as never)
      return wc.writeContract(request as never)
    }
    const api: HSWalletApi = {
      state: () => ({ ready: cur.current.privy.ready, authenticated: cur.current.privy.authenticated, address: (cur.current.wallet?.address as Address) ?? null, embedded: cur.current.wallet?.walletClientType === 'privy', chainId: cfg.chainId }),
      login: () => cur.current.privy.login(),
      logout: () => cur.current.privy.logout(),
      balance: async () => { const a = cur.current.wallet?.address as Address | undefined; return a ? (await pub.getBalance({ address: a })).toString() : null },
      sign: async (message) => { const { w, wc } = await client(); return wc.signMessage({ account: w.address as Address, message }) },
      deposit: async (matchId, stakeEth) => {
        const value = parseEther(stakeEth)
        const m = (await pub.readContract({ address: escrow(), abi: escrowAbi, functionName: 'getMatch', args: [matchId] })) as { entryAmount: bigint }
        if (m.entryAmount !== value) throw new Error('This lobby\'s on-chain stake does not match what the game showed. Not depositing.')
        return write('joinMatch', [matchId, []], value)
      },
      leave: (matchId) => write('leaveMatch', [matchId]),
      claim: () => write('claim', []),
      claimRefund: (matchId) => write('claimRefund', [matchId]),
      waitTx: async (hash) => (await pub.waitForTransactionReceipt({ hash, timeout: 180_000 })).status,
      explorerTx: (hash) => (cfg.explorer ? `${cfg.explorer}/tx/${hash}` : null),
      exportWallet: async () => { await (cur.current.privy as unknown as { exportWallet: () => Promise<void> }).exportWallet() },
    }
    window.HSWallet = api
    fire()
  }, [cfg, chain, pub])
  useEffect(() => { fire() }, [privy.ready, privy.authenticated, wallet?.address, wallet?.chainId])
  return null
}

async function boot() {
  const conf = await (await fetch('/api/config')).json() as { privyAppId: string | null; cash: CashConfig }
  if (!conf.privyAppId || !conf.cash?.chainId) return
  const chain = getChain(conf.cash.chainId, conf.cash.rpcUrl)
  const pub = createPublicClient({ chain, transport: http(conf.cash.rpcUrl) }) as PublicClient
  const el = document.createElement('div')
  el.id = 'privy-bridge'
  document.body.appendChild(el)
  createRoot(el).render(
    <PrivyProvider
      appId={conf.privyAppId}
      config={{
        defaultChain: chain,
        supportedChains: [chain], // Robinhood Chain only
        loginMethods: ['email', 'wallet'],
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' }, showWalletUIs: true },
        appearance: { theme: 'dark', accentColor: '#FF557D', walletChainType: 'ethereum-only', showWalletLoginFirst: false },
      }}
    >
      <Bridge cfg={conf.cash} chain={chain} pub={pub} />
    </PrivyProvider>,
  )
}
boot().catch((e) => console.error('wallet bridge', e))
