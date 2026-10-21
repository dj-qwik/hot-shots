import { useEffect, useState } from 'react'
import { type Hex, encodeFunctionData } from 'viem'
import { escrowAbi, explorerTxUrl, formatEthExact, formatFiatApprox, matchLengthMinutes, maxRounds, splitPot } from '@hotshots/shared'
import { chain, env } from '../lib/env.ts'
import { publicClient } from '../lib/clients.ts'
import type { HotShotsWallet } from '../hooks/useHotShotsWallet.ts'
import { useEscrowActions } from '../hooks/useEscrowActions.ts'

export interface LobbyInfo {
  matchId: Hex
  region: string
  capacity: number
  playerCount: number
  stakeWei: bigint
  admissionDeadline: Date
  allowlistProof?: Hex[]
}

/**
 * Spec §11 stake selector + §20 "inspect entry risk and prize calculations before depositing".
 * Shows exact wei-derived math, who pays which fees, the refund policy and match length, and
 * requires the rules to be acknowledged before any transaction is requested. No urgency, no nudges.
 */
export function StakeConfirm({
  w,
  lobby,
  usdPerEth,
  onJoined,
}: {
  w: HotShotsWallet
  lobby: LobbyInfo
  usdPerEth?: number | null
  onJoined?: () => void
}) {
  const { tx, join } = useEscrowActions(w)
  const [ack, setAck] = useState(false)
  const [gasWei, setGasWei] = useState<bigint | null>(null)

  const full = splitPot(lobby.stakeWei, lobby.capacity)
  const current = lobby.playerCount >= 2 ? splitPot(lobby.stakeWei, lobby.playerCount) : null
  const fiat = (wei: bigint) => formatFiatApprox(wei, usdPerEth)

  // Estimate the player's own gas for the deposit (paid separately from the stake, never from the pot).
  useEffect(() => {
    if (!w.address) return
    publicClient
      .estimateGas({
        account: w.address,
        to: env.escrow,
        value: lobby.stakeWei,
        data: encodeFunctionData({ abi: escrowAbi, functionName: 'joinMatch', args: [lobby.matchId, lobby.allowlistProof ?? []] }),
      })
      .then(async (g) => setGasWei(g * (await publicClient.getGasPrice())))
      .catch(() => setGasWei(null))
  }, [w.address, lobby.matchId, lobby.stakeWei, lobby.allowlistProof])

  const insufficient = w.balanceWei !== null && w.balanceWei < lobby.stakeWei + (gasWei ?? 0n)
  const busy = tx?.progress === 'awaiting_signature' || tx?.progress === 'broadcast'
  const canDeposit = w.authenticated && !w.wrongChain && ack && !insufficient && !busy && tx?.progress !== 'included'

  return (
    <section className="panel">
      <h2>Confirm entry</h2>

      <table className="math">
        <tbody>
          <tr>
            <th>Your entry stake</th>
            <td>
              {formatEthExact(lobby.stakeWei)} ETH <span className="muted">{fiat(lobby.stakeWei)}</span>
            </td>
          </tr>
          <tr>
            <th>Network gas for your deposit</th>
            <td>
              {gasWei === null ? 'estimating…' : `~${formatEthExact(gasWei)} ETH`}{' '}
              <span className="muted">paid by you to the network, not to Hot Shots</span>
            </td>
          </tr>
          <tr>
            <th>Players</th>
            <td>
              {lobby.playerCount} of {lobby.capacity} · {lobby.region}
            </td>
          </tr>
          <tr>
            <th>Pot if lobby fills</th>
            <td>
              {lobby.capacity} × {formatEthExact(lobby.stakeWei)} = <strong>{formatEthExact(full.pot)} ETH</strong>
            </td>
          </tr>
          <tr>
            <th>Champion receives (90%)</th>
            <td>
              <strong>{formatEthExact(full.champion)} ETH</strong> <span className="muted">{fiat(full.champion)}</span>
            </td>
          </tr>
          <tr>
            <th>House fee (10%)</th>
            <td>{formatEthExact(full.house)} ETH</td>
          </tr>
          {current && lobby.playerCount !== lobby.capacity && (
            <tr>
              <th>If it starts at current size</th>
              <td className="muted">
                pot {formatEthExact(current.pot)} · champion {formatEthExact(current.champion)} · house{' '}
                {formatEthExact(current.house)} ETH
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <ul className="fineprint">
        <li>Only the champion is paid. Everyone else loses their stake. Play only with money you can afford to lose.</li>
        <li>
          House fee is exactly ⌊10%⌋ of the pot; any rounding remainder goes to the champion. Network gas is never
          taken from the prize. Payout and refund gas is paid by Hot Shots.
        </li>
        <li>
          Best 2 out of 3: the first player to win 2 rounds is champion. Each round is a 30-second mini game.
          {lobby.capacity >= 3 && ' If three different players win rounds 1–3, those three play one deciding final.'}{' '}
          At most {maxRounds(lobby.capacity)} rounds (about {matchLengthMinutes(lobby.capacity).worstCase} minutes).
        </li>
        <li>
          You can withdraw your full stake any time before the match locks. If the lobby doesn't start by{' '}
          {lobby.admissionDeadline.toLocaleTimeString()}, every entry is refunded in full.
        </li>
        <li>
          After a result is posted there is a dispute window before payout. If no result is certified in time, all
          stakes are refunded — anyone can trigger this on-chain, even if Hot Shots is offline.
        </li>
        <li>Funds are held by an audited escrow contract on {chain.name}, not by Hot Shots.</li>
      </ul>

      <label className="ack">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />I have read the rules,
        refund and dispute policy, and confirm I am eligible to play for stakes where I live.
      </label>

      {insufficient && <p className="banner warn">Your balance doesn't cover the stake plus gas.</p>}

      <button
        className="btn primary"
        disabled={!canDeposit}
        onClick={async () => {
          if (await join(lobby.matchId, lobby.stakeWei, lobby.allowlistProof)) onJoined?.()
        }}
      >
        Deposit {formatEthExact(lobby.stakeWei)} ETH
      </button>

      {tx && (
        <p className={`txstate ${tx.progress}`} aria-live="polite">
          {tx.progress === 'awaiting_signature' && 'Confirm in your wallet…'}
          {tx.progress === 'broadcast' && 'Submitted. Waiting for the network to include it…'}
          {tx.progress === 'included' && 'Entry confirmed on-chain. You are in.'}
          {tx.progress === 'reverted' && 'The network rejected this deposit. Nothing was taken except gas.'}
          {tx.progress === 'error' && tx.error}{' '}
          {tx.hash && (
            <a href={explorerTxUrl(env.chainId, tx.hash)} target="_blank" rel="noreferrer">
              View transaction
            </a>
          )}
        </p>
      )}
    </section>
  )
}
