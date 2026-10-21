// End-to-end network test: starts the real server, connects headless players over real WebSockets with
// simulated latency + jitter, plays full matches, and checks that every client's replay agrees with the
// server on every round (winner + state fingerprint), including a player who drops and reconnects.
//   node tools/nettest.mjs [matches=2] [size=4] [--lat 60] [--jitter 40] [--no-reconnect]
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const args = process.argv.slice(2)
const num = (f, d) => (args.includes(f) ? +args[args.indexOf(f) + 1] : d)
const MATCHES = +(args.find((a) => /^\d+$/.test(a)) || 2)
const SIZE = +(args.filter((a) => /^\d+$/.test(a))[1] || 4)
const LAT = num('--lat', 60), JIT = num('--jitter', 40), HUMANS = num('--humans', SIZE)
process.env.PORT = String(20000 + ((Math.random() * 20000) | 0))
const { createSim, createFollower } = require(path.join(here, '..', 'dist', 'sim.cjs'))
const { default: WebSocket } = await import('ws')
await import(path.join(here, '..', 'server', 'index.mjs'))
const URL_ = `ws://127.0.0.1:${process.env.PORT}/ws`

const results = { healed: [], rounds: 0, agree: 0, desyncs: [], champs: 0, reconnects: 0, starves: 0, maxBuffer: 0 }
function player(name, opts = {}) {
  const P = { name, token: null, me: -1, ws: null, F: null, ended: new Map(), done: false, sentP: -1, rounds: 0 }
  // deliver messages after a simulated one-way delay, strictly in order (TCP never reorders)
  const q = []
  const deliver = (fn) => { const at = Math.max(q.length ? q.at(-1).at : 0, Date.now() + LAT / 2 + Math.random() * JIT); q.push({ at, fn }) }
  P.pump = setInterval(() => { const now = Date.now(); while (q.length && q[0].at <= now) q.shift().fn() }, 2)
  const send = (o) => { const s = JSON.stringify(o); deliver(() => { if (P.ws && P.ws.readyState === 1) P.ws.send(s) }) }
  function connect() {
    P.ws = new WebSocket(URL_)
    P.ws.on('open', () => send({ t: 'hello', name, token: P.token }))
    P.ws.on('message', (d) => { const m = JSON.parse(d); deliver(() => onMsg(m)) })
  }
  function onMsg(m) {
    if (m.t === 'welcome') { P.token = m.token; if (P.me < 0) send({ t: 'queue', mode: 'free', size: SIZE }) }
    else if (m.t === 'match') { P.me = m.you; P.F = createFollower({ createSim, me: P.me, onDesync: (why) => { results.healed.push(`${name} r${P.F.msg?.n} ${why}`); send({ t: 'resync' }) } }) }
    else if (m.t === 'round') { P.F.round(m); P.rounds++; setTimeout(() => send({ t: 'ready' }), Math.random() * 1500) }
    else if (m.t === 'tk') P.F.addFrames(m.k, m.f)
    else if (m.t === 'h') P.F.checkpoint(m.k, m.h)
    else if (m.t === 'end') { P.F.ended(m); P.ended.set(m.n, m) }
    else if (m.t === 'sync') { if (!P.F) P.F = createFollower({ createSim, me: m.match.you, onDesync: (why) => { results.healed.push(`${name} sync ${why}`); send({ t: 'resync' }) } }); P.me = m.match.you; P.F.sync(m); results.reconnects++ }
    else if (m.t === 'champ') { P.done = true }
    else if (m.t === 'closed') P.done = true
  }
  // play: 60 Hz follower loop + a wandering stick with occasional jumps/dives
  let last = Date.now(), dir = { x: 0, y: 0 }, held = 0
  P.loop = setInterval(() => {
    const now = Date.now(), F = P.F
    if (F && F.R) {
      F.step(F.pace(now - last))
      results.maxBuffer = Math.max(results.maxBuffer, F.buffered)
      if (F.end && F.next >= F.frames.length && P.checked !== F.msg.n) {
        P.checked = F.msg.n; results.rounds++
        const ok = !F.desync && F.R.winner && F.R.winner.i === F.end.w && F.R.hash() === F.end.h
        if (ok) results.agree++; else results.desyncs.push(`${name} r${F.msg.n}: local winner ${F.R.winner?.i} server ${F.end.w}`)
      }
    }
    last = now
    if (Math.random() < 0.03) { const a = Math.random() * 6.283; dir = Math.random() < 0.15 ? { x: 0, y: 0 } : { x: Math.cos(a), y: Math.sin(a) } }
    held = Math.random() < 0.02 ? 1 << 16 : Math.random() < 0.006 ? 1 << 17 : 0
    const q = (v) => Math.max(-127, Math.min(127, Math.round(v * 127))) + 128
    const p = q(dir.x) | (q(dir.y) << 8) | held
    if (p !== P.sentP) { P.sentP = p; send({ t: 'in', p }) }
  }, 16)
  P.drop = () => { results.reconnects += 0; P.ws.terminate(); setTimeout(connect, 1200) }
  connect()
  return P
}

for (let m = 0; m < MATCHES; m++) {
  const ps = Array.from({ length: HUMANS }, (_, i) => player(`T${m}_${i}`))
  if (!args.includes('--no-reconnect') && m === 0) setTimeout(() => ps[1].drop(), 15000) // mid-match drop + rejoin
  const t0 = Date.now()
  await new Promise((res) => { const iv = setInterval(() => { if (ps.every((p) => p.done) || Date.now() - t0 > 240e3) { clearInterval(iv); res() } }, 200) })
  ps.forEach((p) => { clearInterval(p.loop); clearInterval(p.pump); p.ws.close() })
  results.champs += ps.some((p) => p.done) ? 1 : 0
  console.log(`match ${m + 1}: ${ps[0].rounds} rounds in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
}
for (const p of []) void p
const expected = results.expected
const pass = !results.desyncs.length && results.agree === results.rounds && results.champs === MATCHES
console.log(`${pass ? 'PASS' : 'FAIL'} network: ${results.agree}/${results.rounds} client-rounds matched the server exactly · ${results.reconnects} reconnect sync(s) · latency ${LAT}±${JIT} ms · max buffer ${results.maxBuffer} ticks`)
if (results.desyncs.length) console.log(results.desyncs.slice(0, 10).join('\n'))
if (results.healed.length) console.log(`self-healed desyncs: ${results.healed.length}\n` + results.healed.slice(0, 8).join('\n'))
process.exit(pass ? 0 : 1)
