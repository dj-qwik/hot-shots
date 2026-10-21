import { formatEthExact, explorerAddressUrl } from '@hotshots/shared'
import { chain, env } from '../lib/env.ts'
import { maskAddress } from '../lib/clients.ts'
import type { HotShotsWallet } from '../hooks/useHotShotsWallet.ts'

/** Spec §11 wallet panel: provider, network, address, balance, chain mismatch, funding guidance. */
export function WalletPanel({ w, usdPerEth }: { w: HotShotsWallet; usdPerEth?: number | null }) {
  if (!w.ready) return <section className="panel">Loading wallet…</section>
  if (!w.authenticated) {
    return (
      <section className="panel">
        <h2>Wallet</h2>
        <p className="muted">Sign in to create a wallet or connect your own. Practice mode never needs a wallet.</p>
        <button className="btn primary" onClick={w.login}>Sign in</button>
      </section>
    )
  }

  const providerLabel = w.provider === 'privy' ? 'Privy embedded wallet' : w.provider ?? 'Unknown'
  const lowBalance = w.balanceWei !== null && w.balanceWei === 0n

  return (
    <section className="panel">
      <h2>Wallet</h2>
      <dl className="kv">
        <dt>Provider</dt>
        <dd>{providerLabel}</dd>
        <dt>Network</dt>
        <dd>
          {chain.name} <span className="muted">(chain {env.chainId})</span>
        </dd>
        <dt>Address</dt>
        <dd>
          {w.address ? (
            <a href={explorerAddressUrl(env.chainId, w.address)} target="_blank" rel="noreferrer">
              {maskAddress(w.address)}
            </a>
          ) : (
            '—'
          )}
        </dd>
        <dt>Balance</dt>
        <dd>
          {w.balanceWei === null ? '…' : `${formatEthExact(w.balanceWei)} ETH`}
          {w.balanceWei !== null && usdPerEth ? (
            <span className="muted"> ≈ ${((Number(w.balanceWei / 10n ** 12n) / 1e6) * usdPerEth).toFixed(2)} (approx.)</span>
          ) : null}
        </dd>
      </dl>

      {w.wrongChain && (
        <div className="banner warn" role="alert">
          Your wallet is on chain {w.walletChainId}. Hot Shots only accepts entries on {chain.name}.
          <button className="btn" onClick={() => void w.switchToRobinhood()}>Switch network</button>
        </div>
      )}

      {lowBalance && (
        <div className="banner info">
          <strong>Funding:</strong> entries are paid in ETH on {chain.name}, and each deposit also needs a little
          ETH for network gas. Send ETH on {chain.name} to your address above, or bridge ETH from Ethereum using
          Robinhood Chain's official bridge. Never send funds on a different network to this address.
        </div>
      )}

      <button className="btn ghost" onClick={() => void w.logout()}>Sign out</button>
    </section>
  )
}
