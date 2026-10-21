import type { Chain, Hash, PublicClient, Transport, TransactionReceipt } from 'viem'
import type { TxProgress } from '@hotshots/shared'

export interface TxState {
  hash: Hash
  progress: TxProgress
  blockNumber?: bigint
  blockHash?: Hash
  receipt?: TransactionReceipt
}

/**
 * Determine how settled a transaction is right now. Never reports success from a broadcast hash
 * alone (spec §15).
 *
 * On an Arbitrum Orbit chain the RPC block tags mean:
 *   latest    -> sequencer has ordered it (soft confirmation, ~100ms on Robinhood Chain)
 *   safe      -> the batch containing it has been posted to Ethereum
 *   finalized -> that Ethereum block is finalized (strongest; typically tens of minutes)
 * A receipt whose block hash no longer matches the canonical chain is treated as dropped (reorg)
 * and the caller must re-derive the next action from on-chain state.
 */
export async function checkTx(pub: PublicClient<Transport, Chain>, hash: Hash): Promise<TxState> {
  let receipt: TransactionReceipt
  try {
    receipt = await pub.getTransactionReceipt({ hash })
  } catch {
    // Not yet included (or dropped). Distinguish via the mempool.
    try {
      await pub.getTransaction({ hash })
      return { hash, progress: 'broadcast' }
    } catch {
      return { hash, progress: 'dropped' }
    }
  }

  const canonical = await pub.getBlock({ blockNumber: receipt.blockNumber }).catch(() => null)
  if (!canonical || canonical.hash !== receipt.blockHash) {
    return { hash, progress: 'dropped' }
  }
  const base = { hash, receipt, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash }
  if (receipt.status === 'reverted') return { ...base, progress: 'reverted' }

  const [safe, finalized] = await Promise.all([
    pub.getBlock({ blockTag: 'safe' }).catch(() => null),
    pub.getBlock({ blockTag: 'finalized' }).catch(() => null),
  ])
  if (finalized && finalized.number !== null && finalized.number >= receipt.blockNumber) {
    return { ...base, progress: 'finalized' }
  }
  if (safe && safe.number !== null && safe.number >= receipt.blockNumber) {
    return { ...base, progress: 'safe' }
  }
  return { ...base, progress: 'included' }
}

export const isTerminal = (p: TxProgress) => p === 'finalized' || p === 'reverted' || p === 'dropped'
