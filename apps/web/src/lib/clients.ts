import { createPublicClient, http } from 'viem'
import { chain, env } from './env.ts'

/** Read-only client for balances, match state and receipts. Writes always go through the user's wallet. */
export const publicClient = createPublicClient({ chain, transport: http(env.rpcUrl) })

export function maskAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}
