import { createServer, type Server } from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import type { LocalAccount } from 'viem'
import type { MatchEvidence } from '@hotshots/shared'
import { CosignRefusal, cosign, type CosignRequest, type CosignResponse, type ReplayCheck } from './cosigner.ts'
import type { EscrowClient } from './escrowClient.ts'
import type { CosignerTransport } from './worker.ts'

const reviveBig = (_k: string, v: unknown) => v
const MAX_BODY = 256 * 1024

function authOk(header: string | undefined, token: string): boolean {
  const a = Buffer.from(header ?? '')
  const b = Buffer.from(`Bearer ${token}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** HTTP server for one co-signer process. Put it behind mTLS / private networking in production. */
export function cosignerServer(escrow: EscrowClient | (() => EscrowClient | null), account: LocalAccount, authToken: string, replay?: ReplayCheck): Server {
  return createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ signer: account.address, replayVerification: !!replay }))
      return
    }
    if (req.method !== 'POST' || req.url !== '/sign') return void res.writeHead(404).end()
    if (!authOk(req.headers.authorization, authToken)) return void res.writeHead(401).end()

    let body = ''
    for await (const chunk of req) {
      body += chunk
      if (body.length > MAX_BODY) return void res.writeHead(413).end()
    }
    try {
      const parsed = JSON.parse(body, reviveBig) as { evidence: MatchEvidence }
      const esc = typeof escrow === 'function' ? escrow() : escrow
      if (!esc) throw new CosignRefusal('escrow not known yet')
      const out = await cosign(esc, account, { evidence: parsed.evidence }, replay)
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out))
    } catch (e) {
      const status = e instanceof CosignRefusal ? 422 : 500
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify({ error: (e as Error).message }))
    }
  })
}

export function httpCosigner(url: string, authToken: string, timeoutMs = 10_000): CosignerTransport {
  return async (req: CosignRequest): Promise<CosignResponse> => {
    const r = await fetch(new URL('/sign', url), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${authToken}` },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!r.ok) throw new Error(`cosigner ${url}: ${r.status} ${await r.text()}`)
    return (await r.json()) as CosignResponse
  }
}
