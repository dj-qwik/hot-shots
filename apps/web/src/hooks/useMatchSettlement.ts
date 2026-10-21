import { useEffect, useState } from 'react'
import { type Address, type Hash, type Hex, parseAbiItem } from 'viem'
import { MatchStatus, escrowAbi, splitPot, type PotSplit, type TxProgress } from '@hotshots/shared'
import { env } from '../lib/env.ts'
import { publicClient } from '../lib/clients.ts'

export interface SettlementView {
  status: MatchStatus
  winner: Address | null
  split: PotSplit | null
  finalizableAt: bigint | null
  now: bigint
  settlementTx: Hash | null
  settlementProgress: TxProgress | null
  claimableWei: bigint
}

const settledEvent = parseAbiItem(
  'event MatchSettled(bytes32 indexed matchId, address indexed champion, uint256 championAmount, uint256 houseAmount)',
)

/** Polls the escrow for the match-end screen and tracks settlement finality. */
export function useMatchSettlement(matchId: Hex | null, viewer: Address | null, pollMs = 4000): SettlementView | null {
  const [view, setView] = useState<SettlementView | null>(null)

  useEffect(() => {
    if (!matchId) return
    let stop = false
    const load = async () => {
      const [m, head] = await Promise.all([
        publicClient.readContract({ address: env.escrow, abi: escrowAbi, functionName: 'getMatch', args: [matchId] }),
        publicClient.getBlock(),
      ])
      const status = m.status as MatchStatus
      let settlementTx: Hash | null = null
      let settlementProgress: TxProgress | null = null
      if (status === MatchStatus.SETTLED) {
        const logs = await publicClient.getLogs({ address: env.escrow, event: settledEvent, args: { matchId }, fromBlock: env.escrowDeployBlock })
        const log = logs.at(-1)
        if (log) {
          settlementTx = log.transactionHash
          const [safe, finalized] = await Promise.all([
            publicClient.getBlock({ blockTag: 'safe' }).catch(() => null),
            publicClient.getBlock({ blockTag: 'finalized' }).catch(() => null),
          ])
          settlementProgress =
            finalized?.number != null && finalized.number >= log.blockNumber
              ? 'finalized'
              : safe?.number != null && safe.number >= log.blockNumber
                ? 'safe'
                : 'included'
        }
      }
      const claimableWei = viewer
        ? await publicClient.readContract({ address: env.escrow, abi: escrowAbi, functionName: 'claimable', args: [viewer] })
        : 0n
      if (stop) return
      setView({
        status,
        winner: m.winner === '0x0000000000000000000000000000000000000000' ? null : m.winner,
        split: m.playerCount >= 2 ? splitPot(m.entryAmount, m.playerCount) : null,
        finalizableAt: m.resultSubmittedAt ? m.resultSubmittedAt + BigInt(m.disputeWindow) : null,
        now: head.timestamp,
        settlementTx,
        settlementProgress,
        claimableWei,
      })
    }
    void load()
    const t = setInterval(load, pollMs)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [matchId, viewer, pollMs])

  return view
}
