// ───────────────────────── arenas ─────────────────────────
// Each arena: name, genre, objective, timeout (s), init(beans), update(dt,t), botInput(b,t), draw(t), winner(t, timedOut) -> bean|null
const ARENAS = {};

function kill(b, t, f = 90) { if (!b.alive) return; if (b.pow === 'bubble' && arena?.power?.rescue && arena.power.rescue(b)) { shielded(b); return; } b.alive = false; b.out = 0; b.outAt = t; if (b.human) beep(f, 0.3, 'sawtooth', 0.05); }
function placeRing(beans, cx, cy, rx, ry = rx, a0 = 0) { const n = beans.length; beans.forEach((b, i) => { const a = a0 + (i / n) * Math.PI * 2; b.x = cx + Math.cos(a) * rx; b.y = cy + Math.sin(a) * ry; }); }
function survivalWinner(beans, t, timedOut, score) {
  const alive = beans.filter((b) => b.alive);
  if (alive.length === 1) return alive[0];
  if (!alive.length) return [...beans].sort((a, b) => (b.outAt - a.outAt) || (score(b) - score(a)))[0];
  if (timedOut) return [...alive].sort((a, b) => score(b) - score(a))[0];
  return null;
}
function scoreWinner(beans, timedOut, val, target, tie = () => 0) {
  const w = beans.find((b) => val(b) >= target); if (w) return w;
  if (timedOut) return [...beans].sort((a, b) => (val(b) - val(a)) || (tie(b) - tie(a)))[0];
  return null;
}
function seek(b, x, y) { return norm(x - b.x, y - b.y); }
function separation(b, beans, rad = 50) {
  let x = 0, y = 0;
  for (const o of beans) if (o !== b && o.alive) { const d = hyp(o.x - b.x, o.y - b.y); if (d < rad && d > 0.1) { x -= (o.x - b.x) / d * (1 - d / rad); y -= (o.y - b.y) / d * (1 - d / rad); } }
  return { x, y };
}
function followCam(beans, cam, LEN, dt) {
  const me = beans.find((b) => b.human) || beans.reduce((a, b) => (a.y < b.y ? a : b));
  const view = (H - Y0) / TILT; // world units visible below the stands
  return cam + (clamp(me.y - view * 0.66, -30, LEN - view + 20) - cam) * Math.min(1, dt * 6);
}
// ── Oval stages: an arena simulates on a circle of "radius r" but the stage is stretched sideways by SX,
// so it fills the wide screen. o.d(x,y) = distance in circle units (use for edge tests), o.pt(a,r) = world
// point on the oval, o.ang = angle in circle space, o.keepIn(b,r) clamps, o.stretch(fn) draws fn() with
// x scaled about C.x (draw C-centred arcs/gradients inside it; draw upright things and text outside it).
function ovalKit(C, SX) {
  const d = (x, y) => hyp((x - C.x) / SX, y - C.y);
  return {
    SX, d,
    pt: (a, r) => ({ x: C.x + Math.cos(a) * r * SX, y: C.y + Math.sin(a) * r }),
    ang: (x, y) => Math.atan2(y - C.y, (x - C.x) / SX),
    keepIn(b, r) { const k = d(b.x, b.y); if (k > r) { b.x = C.x + (b.x - C.x) * r / k; b.y = C.y + (b.y - C.y) * r / k; } },
    stretch(fn) { ctx.save(); ctx.translate(C.x, 0); ctx.scale(SX, 1); ctx.translate(-C.x, 0); fn(); ctx.restore(); },
  };
}
