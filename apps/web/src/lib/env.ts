import { type Address, getAddress, isAddress } from 'viem'
import { getChain, isSupportedChainId, type SupportedChainId } from '@hotshots/shared'

function need(key: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key]
  if (!v) throw new Error(`Missing ${key} in apps/web/.env`)
  return v
}

const chainIdRaw = Number(need('VITE_CHAIN_ID'))
if (!isSupportedChainId(chainIdRaw)) throw new Error('VITE_CHAIN_ID must be 4663 or 46630')
const escrowRaw = need('VITE_ESCROW_ADDRESS')
if (!isAddress(escrowRaw)) throw new Error('VITE_ESCROW_ADDRESS invalid')

export const env = {
  privyAppId: need('VITE_PRIVY_APP_ID'),
  privyClientId: (import.meta.env as Record<string, string | undefined>).VITE_PRIVY_CLIENT_ID,
  chainId: chainIdRaw as SupportedChainId,
  rpcUrl: need('VITE_RPC_URL'),
  escrow: getAddress(escrowRaw) as Address,
  escrowDeployBlock: BigInt((import.meta.env as Record<string, string | undefined>).VITE_ESCROW_DEPLOY_BLOCK ?? '0'),
  apiUrl: need('VITE_API_URL'),
  supportUrl: (import.meta.env as Record<string, string | undefined>).VITE_SUPPORT_URL ?? '#',
}

export const chain = getChain(env.chainId, env.rpcUrl)
