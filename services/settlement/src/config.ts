import { type Address, type Hex, getAddress, isAddress, isHex } from 'viem'
import { isSupportedChainId, ROBINHOOD_MAINNET_ID, type SupportedChainId } from '@hotshots/shared'

export interface SettlementConfig {
  chainId: SupportedChainId
  rpcUrl: string
  escrowAddress: Address
  /** Block the escrow was deployed at; indexer starts here on first run. */
  escrowDeployBlock: bigint
  databaseUrl: string | undefined
  /** Co-signer endpoints that independently verify and sign results (m-of-n). */
  cosignerUrls: string[]
  /** Shared secret the coordinator presents to co-signers (mTLS recommended in production). */
  cosignerAuthToken: string
  pollIntervalMs: number
  /** Blocks behind head the indexer treats as stable enough to record (soft); finality tracked separately. */
  indexerLagBlocks: bigint
}

function req(env: NodeJS.ProcessEnv, key: string): string {
  const v = env[key]
  if (!v) throw new Error(`missing required env ${key}`)
  return v
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  role: 'coordinator' | 'cosigner' = 'coordinator',
): SettlementConfig {
  const chainId = Number(req(env, 'CHAIN_ID'))
  if (!isSupportedChainId(chainId)) throw new Error(`CHAIN_ID ${chainId} is not Robinhood Chain (4663/46630)`)
  const escrow = req(env, 'ESCROW_ADDRESS')
  if (!isAddress(escrow)) throw new Error('ESCROW_ADDRESS invalid')
  const cosignerUrls = (env.COSIGNER_URLS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (role === 'coordinator' && chainId === ROBINHOOD_MAINNET_ID && cosignerUrls.length < 2) {
    throw new Error('mainnet requires at least 2 independent co-signers (COSIGNER_URLS)')
  }
  return {
    chainId,
    rpcUrl: req(env, 'RPC_URL'),
    escrowAddress: getAddress(escrow),
    escrowDeployBlock: BigInt(env.ESCROW_DEPLOY_BLOCK ?? '0'),
    databaseUrl: env.DATABASE_URL,
    cosignerUrls,
    cosignerAuthToken: req(env, 'COSIGNER_AUTH_TOKEN'),
    pollIntervalMs: Number(env.POLL_INTERVAL_MS ?? 2000),
    indexerLagBlocks: BigInt(env.INDEXER_LAG_BLOCKS ?? '0'),
  }
}

/**
 * Private keys are only ever read server-side. For testnet/dev a raw key from the environment is
 * accepted; on mainnet this refuses and you must wire a KMS/HSM-backed signer (see keys.ts).
 */
export function readDevPrivateKey(env: NodeJS.ProcessEnv, key: string, chainId: SupportedChainId): Hex {
  if (chainId === ROBINHOOD_MAINNET_ID && env.ALLOW_RAW_KEYS_ON_MAINNET !== 'i-understand') {
    throw new Error(`${key}: raw private keys are disabled on mainnet; use a KMS-backed signer`)
  }
  const v = req(env, key)
  if (!isHex(v) || v.length !== 66) throw new Error(`${key} must be a 32-byte hex private key`)
  return v
}
