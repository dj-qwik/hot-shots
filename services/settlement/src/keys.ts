import { type Hex, type LocalAccount, type Address, type TypedDataDefinition } from 'viem'
import { privateKeyToAccount, toAccount } from 'viem/accounts'
import { keccak256, toBytes } from 'viem'

/**
 * Server-side signing. Two roles, two separate keys, never in the browser:
 *  - Operator/relayer key: sends createMatch/lockMatch/submitResult/finalize/refund txs and pays gas.
 *    It cannot move escrowed funds anywhere except where the contract rules send them.
 *  - Result co-signer keys: one per independent co-signer process; sign EIP-712 MatchResult only.
 *
 * In production back both with a KMS/HSM. `kmsAccount` shows the shape: implement `sign` with your
 * provider (AWS KMS ECC_SECG_P256K1, GCP Cloud KMS secp256k1, Fireblocks, Turnkey, etc.).
 */
export function devAccount(privateKey: Hex): LocalAccount {
  return privateKeyToAccount(privateKey)
}

export interface RemoteSigner {
  address: Address
  /** Sign a 32-byte digest; must return a 65-byte r||s||v signature with low-s. */
  signDigest(digest: Hex): Promise<Hex>
  signTransaction(serializedUnsigned: Hex): Promise<Hex>
}

export function kmsAccount(remote: RemoteSigner): LocalAccount {
  return toAccount({
    address: remote.address,
    async signMessage() {
      throw new Error('signMessage not used by Hot Shots services')
    },
    async signTransaction(tx, opts) {
      const { serializeTransaction, keccak256, parseSignature } = await import('viem')
      const serializer = opts?.serializer ?? serializeTransaction
      const sig = parseSignature(await remote.signDigest(keccak256(await serializer(tx))))
      return serializer(tx, sig)
    },
    async signTypedData(td) {
      const { hashTypedData } = await import('viem')
      return remote.signDigest(hashTypedData(td as TypedDataDefinition))
    },
  }) as LocalAccount
}

/**
 * Testnet convenience: a key derived from a long random secret that the host generates and stores
 * (Render `generateValue: true`), so no person ever sees or pastes a private key. The same secret
 * always yields the same address. Mainnet must use a KMS/HSM signer instead (enforced by callers).
 */
export function derivedAccount(secret: string, role: string): LocalAccount {
  if (!secret || secret.length < 32) throw new Error(`${role}: secret missing or too short`)
  return privateKeyToAccount(keccak256(toBytes(`hotshots:${role}:v1:${secret}`)))
}
