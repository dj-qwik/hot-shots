import {
  type Account,
  type Address,
  type Chain,
  type Hash,
  type Hex,
  type PublicClient,
  type Transport,
  type WalletClient,
  createPublicClient,
  createWalletClient,
  http,
} from 'viem'
import { escrowAbi, getChain, sortAddresses, type SupportedChainId, MatchStatus } from '@hotshots/shared'

export interface OnchainMatch {
  status: MatchStatus
  capacity: number
  playerCount: number
  refundsRemaining: number
  disputeWindow: number
  admissionDeadline: bigint
  resultDeadline: bigint
  resultSubmittedAt: bigint
  entryAmount: bigint
  resultNonce: number
  winner: Address
  configHash: Hex
  allowlistRoot: Hex
  rosterHash: Hex
  resultHash: Hex
}

/**
 * Thin, typed wrapper over HotShotsEscrow. Every write is simulated first so a stale state or
 * revert is caught before spending gas, and every method is safe to retry (the contract rejects
 * duplicates; callers re-read state before acting).
 */
export class EscrowClient {
  readonly chain: Chain
  readonly pub: PublicClient<Transport, Chain>
  readonly wallet: WalletClient<Transport, Chain, Account> | undefined

  readonly chainId: SupportedChainId
  readonly address: Address

  constructor(chainId: SupportedChainId, rpcUrl: string, address: Address, account?: Account) {
    this.chainId = chainId
    this.address = address
    this.chain = getChain(chainId, rpcUrl)
    this.pub = createPublicClient({ chain: this.chain, transport: http(rpcUrl) }) as PublicClient<Transport, Chain>
    this.wallet = account
      ? createWalletClient({ chain: this.chain, transport: http(rpcUrl), account })
      : undefined
  }

  /** Guards against pointing a mainnet config at the wrong RPC (or vice versa). */
  async assertChain(): Promise<void> {
    const id = await this.pub.getChainId()
    if (id !== this.chainId) throw new Error(`RPC is chain ${id}, expected ${this.chainId}`)
    const onchain = await this.pub.readContract({ address: this.address, abi: escrowAbi, functionName: 'SUPPORTED_CHAIN_ID' })
    if (onchain !== BigInt(this.chainId)) throw new Error(`escrow deployed for chain ${onchain}`)
  }

  async getMatch(matchId: Hex): Promise<OnchainMatch> {
    const m = await this.pub.readContract({ address: this.address, abi: escrowAbi, functionName: 'getMatch', args: [matchId] })
    return { ...m, status: m.status as MatchStatus }
  }

  getPlayers(matchId: Hex): Promise<readonly Address[]> {
    return this.pub.readContract({ address: this.address, abi: escrowAbi, functionName: 'getPlayers', args: [matchId] })
  }

  signerSetVersion(): Promise<bigint> {
    return this.pub.readContract({ address: this.address, abi: escrowAbi, functionName: 'signerSetVersion' })
  }

  signerThreshold(): Promise<number> {
    return this.pub.readContract({ address: this.address, abi: escrowAbi, functionName: 'signerThreshold' })
  }

  async refundClaimed(matchId: Hex, player: Address): Promise<boolean> {
    return this.pub.readContract({ address: this.address, abi: escrowAbi, functionName: 'refundClaimed', args: [matchId, player] })
  }

  private requireWallet(): WalletClient<Transport, Chain, Account> {
    if (!this.wallet) throw new Error('EscrowClient constructed without an operator account')
    return this.wallet
  }

  private async send(functionName: string, args: readonly unknown[]): Promise<Hash> {
    const wallet = this.requireWallet()
    const { request } = await this.pub.simulateContract({
      address: this.address,
      abi: escrowAbi,
      functionName: functionName as never,
      args: args as never,
      account: wallet.account,
    })
    return wallet.writeContract(request as never)
  }

  createMatch(
    matchId: Hex,
    cfg: { entryAmount: bigint; capacity: number; admissionDeadline: bigint; configHash: Hex },
    allowlistRoot: Hex,
  ): Promise<Hash> {
    return this.send('createMatch', [matchId, cfg, allowlistRoot])
  }

  /**
   * Locks exactly the on-chain depositor set; the contract reads and sorts it itself, so a
   * last-moment join/leave can't make this revert. `roster` is the contract's own simulated
   * result; the authoritative copy is in the MatchLocked event once mined.
   */
  async lockMatch(matchId: Hex): Promise<{ hash: Hash; roster: Address[] }> {
    const wallet = this.requireWallet()
    const { request, result } = await this.pub.simulateContract({
      address: this.address,
      abi: escrowAbi,
      functionName: 'lockMatch',
      args: [matchId],
      account: wallet.account,
    })
    const hash = await wallet.writeContract(request as never)
    return { hash, roster: sortAddresses(result) }
  }

  submitResult(matchId: Hex, winner: Address, resultHash: Hex, signatures: Hex[]): Promise<Hash> {
    return this.send('submitResult', [matchId, winner, resultHash, signatures])
  }

  finalizeSettlement(matchId: Hex): Promise<Hash> {
    return this.send('finalizeSettlement', [matchId])
  }

  abortMatch(matchId: Hex): Promise<Hash> {
    return this.send('abortMatch', [matchId])
  }

  claimRefundFor(matchId: Hex, player: Address): Promise<Hash> {
    return this.send('claimRefundFor', [matchId, player])
  }
}
