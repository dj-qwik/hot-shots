// ───────────────────────── beans ─────────────────────────
function makeBean(i, human) {
  return {
    i, human, name: human ? 'You' : BOT_NAMES[(((i - 1) % BOT_NAMES.length) + BOT_NAMES.length) % BOT_NAMES.length], color: ROSTER[i][1], colorName: ROSTER[i][0],
    speedMul: human ? 1 : rnd(0.95, 1.0), skill: human ? 1 : rnd(0.72, 0.95),
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, kx: 0, ky: 0, fx: 0, fy: 1,
    alive: true, out: 0, stun: 0, diveT: 0, proneT: 0, diveCd: 0, sq: 0, walk: 0, carry: null, hitCd: 0,
    layer: 0, zoff: 0, broken: 0, bank: 0, cur: null, stand: 0, fatigue: 0, diveLatch: false, stepT: 0, blink: 1 + VRAND() * 3, hitBy: null, happyT: 0, cheerT: 0, scaredT: 0, jumpBuf: 0,
    next: 0, prog: 0, lastAng: 0, recipe: [], got: [], done: false, cp: null, cap: 0, painted: 0, stars: 0, base: null, stealCd: 0, lane: null, seen: -1, react: 0, wrong: false, boostCd: 0, padCd: 0, think: 0, tx: 0, ty: 0, jumpLatch: false, plan: null, memo: null, outAt: 0, zapped: false,
  };
}
const R = 13; // bean radius

function stepBean(b, inp, dt, maxSpeed, diveSpeed = 430, mods = null) {
  const slow = mods?.slow ?? 1, traction = mods?.traction ?? 1;
  if (!b.alive) { b.out += dt; return; }
  if (b.stun > 0) { b.stun -= dt; inp = { x: 0, y: 0, jump: false, dive: false }; }
  b.diveCd -= dt; b.proneT -= dt; b.hitCd -= dt; b.padCd -= dt;
  b.fatigue = Math.max(0, b.fatigue - dt / DIVE.recover);
  // Dive = a committed lunge: press (not hold) to dive, then you lie flat and get up. Chaining dives
  // builds fatigue: shorter lunges, longer get-ups and dizzy eyes. Spamming it is slower than running.
  if (inp.dive && !b.diveLatch && b.diveCd <= 0 && b.z <= 0.01 && b.proneT <= 0) {
    const f = Math.min(3, b.fatigue);
    const d = hyp(inp.x, inp.y) > 0.2 ? norm(inp.x, inp.y) : { x: b.fx, y: b.fy };
    const sp = diveSpeed * (1 - 0.17 * f);
    b.diveT = DIVE.time; b.proneT = DIVE.time + DIVE.getUp + 0.3 * f; b.diveCd = DIVE.cd + 0.25 * f;
    b.vx = d.x * sp; b.vy = d.y * sp; b.fx = d.x; b.fy = d.y; b.fatigue += 1;
    fxDive(b); if (b.human) SFX.dive();
  }
  b.diveLatch = !!inp.dive;
  // jump on press (edge), not hold
  // jump buffer: a press up to 0.12 s before landing still jumps on touchdown
  if (inp.jump && !b.jumpLatch) b.jumpBuf = 0.12;
  b.jumpBuf -= dt; b.happyT -= dt; b.scaredT -= dt;
  if (b.jumpBuf > 0 && b.z <= 0.01 && b.proneT <= 0) { b.jumpBuf = 0; b.vz = 430; b.sq = -0.18; if (b.human) SFX.jump(); }
  b.jumpLatch = !!inp.jump;
  if (b.diveT > 0) b.diveT -= dt;
  else {
    const ms = maxSpeed * slow * b.speedMul * (b.carry ? 0.75 : 1) * (b.proneT > 0 ? 0 : 1);
    const k = Math.min(1, dt * (b.z > 0 ? 3.2 : (b.proneT > 0 ? 7 : 10) * traction));
    b.vx += (inp.x * ms - b.vx) * k; b.vy += (inp.y * ms - b.vy) * k;
  }
  b.x += (b.vx + b.kx) * dt; b.y += (b.vy + b.ky) * dt;
  const decay = Math.exp(-4.5 * dt); b.kx *= decay; b.ky *= decay;
  b.vz -= 1300 * dt; b.z += b.vz * dt;
  if (b.z < 0) { if (b.vz < -250) { b.sq = 0.22; fxLand(b); } b.z = 0; b.vz = 0; }
  b.sq *= Math.exp(-10 * dt);
  const sp = hyp(b.vx, b.vy);
  if (sp > 20 && b.proneT <= 0) { b.fx = b.vx / sp; b.fy = b.vy / sp; b.walk += sp * dt * 0.07; }
  if (b.z <= 0.5 && sp > 150 && b.proneT <= 0 && (b.stepT -= dt) <= 0) { b.stepT = 0.16; fxStep(b); }
  if ((b.blink -= dt) < -0.12) b.blink = 1.5 + VRAND() * 3; // visual only
}
const DIVE = { time: 0.24, getUp: 0.6, cd: 1.4, recover: 1.8 };

function collide(beans) {
  for (let a = 0; a < beans.length; a++) for (let c = a + 1; c < beans.length; c++) {
    const p = beans[a], q = beans[c];
    if (!p.alive || !q.alive || p.layer !== q.layer || Math.abs(p.z - q.z) > 22) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = hyp(dx, dy);
    if (d < R * 2 && d > 0.001) {
      const n = { x: dx / d, y: dy / d }, push = (R * 2 - d) / 2;
      p.x -= n.x * push; p.y -= n.y * push; q.x += n.x * push; q.y += n.y * push;
      const tackle = (att, vic, dir) => {
        if (att.diveT > 0 && vic.hitCd <= 0) {
          const f = arena?.tackle ?? 380;
          vic.kx += dir.x * f; vic.ky += dir.y * f; vic.stun = 0.6; vic.hitCd = 0.6; if (att.human || vic.human) SFX.tackle(); else tone(160, 0.1, 'sine', 0.05, 80);
          att.diveT = 0; att.vx *= 0.2; att.vy *= 0.2; // the tackler stops dead on impact
          fxTackle(att, vic);
          if (arena?.onTackle) arena.onTackle(vic, att); else if (vic.carry) arena?.drop?.(vic);
        }
      };
      tackle(p, q, n); tackle(q, p, { x: -n.x, y: -n.y });
    }
  }
}

