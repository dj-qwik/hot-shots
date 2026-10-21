import type { Hex } from 'viem'
import { MatchStatus, explorerTxUrl, formatEthExact, matchStatusLabel } from '@hotshots/shared'
import { env } from '../lib/env.ts'
import { maskAddress } from '../lib/clients.ts'
import type { HotShotsWallet } from '../hooks/useHotShotsWallet.ts'
import { useEscrowActions } from '../hooks/useEscrowActions.ts'
import { useMatchSettlement } from '../hooks/useMatchSettlement.ts'

const finalityLabel = {
  included: 'Confirmed by Robinhood Chain (awaiting Ethereum)',
  safe: 'Posted to Ethereum (awaiting finality)',
  finalized: 'Final on Ethereum',
} as const

/** Spec §11 match-end: pot split, masked champion address, tx hash, settlement state, support link. */
export function SettlementStatus({ w, matchId }: { w: HotShotsWallet; matchId: Hex }) {
  const v = useMatchSettlement(matchId, w.address)
  const { tx, claim, claimRefund } = useEscrowActions(w)
  if (!v) return <section className="panel">Loading settlement…</section>

  const youWon = v.winner && w.address && v.winner.toLowerCase() === w.address.toLowerCase()
  const secondsLeft = v.finalizableAt && v.finalizableAt > v.now ? Number(v.finalizableAt - v.now) : 0

  return (
    <section className="panel">
      <h2>{youWon ? 'Champion!' : 'Match result'}</h2>
      <p className="status">{matchStatusLabel[v.status]}</p>

      {v.winner && (
        <dl className="kv">
          <dt>Champion wallet</dt>
          <dd>{maskAddress(v.winner)}</dd>
          {v.split && (
            <>
              <dt>Pot</dt>
              <dd>{formatEthExact(v.split.pot)} ETH</dd>
              <dt>Champion (90%)</dt>
              <dd>{formatEthExact(v.split.champion)} ETH</dd>
              <dt>House (10%)</dt>
              <dd>{formatEthExact(v.split.house)} ETH</dd>
            </>
          )}
        </dl>
      )}

      {v.status === MatchStatus.RESULT_FINAL && (
        <p className="muted">
          Dispute window: {secondsLeft > 0 ? `payout available in ${Math.ceil(secondsLeft / 60)} min` : 'closed — payout pending'}.
        </p>
      )}

      {v.status === MatchStatus.SETTLED && v.settlementTx && (
        <p>
          Payout transaction:{' '}
          <a href={explorerTxUrl(env.chainId, v.settlementTx)} target="_blank" rel="noreferrer">
            {maskAddress(v.settlementTx)}
          </a>
          <br />
          <span className="muted">{v.settlementProgress ? finalityLabel[v.settlementProgress as keyof typeof finalityLabel] : ''}</span>
        </p>
      )}

      {v.status === MatchStatus.ABORTED && (
        <div className="banner info">
          This match was cancelled and every stake is refundable. Refunds are sent automatically; you can also claim yours now.
          <button className="btn" onClick={() => void claimRefund(matchId)}>Claim refund</button>
        </div>
      )}

      {v.claimableWei > 0n && (
        <div className="banner info">
          Your wallet couldn't receive {formatEthExact(v.claimableWei)} ETH automatically. It is held for you.
          <button className="btn primary" onClick={() => void claim()}>Claim {formatEthExact(v.claimableWei)} ETH</button>
        </div>
      )}

      {tx?.error && <p className="banner warn">{tx.error}</p>}

      <p className="fineprint">
        Think something went wrong? <a href={env.supportUrl}>Open a dispute or contact support</a> — include match id{' '}
        <code>{maskAddress(matchId)}</code>.
      </p>
    </section>
  )
}
