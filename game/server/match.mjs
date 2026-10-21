// One match on the server: lobby → (intro → countdown → play → result) × rounds → champion.
// The server is the only authority: it runs the deterministic simulation, decides winners, and streams
// every tick's inputs (and the random draws the tick consumed) so browsers can replay it exactly.
import crypto from 'node:crypto'
import { keccak256 } from 'viem'

export const T = {
  INTRO_MS: 5000, // rules card ("5 seconds to keep things moving")
  INTRO_READY_MS: 1200, // everyone pressed Ready → start sooner
  COUNT_MS: 3000,
  DONE_MS: 2800, // winner slow-mo + result card before the next intro
  CHAMP_LINGER_MS: 45000,
  FILL_MS: 12000, // free play: fill empty seats with bots after this long
  TICK_MS: 1000 / 60,
  FRAME_EVERY: 2, // ticks per network frame (30 Hz)
  HASH_EVERY: 60, // state fingerprint once a second for desync detection
  MAX_CATCHUP: 12,
}
const JUMP = 1 << 16, DIVE = 1 << 17
const WINS_TO_CHAMPION = 2
// Round seeds come from 32 random bytes: the commitment keccak256(reveal) can't be brute-forced, and the
// simulation seed is derived from the reveal so anyone holding the replay can re-run the round.
const newSeedReveal = () => '0x' + crypto.randomBytes(32).toString('hex')
const simSeed = (reveal) => Number.parseInt(keccak256(reveal).slice(2, 10), 16) >>> 0
const BOT_NAMES = ['Zip', 'Boop', 'Kiwi', 'Mochi', 'Turbo', 'Pip', 'Nova', 'Bloop', 'Dash', 'Fizz']

export class Match {
  /**
   * @param {object} o
   * @param {string} o.id
   * @param {'free'|'cash'} o.mode
   * @param {number} o.size seats
   * @param {string} [o.stake] decimal ETH string (cash)
   * @param {(env:object)=>any} o.createSim
   * @param {(m:Match, ev:string, data?:any)=>void} [o.hook] lifecycle hook (settlement, metrics)
   */
  constructor(o) {
    Object.assign(this, { id: o.id, mode: o.mode, size: o.size, stake: o.stake || null, createSim: o.createSim, hook: o.hook || (() => {}) })
    this.seats = []
    this.state = 'lobby'
    this.createdAt = Date.now()
    this.fillAt = 0
    this.wins = []; this.roundWinners = []; this.history = []; this.roundNo = 0
    this.round = null; this.frames = []; this.pending = []; this.init = []; this.rec = []
    this.audit = [] // per round: { key, seed, active, inputs } — enough for anyone to replay and verify
    this.arenaKeys = Object.keys(o.createSim({}).ARENAS)
    this.genre = Object.fromEntries(Object.entries(o.createSim({}).ARENAS).map(([k, a]) => [k, a.genre]))
    this.names = BOT_NAMES.slice().sort(() => 0.5 - Math.random())
  }

  // ───────────── seats / lobby
  get humans() { return this.seats.filter((s) => s.kind === 'human') }
  get open() { return this.state === 'lobby' && this.seats.length < this.size }
  join(conn, profile) {
    if (!this.open) return null
    const seat = { i: this.seats.length, kind: 'human', name: profile.name, user: profile.user, wallet: profile.wallet || null, conn, connected: true, input: 0, applied: 0, pressJ: false, pressD: false, ready: false }
    this.seats.push(seat)
    if (this.mode === 'free' && !this.fillAt) this.fillAt = Date.now() + T.FILL_MS
    this.broadcastLobby()
    if (this.seats.length === this.size) this.start()
    return seat
  }
  leaveLobby(seat) {
    if (this.state !== 'lobby') return
    this.seats.splice(this.seats.indexOf(seat), 1)
    this.seats.forEach((s, k) => { s.i = k })
    if (!this.humans.length) this.close('empty')
    else this.broadcastLobby()
  }
  lobbyMsg(forSeat) {
    return { t: 'lobby', id: this.id, mode: this.mode, size: this.size, stake: this.stake, you: forSeat ? forSeat.i : -1,
      seats: this.seats.map((s) => ({ i: s.i, name: s.name, bot: s.kind === 'bot' })), fillInMs: this.fillAt ? Math.max(0, this.fillAt - Date.now()) : null }
  }
  broadcastLobby() { for (const s of this.humans) this.send(s, this.lobbyMsg(s)) }

  start() {
    // free play tops up with bots so nobody waits forever; cash matches never contain bots
    if (this.mode === 'free') while (this.seats.length < this.size) {
      this.seats.push({ i: this.seats.length, kind: 'bot', name: this.names[this.seats.length % this.names.length], skill: 0.72 + Math.random() * 0.23, speedMul: 0.95 + Math.random() * 0.05, connected: true })
    }
    this.wins = this.seats.map(() => 0)
    this.hook(this, 'start')
    for (const s of this.humans) this.send(s, this.matchMsg(s))
    this.nextRound()
  }
  matchMsg(s) {
    return { t: 'match', id: this.id, mode: this.mode, size: this.size, stake: this.stake, you: s.i,
      seats: this.seats.map((x) => ({ i: x.i, name: x.name, bot: x.kind === 'bot' })) }
  }

  // ───────────── rounds
  pickArena() {
    const recent = this.history.slice(-8), last = this.history.at(-1)
    let pool = this.arenaKeys.filter((k) => !recent.includes(k) && this.genre[k] !== this.genre[last])
    if (!pool.length) pool = this.arenaKeys.filter((k) => !recent.includes(k))
    return pool[crypto.randomInt(pool.length)]
  }
  contenders() {
    const w = this.roundWinners
    if (w.length >= 3 && new Set(w.slice(0, 3)).size === 3) return w.slice(0, 3)
    return this.seats.map((s) => s.i)
  }
  playersCfg() { return this.seats.map((s) => ({ i: s.i, name: s.name, speedMul: s.kind === 'bot' ? s.speedMul : 1, skill: s.kind === 'bot' ? s.skill : 0.85 })) }
  nextRound() {
    this.roundNo++
    const key = this.pickArena(); this.history.push(key)
    const active = this.contenders(), isFinal = active.length !== this.seats.length
    const seedReveal = newSeedReveal(), seed = simSeed(seedReveal)
    this.rec = []
    this.round = this.createSim({ seed: 1 }).createRound({ key, seed, players: this.playersCfg(), active, isFinal, botSalt: this.id }, { record: this.rec })
    this.init = this.rec.splice(0)
    this.frames = []; this.pending = []; this.lastHash = null
    this.audit.push({ n: this.roundNo, key, seedReveal, active, players: this.playersCfg().map((p) => ({ i: p.i, speedMul: p.speedMul })), inputs: [] })
    for (const s of this.humans) { s.ready = false; s.applied = 0; s.pressJ = s.pressD = false }
    this.phase('intro', T.INTRO_MS)
    this.broadcast(this.roundMsg())
  }
  roundMsg() {
    return { t: 'round', n: this.roundNo, key: this.round.key, isFinal: this.round.isFinal, active: this.round.active.map((b) => b.i),
      players: this.playersCfg().map(({ skill, ...p }) => p), init: this.init, wins: this.wins, rw: this.roundWinners, introMs: Math.max(0, this.until - Date.now()) }
  }
  phase(state, ms = 0) { this.state = state; this.until = Date.now() + ms; this.phaseAt = Date.now() }
  ready(seat) {
    if (this.state !== 'intro') return
    seat.ready = true
    const waiting = this.humans.filter((s) => s.connected && !s.ready && this.round.active.some((b) => b.i === s.i))
    if (!waiting.length && this.until - Date.now() > T.INTRO_READY_MS) { this.until = Date.now() + T.INTRO_READY_MS; this.broadcast({ t: 'intro', ms: T.INTRO_READY_MS }) }
  }

  // ───────────── the clock: called every few ms by the server loop
  pump(now) {
    if (this.state === 'lobby') { if (this.mode === 'free' && this.fillAt && now >= this.fillAt) this.start(); return }
    if (this.state === 'intro' && now >= this.until) { this.phase('count', T.COUNT_MS); this.broadcast({ t: 'count', ms: T.COUNT_MS }); return }
    if (this.state === 'count' && now >= this.until) { this.phase('play'); this.playStart = now; return }
    if (this.state === 'play') {
      const due = Math.floor((now - this.playStart) / T.TICK_MS)
      let n = 0
      while (this.state === 'play' && this.round.tick < due && n++ < T.MAX_CATCHUP) this.stepTick()
      return
    }
    if (this.state === 'done' && now >= this.until) { if (this.champion != null) this.finish(); else this.nextRound(); return }
    if (this.state === 'champ' && now >= this.until) this.close('finished')
  }
  stepTick() {
    const R = this.round, inputs = {}
    for (const b of R.active) {
      const s = this.seats[b.i]
      if (s.kind === 'bot') continue // the arena's bot plays it (server-side RNG stream); result is broadcast
      if (!s.connected) { inputs[b.i] = 0x8080; s.applied = 0x8080; continue } // disconnected: stand still
      let p = s.input
      // make quick taps count: a press that started and ended between two ticks still produces one edge
      if (s.pressJ) { if (s.applied & JUMP) p &= ~JUMP; else { p |= JUMP; s.pressJ = false } }
      if (s.pressD) { if (s.applied & DIVE) p &= ~DIVE; else { p |= DIVE; s.pressD = false } }
      inputs[b.i] = p; s.applied = p
    }
    const w = R.step(inputs)
    const row = R.active.map((b) => inputs[b.i])
    const frame = [row, this.rec.splice(0)]
    this.frames.push(frame); this.pending.push(frame); this.audit.at(-1).inputs.push(row)
    if (R.tick % T.FRAME_EVERY === 0 || w) this.flush()
    if (R.tick % T.HASH_EVERY === 0) this.broadcast({ t: 'h', k: R.tick, h: R.hash() })
    if (w) this.endRound(w)
  }
  flush() {
    if (!this.pending.length) return
    this.broadcast({ t: 'tk', k: this.round.tick - this.pending.length + 1, f: this.pending })
    this.pending = []
  }
  endRound(w) {
    this.flush()
    this.wins[w.i]++; this.roundWinners.push(w.i)
    this.champion = this.wins[w.i] >= WINS_TO_CHAMPION ? w.i : null
    this.phase('done', T.DONE_MS)
    this.broadcast({ t: 'end', n: this.roundNo, k: this.round.tick, w: w.i, h: this.round.hash(), wins: this.wins, rw: this.roundWinners, champ: this.champion })
    this.hook(this, 'round', { n: this.roundNo, winner: w.i })
  }
  finish() {
    this.phase('champ', T.CHAMP_LINGER_MS)
    this.hook(this, 'champion', { winner: this.champion })
    this.broadcast({ t: 'champ', w: this.champion, wins: this.wins, rw: this.roundWinners, rounds: this.roundNo })
  }
  close(reason) {
    if (this.state === 'closed') return
    this.state = 'closed'
    for (const s of this.humans) { this.send(s, { t: 'closed', reason }); if (s.conn) s.conn.match = null }
    this.hook(this, 'closed', { reason })
  }

  // ───────────── players' messages
  input(seat, p) {
    p = Number(p) >>> 0
    if (p & ~0x3ffff) return // only 8+8 bits of stick and 2 buttons
    if ((p & JUMP) && !(seat.input & JUMP)) seat.pressJ = true
    if ((p & DIVE) && !(seat.input & DIVE)) seat.pressD = true
    seat.input = p
  }
  disconnect(seat) {
    if (this.state === 'lobby') return this.leaveLobby(seat)
    seat.connected = false; seat.conn = null; seat.input = 0x8080
    this.broadcast({ t: 'presence', i: seat.i, on: false })
    if (!this.humans.some((s) => s.connected) && this.mode === 'free') this.close('abandoned')
  }
  reconnect(seat, conn) {
    seat.conn = conn; seat.connected = true; seat.input = 0x8080; seat.pressJ = seat.pressD = false
    this.send(seat, this.syncMsg(seat))
    this.broadcast({ t: 'presence', i: seat.i, on: true })
  }
  /** Everything a browser needs to rebuild the current moment exactly (reconnect or desync repair). */
  syncMsg(seat) {
    const base = { t: 'sync', match: this.matchMsg(seat), wins: this.wins, rw: this.roundWinners, state: this.state, msLeft: Math.max(0, this.until - Date.now()) }
    if (this.state === 'lobby') return { ...base, lobby: this.lobbyMsg(seat) }
    if (this.state === 'champ') return { ...base, champ: { w: this.champion, wins: this.wins, rw: this.roundWinners, rounds: this.roundNo } }
    return { ...base, round: this.roundMsg(), k0: 1, frames: this.frames, end: this.round.winner ? { w: this.round.winner.i, k: this.round.tick } : null }
  }

  send(seat, msg) { if (seat.conn && seat.connected) seat.conn.sendJson(msg) }
  broadcast(msg) { const s = JSON.stringify(msg); for (const x of this.humans) if (x.conn && x.connected) x.conn.sendRaw(s) }
}
