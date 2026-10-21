/**
 * Wallet bridge for the game page. The game itself is plain JavaScript; Privy needs React. This mounts
 * PrivyProvider in a hidden root and exposes a tiny promise API on `window.HSWallet`:
 *   state() · login() · logout() · balance() · sign(message) · deposit(matchId, stakeEth) · leave(matchId)
 *   · claim() · claimRefund(matchId) · send(to, amountEth | 'max') · waitTx(hash) · explorerTx(hash)
 * and fires a `hswallet` event on window whenever login state or the wallet changes.
 * Config (Privy app id, chain, escrow) comes from the game server's /api/config at runtime.
 * Players sign in with Google or email only: Privy creates a "game wallet" (embedded, self-custodial; we never hold
 * its keys) so MetaMask is never asked to connect or sign — no browser-extension security prompts.
 * Fund it by sending ETH to its address; cash out with send(). Privy's own pop-ups are off: every action
 * is confirmed by an explicit button in the game (Deposit / Leave / Send to <address>).
 */
import { createRoot } from 'react-dom/client'
import { useEffect, useRef } from 'react'
import { PrivyProvider, useCreateWallet, usePrivy, useWallets, type ConnectedWallet } from '@privy-io/react-auth'
import { createPublicClient, createWalletClient, custom, http, isAddress, parseEther, type Address, type Chain, type Hex, type PublicClient } from 'viem'
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
  send(to: string, amountEth: string): Promise<Hex>
  waitTx(hash: Hex): Promise<'success' | 'reverted'>
  explorerTx(hash: Hex): string | null
  exportWallet(): Promise<void>
}
declare global { interface Window { HSWallet?: HSWalletApi } }

// returns nothing on purpose: React treats an effect's return value as its cleanup function
const fire = (): void => { window.dispatchEvent(new Event('hswallet')) }

function Bridge({ cfg, chain, pub }: { cfg: CashConfig; chain: Chain; pub: PublicClient }) {
  const privy = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const { createWallet } = useCreateWallet()
  // Only the Privy game wallet: an external wallet (MetaMask…) would bring back its connect/sign prompts.
  const wallet: ConnectedWallet | null = wallets.find((w) => w.walletClientType === 'privy') ?? null
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
      // already signed in without a game wallet (old session): start over so the sign-in window opens
      login: () => { const p = cur.current.privy; if (p.authenticated && !cur.current.wallet) void p.logout().then(() => p.login()); else p.login() },
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
      // cash out: amountEth, or 'max' = everything minus the gas this transfer can cost
      send: async (to, amountEth) => {
        if (!isAddress(to, { strict: false })) throw new Error('That is not a valid address.')
        const { w, wc } = await client()
        const from = w.address as Address
        const bal = await pub.getBalance({ address: from })
        const max = amountEth === 'max'
        let value = max ? 0n : parseEther(amountEth)
        if (!max && value <= 0n) throw new Error('Enter an amount.')
        const fees = await pub.estimateFeesPerGas()
        const est = await pub.estimateGas({ account: from, to: to as Address, value: max ? 1n : value })
        const gas = (est * 12n) / 10n, cost = gas * fees.maxFeePerGas
        if (max) value = bal - cost
        if (value <= 0n) throw new Error('Not enough ETH to cover the network fee.')
        if (value + cost > bal) throw new Error('Not enough ETH for that amount plus the network fee. Try Max.')
        return wc.sendTransaction({ account: from, chain, to: to as Address, value, gas, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas } as never)
      },
      waitTx: async (hash) => (await pub.waitForTransactionReceipt({ hash, timeout: 180_000 })).status,
      explorerTx: (hash) => (cfg.explorer ? `${cfg.explorer}/tx/${hash}` : null),
      exportWallet: async () => { await (cur.current.privy as unknown as { exportWallet: () => Promise<void> }).exportWallet() },
    }
    window.HSWallet = api
    fire()
  }, [cfg, chain, pub])
  useEffect(() => { fire() }, [privy.ready, privy.authenticated, wallet?.address, wallet?.chainId])
  // Signed in from before (e.g. an old MetaMask login) but no game wallet yet: make one now.
  const creating = useRef(false)
  useEffect(() => {
    if (!privy.ready || !privy.authenticated || !walletsReady || wallet || creating.current) return
    creating.current = true
    createWallet().catch((e: unknown) => console.warn('game wallet create', e)).finally(() => { creating.current = false })
  }, [privy.ready, privy.authenticated, walletsReady, wallet])
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
        loginMethods: ['google', 'email'],
        embeddedWallets: { ethereum: { createOnLogin: 'all-users' }, showWalletUIs: false },
        appearance: { theme: 'dark', accentColor: '#FF557D', walletChainType: 'ethereum-only', showWalletLoginFirst: false, landingHeader: 'Sign in to play' },
      }}
    >
      <Bridge cfg={conf.cash} chain={chain} pub={pub} />
    </PrivyProvider>,
  )
}
boot().catch((e) => console.error('wallet bridge', e))
