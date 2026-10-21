// ───────────────────────── FOLLOWER: replays the server's stream on a browser ─────────────────────────
// The server sends, per round: 'round' (arena, roster, the random draws used to set it up), then frames of
// [inputs per active seat, random draws used that tick], fingerprints every second, and 'end'. The follower
// rebuilds the identical round locally (fresh sim instance, no seed) and steps it as frames arrive.
// Pacing: frames are played out at 60 Hz from a small jitter buffer that grows if the network is bumpy.
function createFollower({ createSim, fx, me = -1, onDesync = () => {} }) {
  const F = {
    R: null, msg: null, frames: [], next: 0, hashes: new Map(), end: null, desync: false,
    target: 4, acc: 0, starve: 0, smooth: 0,
    get buffered() { return this.frames.length - this.next; },
    get tick() { return this.R ? this.R.tick : 0; },
    /** 'round' message → fresh deterministic round fed only by the server's random draws */
    round(msg) {
      F.msg = msg; F.frames = []; F.next = 0; F.hashes = new Map(); F.end = null; F.desync = false; F.acc = 0;
      F.queue = msg.init.slice(); F.qi = 0;
      const sim = createSim({ seed: 0, fx });
      F.R = sim.createRound({ key: msg.key, seed: 0, isFinal: msg.isFinal, active: msg.active,
        players: msg.players.map((p) => ({ ...p, human: p.i === me })) }, { feed: () => {
        if (F.qi >= F.queue.length) throw new Error('rng underflow'); return F.queue[F.qi++];
      } });
      if (F.qi !== F.queue.length) F.fail('init draws');
      return F.R;
    },
    addFrames(k, list) { // 'tk' message: frames for ticks k, k+1, …
      const expect = F.frames.length + 1;
      if (k > expect) return F.fail('gap ' + expect + '→' + k);
      for (let j = expect - k; j < list.length; j++) F.frames.push(list[j]); // ignore overlap
    },
    checkpoint(k, h) { F.hashes.set(k, h); },
    ended(msg) { F.end = msg; F.hashes.set(msg.k, msg.h); },
    /** apply up to n buffered frames; returns how many ticks were stepped */
    step(n) {
      let done = 0;
      while (done < n && F.next < F.frames.length && !F.desync) {
        const [row, draws] = F.frames[F.next++];
        F.queue = draws; F.qi = 0;
        const inputs = {}; F.R.active.forEach((b, j) => { inputs[b.i] = row[j]; });
        try { F.R.step(inputs); } catch (e) { F.fail('step: ' + e.message); break; }
        if (F.qi !== F.queue.length) { F.fail('draws left over at tick ' + F.R.tick); break; }
        const h = F.hashes.get(F.R.tick);
        if (h !== undefined && h !== F.R.hash()) { F.fail('hash at tick ' + F.R.tick); break; }
        done++;
      }
      return done;
    },
    /** How many ticks to play this animation frame (dtMs since the last one): steady 60 Hz from a buffer
     *  of `target` ticks; speeds up a touch when the buffer is fat, slows when thin, jumps if far behind. */
    pace(dtMs) {
      const b = F.buffered;
      if (F.end && F.next >= F.frames.length) return 0;
      if (F.next === 0 && b < F.target && !F.end) return 0; // fill the cushion before playback starts
      if (b > F.target + 45) return b - F.target; // e.g. the tab was hidden: catch up at once
      const rate = b > F.target + 3 ? 1.1 : b < F.target - 1 ? 0.9 : 1;
      F.acc += (dtMs / (1000 / 60)) * rate;
      let n = Math.floor(F.acc); F.acc -= n;
      if (n > b) { // ran dry: the network hiccuped → hold a bigger cushion for a while
        if (!F.end) { F.starve++; F.target = Math.min(14, F.target + 1); }
        F.acc = 0; n = b;
      } else if (F.target > 4 && (F.smooth += dtMs) > 8000) { F.smooth = 0; F.target--; }
      return Math.min(n, 20);
    },
    /** reconnect / desync repair: rebuild the round and replay every frame so far at full speed */
    sync(msg) {
      if (!msg.round) { F.R = null; return null; }
      F.round(msg.round);
      F.addFrames(msg.k0 || 1, msg.frames || []);
      if (msg.end) F.end = msg.end;
      F.step(Infinity);
      return F.R;
    },
    fail(why) { if (!F.desync) { F.desync = true; onDesync(why); } },
  };
  return F;
}
