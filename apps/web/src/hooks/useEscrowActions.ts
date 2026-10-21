import { useCallback, useState } from 'react'
import { type Address, type Hash, type Hex, BaseError, ContractFunctionRevertedError } from 'viem'
import { MatchStatus, escrowAbi, type TxProgress } from '@hotshots/shared'
import { env } from '../lib/env.ts'
import { publicClient } from '../lib/clients.ts'
import type { HotShotsWallet } from './useHotShotsWallet.ts'

export interface TxView {
  progress: TxProgress | 'awaiting_signature' | 'error'
  hash?: Hash
  error?: string
}

/** Human-readable reasons for the contract's custom errors. */
const REVERT_REASONS: Record<string, string> = {
  AdmissionClosed: 'Entries for this lobby have closed.',
  WrongAmount: 'The stake amount did not match this lobby. Nothing was charged.',
  AlreadyJoined: 'This wallet has already entered this lobby.',
  MatchFull: 'This lobby filled up before your entry was confirmed.',
  NotAllowlisted: 'This private lobby does not include your wallet.',
  BadStatus: 'This lobby is no longer accepting this action.',
  EnforcedPause: 'Entries are temporarily paused. Your funds are safe; refunds and claims still work.',
  NothingToClaim: 'There is nothing to claim for this wallet.',
}

function explain(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null
    const name = revert?.data?.errorName
    if (name && REVERT_REASONS[name]) return REVERT_REASONS[name]
    if (/rejected|denied/i.test(e.shortMessage)) return 'You cancelled the request in your wallet. Nothing was charged.'
    return e.shortMessage
  }
  return e instanceof Error ? e.message : String(e)
}

/**
 * Player-side escrow actions. Each one:
 *  1. re-reads the lobby on-chain (amount and status come from the contract, never from the API),
 *  2. simulates the call so reverts are caught before the wallet prompt,
 *  3. sends through the player's own wallet (Privy embedded or external),
 *  4. reports progress honestly: signature → broadcast → included. Never "done" on a bare hash.
 */
export function useEscrowActions(w: HotShotsWallet) {
  const [tx, setTx] = useState<TxView | null>(null)

  const run = useCallback(
    async (functionName: 'joinMatch' | 'leaveMatch' | 'claimRefund' | 'claim', args: readonly unknown[], value?: bigint) => {
      setTx({ progress: 'awaiting_signature' })
      try {
        const client = await w.getWalletClient()
        const account = client.account!.address as Address
        // functionName is a union here, so viem can't narrow `value` per function; cast the params once.
        const { request } = await publicClient.simulateContract({
          address: env.escrow,
          abi: escrowAbi,
          functionName,
          args,
          value,
          account,
        } as never)
        const hash = await client.writeContract({ ...(request as object), account, chain: client.chain } as never)
        setTx({ progress: 'broadcast', hash })
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        setTx({ progress: receipt.status === 'success' ? 'included' : 'reverted', hash })
        void w.refreshBalance()
        return receipt.status === 'success'
      } catch (e) {
        setTx({ progress: 'error', error: explain(e) })
        return false
      }
    },
    [w],
  )

  /** Deposit the exact on-chain entry amount. `expectedStakeWei` is what the player confirmed on screen. */
  const join = useCallback(
    async (matchId: Hex, expectedStakeWei: bigint, proof: Hex[] = []) => {
      const m = await publicClient.readContract({ address: env.escrow, abi: escrowAbi, functionName: 'getMatch', args: [matchId] })
      if (m.status !== MatchStatus.CREATED && m.status !== MatchStatus.FUNDED) {
        setTx({ progress: 'error', error: 'This lobby is not accepting entries.' })
        return false
      }
      if (m.entryAmount !== expectedStakeWei) {
        // The amount shown to the player must equal what the contract will take. Refuse otherwise.
        setTx({ progress: 'error', error: 'Stake shown does not match the lobby contract. Please reload.' })
        return false
      }
      return run('joinMatch', [matchId, proof], m.entryAmount)
    },
    [run],
  )

  const leave = useCallback((matchId: Hex) => run('leaveMatch', [matchId]), [run])
  const claimRefund = useCallback((matchId: Hex) => run('claimRefund', [matchId]), [run])
  const claim = useCallback(() => run('claim', []), [run])

  return { tx, join, leave, claimRefund, claim, reset: () => setTx(null) }
}
