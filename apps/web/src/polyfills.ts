// Privy's embedded-wallet signing uses Node's Buffer, which browsers don't have. Load before anything else.
import { Buffer } from 'buffer'
const g = globalThis as unknown as { Buffer?: typeof Buffer; global?: typeof globalThis }
g.Buffer ??= Buffer
g.global ??= globalThis
