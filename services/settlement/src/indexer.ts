import { type Hex, type Log, parseEventLogs } from 'viem'
import { escrowAbi } from '@hotshots/shared'
import type { EscrowClient } from './escrowClient.ts'
import type { EscrowLedgerEntry, Ledger } from './ledger.ts'

const REORG_REWIND = 64n
const MAX_RANGE = 5_000n

/**
 * Polls escrow logs into the ledger. Idempotent (entries keyed by txHash:logIndex) and reorg-aware:
 * if the stored cursor block hash is no longer canonical, it rewinds and re-indexes.
 */
export class EscrowIndexer {
  private readonly escrow: EscrowClient
  private readonly ledger: Ledger
  private readonly startBlock: bigint
  private readonly lagBlocks: bigint

  constructor(
    escrow: EscrowClient,
    ledger: Ledger,
    startBlock: bigint,
    lagBlocks: bigint = 0n,
  ) {
    this.escrow = escrow
    this.ledger = ledger
    this.startBlock = startBlock
    this.lagBlocks = lagBlocks
  }

  async tick(): Promise<{ from: bigint; to: bigint; entries: number; touched: Hex[] } | null> {
    const pub = this.escrow.pub
    const head = (await pub.getBlockNumber({ cacheTime: 0 })) - this.lagBlocks
    let cursor = await this.ledger.getCursor()

    if (cursor) {
      const blk = await pub.getBlock({ blockNumber: cursor.block }).catch(() => null)
      if (!blk || blk.hash !== cursor.hash) {
        const rewindTo = cursor.block > REORG_REWIND ? cursor.block - REORG_REWIND : this.startBlock
        await this.ledger.deleteEntriesFrom(rewindTo)
        await this.ledger.appendAudit({
          actor: 'indexer',
          event: 'reorg_rewind',
          matchId: null,
          payload: { from: cursor.block, to: rewindTo },
        })
        cursor = rewindTo > this.startBlock ? { block: rewindTo - 1n, hash: (await pub.getBlock({ blockNumber: rewindTo - 1n })).hash } : null
      }
    }

    const from = cursor ? cursor.block + 1n : this.startBlock
    if (from > head) return null
    const to = head - from > MAX_RANGE ? from + MAX_RANGE : head

    const logs = await pub.getLogs({ address: this.escrow.address, fromBlock: from, toBlock: to })
    const entries = toEntries(logs)
    await this.ledger.upsertEntries(entries)
    const toBlock = await pub.getBlock({ blockNumber: to })
    await this.ledger.setCursor(to, toBlock.hash)
    return { from, to, entries: entries.length, touched: matchesNeedingWork(logs) }
  }
}

export function toEntries(logs: Log[]): EscrowLedgerEntry[] {
  const parsed = parseEventLogs({ abi: escrowAbi, logs })
  const out: EscrowLedgerEntry[] = []
  for (const l of parsed) {
    const base = {
      txHash: l.transactionHash!,
      logIndex: l.logIndex!,
      blockNumber: l.blockNumber!,
      blockHash: l.blockHash!,
    }
    switch (l.eventName) {
      case 'PlayerJoined':
        out.push({ ...base, matchId: l.args.matchId, kind: 'deposit', account: l.args.player, amountWei: l.args.amount, escrowDeltaWei: l.args.amount })
        break
      case 'PlayerLeft':
        out.push({ ...base, matchId: l.args.matchId, kind: 'leave', account: l.args.player, amountWei: l.args.amount, escrowDeltaWei: -l.args.amount })
        break
      case 'RefundIssued':
        out.push({ ...base, matchId: l.args.matchId, kind: 'refund', account: l.args.player, amountWei: l.args.amount, escrowDeltaWei: -l.args.amount })
        break
      case 'MatchSettled': {
        const pot = l.args.championAmount + l.args.houseAmount
        out.push({ ...base, matchId: l.args.matchId, kind: 'settled', account: l.args.champion, amountWei: pot, escrowDeltaWei: -pot })
        break
      }
      case 'PaymentCredited':
        // A push failed; funds moved from escrow accounting to a pull balance. Not tied to a match id.
        out.push({ ...base, matchId: ZERO, kind: 'credit', account: l.args.to, amountWei: l.args.amount, escrowDeltaWei: 0n })
        break
      case 'Claimed':
        out.push({ ...base, matchId: ZERO, kind: 'claim', account: l.args.account, amountWei: l.args.amount, escrowDeltaWei: 0n })
        break
      default:
        break
    }
  }
  return out
}

/** Matches whose on-chain state now needs the settlement worker (locked, result posted, aborted). */
export function matchesNeedingWork(logs: Log[]): Hex[] {
  const ids = new Set<Hex>()
  for (const l of parseEventLogs({ abi: escrowAbi, logs })) {
    if (l.eventName === 'MatchLocked' || l.eventName === 'ResultSubmitted' || l.eventName === 'MatchAborted' || l.eventName === 'ResultVetoed') {
      ids.add(l.args.matchId)
    }
  }
  return [...ids]
}

const ZERO = `0x${'0'.repeat(64)}` as Hex
