// Hot Shots game server: serves the web client and runs every online match over WebSockets.
//   PORT (Render sets it) · WEB_DIR (built client, default ../dist-web) · SIM (default ../dist/sim.cjs)
//   ALLOWED_ORIGINS (comma list; default: same host) · LOG_LEVEL
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { Match, T } from './match.mjs'
import { verifyMessage, getAddress, isAddress, parseEther, formatEther } from 'viem'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { createSim } = require(path.resolve(process.env.SIM || path.join(here, '..', 'dist', 'sim.cjs')))
const WEB_DIR = path.resolve(process.env.WEB_DIR || path.join(here, '..', 'dist-web'))
const PORT = +(process.env.PORT || 8080)
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
const FREE_SIZES = [2, 4, 6, 8]
const log = (...a) => console.log(new Date().toISOString(), ...a)

// ───────────── static web client
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }
function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x')
  if (url.pathname.startsWith('/api/')) return api(url, res)
  if (url.pathname === '/healthz') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true, matches: matches.size, players: conns.size, uptime: process.uptime() | 0 })) }
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  if (p.endsWith('/')) p += 'index.html'
  let file = path.join(WEB_DIR, p)
  if (!file.startsWith(WEB_DIR)) { res.writeHead(403); return res.end() }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(WEB_DIR, 'index.html') // SPA fallback
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('client not built') }
  const ext = path.extname(file)
  const gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '') && /\.(html|js|css|json|svg)$/.test(ext)
  const headers = {
    'content-type': TYPES[ext] || 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()', vary: 'accept-encoding',
  }
  if (gz) { headers['content-encoding'] = 'gzip'; res.writeHead(200, headers); return res.end(gzipped(file)) }
  res.writeHead(200, headers)
  fs.createReadStream(file).pipe(res)
}
const gzCache = new Map() // file → { mtime, buf }: compress each asset once
function gzipped(file) {
  const m = fs.statSync(file).mtimeMs, c = gzCache.get(file)
  if (c && c.m === m) return c.buf
  const buf = zlib.gzipSync(fs.readFileSync(file), { level: 9 }); gzCache.set(file, { m, buf }); return buf
}
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(obj)) }
async function api(url, res) {
  try {
    if (url.pathname === '/api/config') return json(res, 200, { cash: cash ? cash.publicConfig() : { enabled: false, status: 'off' }, privyAppId: process.env.PRIVY_APP_ID || null })
    const ev = url.pathname.match(/^\/api\/evidence\/(0x[0-9a-fA-F]{64})$/)
    if (ev && cash) { const e = await cash.getEvidence(ev[1]); return e ? json(res, 200, e) : json(res, 404, { error: 'not found' }) }
    const st = url.pathname.match(/^\/api\/match\/(0x[0-9a-fA-F]{64})$/)
    if (st && cash && cash.status === 'ready') return json(res, 200, await cash.matchStatus(st[1]))
    return json(res, 404, { error: 'not found' })
  } catch (e) { return json(res, 500, { error: e.message }) }
}
const server = http.createServer(serveStatic)

// ───────────── matchmaking
const matches = new Map() // id → Match
const sessions = new Map() // token → { user, name, seat, match }
const conns = new Set()
function findOrCreate(mode, size, stake) {
  for (const m of matches.values()) if (m.mode === mode && m.size === size && m.stake === stake && m.open) return m
  const m = new Match({ id: crypto.randomUUID(), mode, size, stake, createSim, hook: onMatch })
  matches.set(m.id, m)
  return m
}
function onMatch(m, ev, data) {
  if (ev === 'start') log('match start', m.id.slice(0, 8), m.mode, m.size, m.seats.map((s) => s.name).join(','))
  if (ev === 'champion') {
    log('match champion', m.id.slice(0, 8), m.seats[data.winner].name, 'rounds', m.roundNo)
    if (m.mode === 'cash' && cash) cash.publishEvidence(m.lobby, m).catch((e) => log('evidence error', e))
  }
  if (ev === 'closed') {
    matches.delete(m.id)
    for (const [tok, s] of sessions) if (s.match === m) { s.match = null; s.seat = null }
  }
}

// ───────────── real-money matches (enabled when the operator secret is configured)
let cash = null
if (process.env.OPERATOR_SECRET) {
  const { createCash } = await import('./cash.mjs')
  cash = await createCash({
    createMatch: (L) => startCashMatch(L),
    onLobbyChange: (L) => { for (const [w, c] of L.waiting) c.sendJson(cash.lobbyView(L, w)) },
  })
  cash.start()
}
function startCashMatch(L) {
  const m = new Match({ id: L.lobbyId, mode: 'cash', size: L.size, stake: formatEther(L.stakeWei), createSim, hook: onMatch })
  m.lobby = L
  m.seats = L.roster.map((wallet, i) => {
    const c = L.waiting.get(wallet.toLowerCase())
    const sess = c?.session
    const seat = { i, kind: 'human', name: sess?.name || wallet.slice(0, 6) + '…' + wallet.slice(-4), wallet, conn: c || null, connected: !!c, input: 0x8080, applied: 0, pressJ: false, pressD: false, ready: false }
    if (c) { c.match = m; c.seat = seat; if (sess) { sess.match = m; sess.seat = seat } }
    return seat
  })
  matches.set(m.id, m)
  m.start()
  return m
}

// ───────────── WebSockets
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 })
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin || ''
  const host = req.headers.host || ''
  let sameHost = true; try { sameHost = !origin || new URL(origin).host === host } catch { sameHost = false }
  if (ORIGINS.length ? (origin && !ORIGINS.includes(origin)) : !sameHost) { ws.close(1008, 'origin'); return }
  const conn = {
    ws, session: null, match: null, seat: null, budget: 120, lastMsg: Date.now(),
    sendRaw: (s) => { if (ws.readyState === 1 && ws.bufferedAmount < 2e6) ws.send(s) },
    sendJson: (o) => conn.sendRaw(JSON.stringify(o)),
  }
  conns.add(conn)
  ws.on('message', (data, isBinary) => {
    // simple flood guard: ~120 messages/s sustained, then drop the connection
    conn.budget = Math.min(240, conn.budget + (Date.now() - conn.lastMsg) * 0.12); conn.lastMsg = Date.now()
    if (--conn.budget < 0) { ws.close(1008, 'rate'); return }
    if (isBinary) return
    let m; try { m = JSON.parse(data) } catch { return }
    if (!m || typeof m.t !== 'string') return
    try { handle(conn, m) } catch (e) { log('handler error', e) }
  })
  ws.on('close', () => {
    conns.delete(conn)
    if (conn.match && conn.seat && conn.seat.conn === conn) {
      const lobby = conn.match.state === 'lobby'
      conn.match.disconnect(conn.seat)
      if (lobby && conn.session) { conn.session.match = null; conn.session.seat = null } // lobby seats are given up on disconnect
    }
  })
})

const cleanName = (s) => String(s || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 14) || 'Player'
function handle(conn, m) {
  switch (m.t) {
    case 'hello': {
      // resume a session (reconnect after a dropped connection / page reload) or start a new guest one
      let tok = typeof m.token === 'string' && sessions.has(m.token) ? m.token : null
      if (!tok) { tok = crypto.randomBytes(18).toString('base64url'); sessions.set(tok, { user: 'guest:' + tok.slice(0, 8), name: cleanName(m.name), match: null, seat: null }) }
      const s = sessions.get(tok); s.name = cleanName(m.name || s.name)
      conn.session = s
      s.nonce = crypto.randomBytes(12).toString('hex')
      conn.sendJson({ t: 'welcome', token: tok, name: s.name, sizes: FREE_SIZES, tick: T.TICK_MS, nonce: s.nonce, wallet: s.wallet || null, cash: cash ? cash.publicConfig() : null })
      if (s.match && s.seat && s.match.state !== 'closed') {
        if (s.seat.conn && s.seat.conn !== conn) s.seat.conn.ws.close(4000, 'replaced')
        conn.match = s.match; conn.seat = s.seat
        if (s.match.state === 'lobby') { s.seat.conn = conn; s.seat.connected = true; conn.sendJson(s.match.lobbyMsg(s.seat)) }
        else s.match.reconnect(s.seat, conn)
      }
      return
    }
    case 'ping': return conn.sendJson({ t: 'pong', c: m.c })
  }
  if (m.t === 'auth') return void auth(conn, m)
  if (!conn.session) return
  const S = conn.session
  switch (m.t) {
    case 'queue': {
      if (conn.match && conn.match.state !== 'closed') return
      const size = FREE_SIZES.includes(+m.size) ? +m.size : 4
      if (m.mode === 'cash') return void queueCash(conn, m)
      if (m.mode !== 'free') return
      const match = findOrCreate('free', size, null)
      const seat = match.join(conn, { name: S.name, user: S.user })
      if (!seat) return conn.sendJson({ t: 'error', code: 'full', msg: 'That lobby just filled. Try again.' })
      conn.match = match; conn.seat = seat; S.match = match; S.seat = seat
      return
    }
    case 'leaveCash': { if (conn.cashLobby) { conn.cashLobby.waiting.delete(S.wallet?.toLowerCase()); conn.cashLobby = null } return conn.sendJson({ t: 'left' }) }
    case 'leave': {
      if (conn.match) { conn.match.disconnect(conn.seat) }
      conn.match = null; conn.seat = null; S.match = null; S.seat = null
      return conn.sendJson({ t: 'left' })
    }
    case 'in': if (conn.match && conn.seat) conn.match.input(conn.seat, m.p); return
    case 'ready': if (conn.match && conn.seat) conn.match.ready(conn.seat); return
    case 'resync': if (conn.match && conn.seat) conn.sendJson(conn.match.syncMsg(conn.seat)); return
  }
}

// ───────────── wallet sign-in + cash queue
const signInMessage = (address, nonce, chainId) => `Sign in to Hot Shots\n\nWallet: ${address}\nNonce: ${nonce}\nChain: ${chainId}\n\nThis only proves you own this wallet. It costs nothing and moves no funds.`
async function auth(conn, m) {
  const S = conn.session
  if (!S || !cash || !isAddress(m.address || '') || typeof m.sig !== 'string') return conn.sendJson({ t: 'authFail', msg: 'Sign-in is not available.' })
  const address = getAddress(m.address)
  let ok = false
  try { ok = await verifyMessage({ address, message: signInMessage(address, S.nonce, cash.chainId), signature: m.sig }) } catch {}
  if (!ok) try { ok = await cash.pub.verifyMessage({ address, message: signInMessage(address, S.nonce, cash.chainId), signature: m.sig }) } catch {} // smart-contract wallets
  S.nonce = crypto.randomBytes(12).toString('hex') // single use
  if (!ok) return conn.sendJson({ t: 'authFail', msg: 'Signature did not match that wallet.', nonce: S.nonce })
  S.wallet = address; S.user = 'wallet:' + address
  conn.sendJson({ t: 'authOk', wallet: address, nonce: S.nonce })
  // back into a running cash match by wallet (e.g. a new device)
  for (const mt of matches.values()) if (mt.mode === 'cash' && mt.state !== 'closed') {
    const seat = mt.seats.find((x) => x.wallet && x.wallet.toLowerCase() === address.toLowerCase())
    if (seat && seat.conn !== conn) { conn.match = mt; conn.seat = seat; S.match = mt; S.seat = seat; seat.name = S.name || seat.name; mt.reconnect(seat, conn) }
  }
}
async function queueCash(conn, m) {
  const S = conn.session
  if (!cash || cash.status !== 'ready') return conn.sendJson({ t: 'error', code: 'cash', msg: 'Real-money play is still being set up on this server.' })
  if (!S.wallet) return conn.sendJson({ t: 'error', code: 'auth', msg: 'Sign in with your wallet first.' })
  let stakeWei; try { stakeWei = parseEther(String(m.stake)) } catch { return }
  const cfg = cash.publicConfig()
  if (!cfg.tiers.includes(formatEther(stakeWei)) || !cfg.sizes.includes(+m.size)) return conn.sendJson({ t: 'error', code: 'tier', msg: 'Pick one of the listed stakes and lobby sizes.' })
  const L = await cash.findOrOpen(stakeWei, +m.size)
  L.waiting.set(S.wallet.toLowerCase(), conn); conn.cashLobby = L
  conn.sendJson(cash.lobbyView(L, S.wallet))
}

// ───────────── the clock: every match advances on one fixed timeline
setInterval(() => { const now = Date.now(); for (const m of matches.values()) { try { m.pump(now) } catch (e) { log('match error', m.id, e); m.close('error') } } }, 4)
// forget idle guest sessions after an hour
setInterval(() => { for (const [tok, s] of sessions) if (!s.match && ![...conns].some((c) => c.session === s)) sessions.delete(tok) }, 3600e3)

server.listen(PORT, () => log(`hot shots server on :${PORT} · web ${WEB_DIR} · arenas ${Object.keys(createSim({}).ARENAS).length}`))
export { server, matches }
