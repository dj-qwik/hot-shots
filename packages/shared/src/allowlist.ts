import { type Address, type Hex, concat, encodeAbiParameters, getAddress, keccak256 } from 'viem'

/**
 * Private-lobby allowlist compatible with OpenZeppelin MerkleProof (sorted-pair hashing) and the
 * leaf format HotShotsEscrow.joinMatch checks: keccak256(bytes.concat(keccak256(abi.encode(addr)))).
 */
export function allowlistLeaf(addr: Address): Hex {
  return keccak256(keccak256(encodeAbiParameters([{ type: 'address' }], [getAddress(addr)])))
}

function hashPair(a: Hex, b: Hex): Hex {
  return BigInt(a) < BigInt(b) ? keccak256(concat([a, b])) : keccak256(concat([b, a]))
}

export interface Allowlist {
  root: Hex
  proofFor(addr: Address): Hex[]
}

export function buildAllowlist(addresses: readonly Address[]): Allowlist {
  if (addresses.length === 0) throw new RangeError('allowlist is empty')
  const leaves = [...new Set(addresses.map(allowlistLeaf))].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1))
  const layers: Hex[][] = [leaves]
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1]
    const next: Hex[] = []
    for (let i = 0; i < prev.length; i += 2) {
      next.push(i + 1 < prev.length ? hashPair(prev[i], prev[i + 1]) : prev[i])
    }
    layers.push(next)
  }
  return {
    root: layers[layers.length - 1][0],
    proofFor(addr) {
      let idx = leaves.indexOf(allowlistLeaf(addr))
      if (idx < 0) throw new RangeError(`${addr} not in allowlist`)
      const proof: Hex[] = []
      for (let l = 0; l < layers.length - 1; l++) {
        const sib = idx ^ 1
        if (sib < layers[l].length) proof.push(layers[l][sib])
        idx >>= 1
      }
      return proof
    },
  }
}
