// Regenerates packages/shared/src/escrowAbi.ts from the Foundry build output.
import { readFileSync, writeFileSync } from 'node:fs'
const { abi } = JSON.parse(readFileSync('contracts/out/HotShotsEscrow.sol/HotShotsEscrow.json', 'utf8'))
writeFileSync(
  'packages/shared/src/escrowAbi.ts',
  `// Generated from contracts/out/HotShotsEscrow.sol/HotShotsEscrow.json — run \`npm run abi\` after contract changes.\nexport const escrowAbi = ${JSON.stringify(abi, null, 1)} as const\n`,
)
console.log('wrote packages/shared/src/escrowAbi.ts')
