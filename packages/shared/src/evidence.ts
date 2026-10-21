import {
  type Address,
  type Hex,
  concat,
  encodeAbiParameters,
  getAddress,
  keccak256,
  pad,
  stringToHex,
} from 'viem'
import { championFromRounds } from './matchRules.ts'

/** Deterministic on-chain match id for a lobby. */
export function matchIdFromLobby(lobbyId: string): Hex {
  return keccak256(stringToHex(`hotshots:match:${lobbyId}`))
}

/** Hash of the off-chain rules a lobby was created under (stored on-chain as configHash). */
export function configHash(cfg: {
  rulesVersion: string
  stakeTierWei: bigint
  capacity: number
  region: string
  stagePoolVersion: string
}): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'string' },
        { type: 'uint256' },
        { type: 'uint8' },
        { type: 'string' },
        { type: 'string' },
      ],
      [cfg.rulesVersion, cfg.stakeTierWei, cfg.capacity, cfg.region, cfg.stagePoolVersion],
    ),
  )
}

export function sortAddresses(addrs: readonly Address[]): Address[] {
  return [...addrs]
    .map((a) => getAddress(a))
    .sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0))
}

/** Must equal keccak256(abi.encodePacked(address[] sortedRoster)) in the contract (32-byte padded). */
export function rosterHash(roster: readonly Address[]): Hex {
  const sorted = sortAddresses(roster)
  return keccak256(concat(sorted.map((a) => pad(a, { size: 32 }))))
}

export interface RoundRecord {
  round: number // 1-based
  stageId: number // 1..50
  stageRevision: number // immutable stage revision used (spec §9)
  seedCommitment: Hex // keccak256(seedReveal), published before the round
  seedReveal: Hex // revealed after the round
  winner: Address
  scoreEvidenceHash: Hex // hash of signed score events / telemetry for this round
}

export interface MatchEvidence {
  chainId: number
  escrow: Address
  matchId: Hex
  rosterHash: Hex
  configHash: Hex
  rounds: RoundRecord[]
}

const roundTuple = {
  type: 'tuple[]',
  components: [
    { name: 'round', type: 'uint16' },
    { name: 'stageId', type: 'uint16' },
    { name: 'stageRevision', type: 'uint32' },
    { name: 'seedCommitment', type: 'bytes32' },
    { name: 'seedReveal', type: 'bytes32' },
    { name: 'winner', type: 'address' },
    { name: 'scoreEvidenceHash', type: 'bytes32' },
  ],
} as const

/** resultHash committed on-chain. Anyone holding the published evidence can recompute it. */
export function computeResultHash(e: MatchEvidence): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'uint256' },
        { type: 'address' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'bytes32' },
        roundTuple,
      ],
      [
        BigInt(e.chainId),
        e.escrow,
        e.matchId,
        e.rosterHash,
        e.configHash,
        e.rounds.map((r) => ({
          round: r.round,
          stageId: r.stageId,
          stageRevision: r.stageRevision,
          seedCommitment: r.seedCommitment,
          seedReveal: r.seedReveal,
          winner: r.winner,
          scoreEvidenceHash: r.scoreEvidenceHash,
        })),
      ],
    ),
  )
}

export class EvidenceError extends Error {}

/**
 * Independent verification a co-signer runs before signing. Returns the champion.
 * Each signer should run this on its own copy of the round ledger.
 */
export function verifyEvidence(e: MatchEvidence, roster: readonly Address[]): Address {
  if (rosterHash(roster) !== e.rosterHash) throw new EvidenceError('roster hash mismatch')
  e.rounds.forEach((r, i) => {
    if (r.round !== i + 1) throw new EvidenceError(`round numbering broken at index ${i}`)
    if (r.stageId < 1 || r.stageId > 50) throw new EvidenceError(`round ${r.round}: bad stage id`)
    if (keccak256(r.seedReveal) !== r.seedCommitment) {
      throw new EvidenceError(`round ${r.round}: seed reveal does not match commitment`)
    }
  })
  try {
    return championFromRounds(
      e.rounds.map((r) => r.winner),
      roster,
    )
  } catch (err) {
    throw new EvidenceError((err as Error).message)
  }
}

// ───────────── EIP-712 (must match HotShotsEscrow.MATCH_RESULT_TYPEHASH) ─────────────

export const matchResultTypes = {
  MatchResult: [
    { name: 'matchId', type: 'bytes32' },
    { name: 'winner', type: 'address' },
    { name: 'rosterHash', type: 'bytes32' },
    { name: 'resultHash', type: 'bytes32' },
    { name: 'signerSetVersion', type: 'uint64' },
    { name: 'resultNonce', type: 'uint32' },
  ],
} as const

export interface MatchResultMessage {
  matchId: Hex
  winner: Address
  rosterHash: Hex
  resultHash: Hex
  signerSetVersion: bigint
  /** Per-match counter bumped on every guardian veto; vetoed signatures can't be replayed. */
  resultNonce: number
}

export function matchResultTypedData(chainId: number, escrow: Address, message: MatchResultMessage) {
  return {
    domain: { name: 'HotShotsEscrow', version: '1', chainId, verifyingContract: escrow },
    types: matchResultTypes,
    primaryType: 'MatchResult' as const,
    message,
  }
}
