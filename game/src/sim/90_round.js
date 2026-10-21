// ───────────────────────── ROUND: the one step function the server and every browser run ─────────────────────────
// A round is fully determined by (arena key, seed, roster, inputs per tick). The server runs it to decide
// winners; browsers run the identical code on the server's input stream to draw it.
const DT = 1 / 60;
// One input = one integer: x and y in -127..127 (stick), bit 16 = jump held, bit 17 = dive held.
function packInput(inp) {
  const q = (v) => clamp(Math.round((v || 0) * 127), -127, 127) + 128;
  return q(inp.x) | (q(inp.y) << 8) | (inp.jump ? 1 << 16 : 0) | (inp.dive ? 1 << 17 : 0);
}
function unpackInput(p) { return { x: ((p & 255) - 128) / 127, y: (((p >> 8) & 255) - 128) / 127, jump: !!(p & (1 << 16)), dive: !!(p & (1 << 17)) }; }
const IDLE_INPUT = packInput({ x: 0, y: 0 });

/**
 * cfg: { key, seed, players: [{ i, name, human?, skill?, speedMul? }], active: [i, …], isFinal }
 *  - players: everyone in the match (seat index i = colour); active: who plays this round (finals = 3).
 *  - human: true only for the bean this browser controls (drives camera + "YOU" labels; never physics).
 * rng (anti-peeking): the seed never leaves the server. Server: { record: [] } collects every random draw
 *  (as uint32) in order; browsers: { feed: () => uint32 } replays them as they arrive, so a modded client
 *  can't compute where the next meteor lands. Omit for offline play (local seeded stream).
 */
function createRound(cfg, rng = {}) {
  const src = makeRng(cfg.seed ?? 0);
  if (rng.feed) RNG = () => rng.feed() / 4294967296;
  else if (rng.record) { const log = rng.record; RNG = () => { const v = src(); log.push(v * 4294967296); return v; }; }
  else RNG = src;
  const botRng = makeRng('bots:' + (cfg.seed ?? 0) + ':' + (cfg.botSalt ?? ''));
  const A = ARENAS[cfg.key];
  if (!A) throw new Error('unknown arena ' + cfg.key);
  arena = A;
  // create every bean as a non-human so the RNG is consumed identically on every machine; mark "you" after
  const beans = cfg.players.map((p) => Object.assign(makeBean(p.i, false), {
    ...(p.name ? { name: p.name } : {}), speedMul: p.speedMul ?? 1, skill: p.skill ?? 0.85, human: !!p.human,
  }));
  const byI = new Map(beans.map((b) => [b.i, b]));
  const active = cfg.active.map((i) => byI.get(i));
  A.init(shuffleWith(RNG, active)); // spawn spots are handed out by array position
  let t = 0, tick = 0, winner = null, coasting = false;
  return {
    arena: A, beans, active, isFinal: !!cfg.isFinal, key: cfg.key,
    get t() { return t; }, get tick() { return tick; }, get winner() { return winner; },
    /** inputs: { [seat]: packedInt }. Missing seats are played by the arena's bot (own RNG stream) and
     *  written back into `inputs`, so the server can broadcast exactly what it applied. */
    step(inputs) {
      if (winner) return winner;
      tick++; t += DT;
      for (const b of active) {
        let p = inputs[b.i];
        if (p == null) { const keep = RNG; RNG = botRng; try { p = packInput(A.botInput(b, t) || {}); } finally { RNG = keep; } inputs[b.i] = p; }
        stepBean(b, unpackInput(p), DT, A.maxSpeed, A.diveSpeed, A.mods ? A.mods(b) : null);
      }
      collide(active);
      A.update(DT, t);
      const w = A.winner(t, t >= A.timeout);
      if (w) winner = w;
      return winner;
    },
    /** After the result: everyone drifts on in slow motion (visual only; the round is already decided). */
    coast(dt) {
      if (!coasting) { coasting = true; RNG = makeRng('coast'); } // the server's stream has ended; visuals only now
      for (const b of active) stepBean(b, unpackInput(IDLE_INPUT), dt, A.maxSpeed, A.diveSpeed, A.mods ? A.mods(b) : null);
      A.update(dt, t);
    },
    /** Exact fingerprint of the physical state (positions, velocities, who's alive, time). */
    hash() {
      const n = [t];
      for (const b of active) n.push(b.x, b.y, b.z, b.vx, b.vy, b.kx, b.ky, b.alive ? 1 : 0, b.stun, b.proneT);
      return hashNums(n);
    },
  };
}
