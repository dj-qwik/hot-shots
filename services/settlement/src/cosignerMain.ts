/**
 * One independent result co-signer. Run 2+ of these, each on separate infrastructure with its own
 * key and RPC provider, and register their addresses in the escrow signer set.
 *   PORT=8701 COSIGNER_PRIVATE_KEY=... node src/cosignerMain.ts
 */
import { loadConfig, readDevPrivateKey } from './config.ts'
import { devAccount } from './keys.ts'
import { EscrowClient } from './escrowClient.ts'
import { cosignerServer } from './http.ts'

const cfg = loadConfig(process.env, 'cosigner')
const account = devAccount(readDevPrivateKey(process.env, 'COSIGNER_PRIVATE_KEY', cfg.chainId))
const escrow = new EscrowClient(cfg.chainId, cfg.rpcUrl, cfg.escrowAddress) // read-only
await escrow.assertChain()

const port = Number(process.env.PORT ?? 8701)
cosignerServer(escrow, account, cfg.cosignerAuthToken).listen(port, () =>
  console.log(`co-signer ${account.address} listening on :${port}`),
)
