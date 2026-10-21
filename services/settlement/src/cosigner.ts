import { type Address, type Hex, type LocalAccount, getAddress } from 'viem'
import {
  type MatchEvidence,
  MatchStatus,
  computeResultHash,
  matchResultTypedData,
  rosterHash,
  verifyEvidence,
} from '@hotshots/shared'
import type { EscrowClient } from './escrowClient.ts'

export interface CosignRequest {
  evidence: MatchEvidence
}

export interface CosignResponse {
  signer: Address
  winner: Address
  resultHash: Hex
  signerSetVersion: string
  signature: Hex
}

export class CosignRefusal extends Error {}

/**
 * One independent result co-signer. Each runs in its own process with its own key and RPC, and
 * signs ONLY after re-deriving everything from chain state plus the published evidence:
 *  - match is LOCKED on the expected chain/escrow
 *  - roster hash in the evidence equals the on-chain locked roster
 *  - round ledger is valid (one winner per round, champion has exactly 2 (best 2 of 3,
 *    plus a finalists-only round 4 when rounds 1–3 had three different winners),
 *    seed reveals match commitments)
 * It never takes the winner from the requester; it computes it.
 */
export async function cosign(escrow: EscrowClient, account: LocalAccount, req: CosignRequest): Promise<CosignResponse> {
  const ev = req.evidence
  if (ev.chainId !== escrow.chainId) throw new CosignRefusal('wrong chain')
  if (getAddress(ev.escrow) !== getAddress(escrow.address)) throw new CosignRefusal('wrong escrow')

  const [m, players, version] = await Promise.all([
    escrow.getMatch(ev.matchId),
    escrow.getPlayers(ev.matchId),
    escrow.signerSetVersion(),
  ])
  if (m.status !== MatchStatus.LOCKED) throw new CosignRefusal(`match not LOCKED (status ${m.status})`)
  if (m.rosterHash !== ev.rosterHash || rosterHash(players) !== m.rosterHash) {
    throw new CosignRefusal('roster hash does not match on-chain lock')
  }
  if (m.configHash !== ev.configHash) throw new CosignRefusal('config hash mismatch')

  let winner: Address
  try {
    winner = verifyEvidence(ev, players)
  } catch (e) {
    throw new CosignRefusal(`evidence invalid: ${(e as Error).message}`)
  }

  const resultHash = computeResultHash(ev)
  const signature = await account.signTypedData(
    matchResultTypedData(escrow.chainId, escrow.address, {
      matchId: ev.matchId,
      winner,
      rosterHash: m.rosterHash,
      resultHash,
      signerSetVersion: version,
      resultNonce: m.resultNonce,
    }),
  )
  return { signer: account.address, winner, resultHash, signerSetVersion: version.toString(), signature }
}
