/**
 * One independent result co-signer. Run 2+ of these, each with its own key (ideally on separate
 * infrastructure), registered in the escrow signer set. Before signing it re-derives the champion from
 * chain state + the round ledger AND replays every round of the deterministic game simulation from the
 * published inputs, so a server bug or tampering can't produce a payout to the wrong wallet.
 *
 * Env: CHAIN_ID, RPC_URL, COSIGNER_AUTH_TOKEN, and either
 *   COSIGNER_SECRET (testnet: key derived from a host-generated secret) or COSIGNER_PRIVATE_KEY,
 *   ESCROW_ADDRESS (pin it on mainnet) or DIRECTOR_URL (read it from the game server's /api/config),
 *   SIM_PATH (game/dist/sim.cjs) for replay verification, STAGE_REVISION (must match the game server).
 */
import { createRequire } from 'node:module'
import path from 'node:path'
import { getAddress, isAddress, type Hex } from 'viem'
import { isSupportedChainId, ROBINHOOD_MAINNET_ID, type RoundReplay, type SimFactory } from '@hotshots/shared'
import { readDevPrivateKey } from './config.ts'
import { devAccount, derivedAccount } from './keys.ts'
import { EscrowClient } from './escrowClient.ts'
import { cosignerServer } from './http.ts'

const env = process.env
const chainId = Number(env.CHAIN_ID ?? 46630)
if (!isSupportedChainId(chainId)) throw new Error('CHAIN_ID must be 4663 or 46630')
const rpcUrl = env.RPC_URL ?? (chainId === 46630 ? 'https://rpc.testnet.chain.robinhood.com' : 'https://rpc.mainnet.chain.robinhood.com')
const token = env.COSIGNER_AUTH_TOKEN
if (!token) throw new Error('COSIGNER_AUTH_TOKEN required')
if (env.COSIGNER_SECRET && chainId === ROBINHOOD_MAINNET_ID && env.ALLOW_RAW_KEYS_ON_MAINNET !== 'i-understand') throw new Error('mainnet: use a KMS-backed co-signer key')
const account = env.COSIGNER_SECRET ? derivedAccount(env.COSIGNER_SECRET, `cosigner:${env.COSIGNER_NAME ?? 'a'}`) : devAccount(readDevPrivateKey(env, 'COSIGNER_PRIVATE_KEY', chainId))
const director = env.DIRECTOR_URL?.replace(/\/$/, '')

let escrow: EscrowClient | null = null
async function resolveEscrow(): Promise<void> {
  try {
    let addr = env.ESCROW_ADDRESS
    if (!addr && director) addr = (await (await fetch(`${director}/api/config`)).json()).cash?.escrow ?? undefined
    if (addr && isAddress(addr)) {
      const e = new EscrowClient(chainId as 4663 | 46630, rpcUrl, getAddress(addr))
      await e.assertChain()
      escrow = e
      console.log(`co-signer ${account.address}: escrow ${addr}`)
      return
    }
  } catch (e) { console.warn('escrow lookup failed:', (e as Error).message) }
  setTimeout(resolveEscrow, 20000)
}
if (chainId === ROBINHOOD_MAINNET_ID && !env.ESCROW_ADDRESS) throw new Error('mainnet: pin ESCROW_ADDRESS')

// replay verification against our own copy of the game simulation
let replay
if (env.SIM_PATH && director) {
  const require = createRequire(import.meta.url)
  const { createSim } = require(path.resolve(env.SIM_PATH)) as { createSim: SimFactory }
  replay = {
    createSim,
    stageRevision: Number(env.STAGE_REVISION ?? 1),
    fetchReplays: async (matchId: Hex): Promise<RoundReplay[] | null> => {
      const r = await fetch(`${director}/api/evidence/${matchId}`)
      return r.ok ? ((await r.json()) as { replays: RoundReplay[] }).replays : null
    },
  }
}

await resolveEscrow()
const port = Number(env.PORT ?? 8701)
cosignerServer(() => escrow, account, token, replay).listen(port, () =>
  console.log(`co-signer ${account.address} on :${port} · replay verification ${replay ? 'ON' : 'off'}`),
)
