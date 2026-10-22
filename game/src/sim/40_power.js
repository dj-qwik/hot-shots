// ───────────────────────── SHARED POWER-UPS ─────────────────────────
// Glowing pickups that spawn during a round. Grab one and it takes effect at once (no extra button):
//   zoom   — 3 s of extra top speed
//   bubble — the next hit, knock-back or fall is blocked (arenas call shielded(b) in their hazard code;
//            kill() asks the arena's power.rescue(b) to put a bubbled bean somewhere safe)
//   spring — the next jump goes much higher and further
//   shove  — the next dive tackle sends its victim flying
// One held power at a time (zoom doesn't count as held). An arena opts in with
//   power: { kinds: ['zoom', …], spot(t) → {x, y, layer?} | null (layer: only beans on that floor can grab it), rescue?(b) → true if it saved b, every?, max?, botGrab? }
// Deterministic: spawns use the round's RNG; everything is stepped inside createRound().
const POWERS = {
  zoom: { color: '#37D8E9', label: 'ZOOM!' },
  bubble: { color: '#7EE2B8', label: 'BUBBLE!' },
  spring: { color: '#FFD95B', label: 'SUPER JUMP!' },
  shove: { color: '#FF557D', label: 'MEGA SHOVE!' },
};
const ZOOM_TIME = 3, ZOOM_MUL = 1.32, SPRING_VZ = 640, SHOVE_MUL = 2.3;
function createPower(A) {
  const cfg = A.power || null;
  const P = { items: [], next: cfg ? rnd(2.5, 4) : 1e9, cfg };
  P.update = (dt, t, beans) => {
    for (const b of beans) if (b.zoomT > 0) b.zoomT -= dt;
    if (!cfg) return;
    if ((P.next -= dt) <= 0) {
      P.next = rnd(...(cfg.every || [4.5, 7]));
      if (P.items.length < (cfg.max ?? 2)) {
        const s = cfg.spot(t);
        if (s) P.items.push({ x: s.x, y: s.y, layer: s.layer ?? null, kind: cfg.kinds[(RNG() * cfg.kinds.length) | 0], life: cfg.life ?? 9, ph: RNG() * 6.28 });
      }
    }
    for (const it of P.items) it.life -= dt;
    P.items = P.items.filter((it) => it.life > 0);
    for (const b of beans) {
      if (!b.alive || b.pow) continue;
      const i = P.items.findIndex((it) => hyp(b.x - it.x, b.y - it.y) < 28 && b.z < 60 && (it.layer == null || it.layer === b.layer));
      if (i < 0) continue;
      const it = P.items.splice(i, 1)[0];
      if (it.kind === 'zoom') b.zoomT = ZOOM_TIME; else b.pow = it.kind;
      ring(it.x, it.y, POWERS[it.kind].color, 10, 70, 0.4, 5); sparks(it.x, it.y - 16, 10, ['#fff', POWERS[it.kind].color], 180, 0.4);
      if (b.human) { popText(b.x, b.y - 40, POWERS[it.kind].label, POWERS[it.kind].color, 18); beep(1100, 0.08, 'triangle', 0.05); }
    }
  };
  // bots: drift toward a pickup that's close by (each arena can turn this off or shrink the radius)
  P.steer = (b, inp) => {
    if (!cfg || b.pow || cfg.botGrab === 0) return inp;
    const r = cfg.botGrab ?? 120;
    let best = null, bd = r;
    for (const it of P.items) { if (it.layer != null && it.layer !== b.layer) continue; const d = hyp(it.x - b.x, it.y - b.y); if (d < bd) { bd = d; best = it; } }
    if (!best || RNG() > 0.4 + b.skill * 0.6) return inp;
    const d = norm(best.x - b.x, best.y - b.y), w = 0.6;
    return { ...inp, x: inp.x * (1 - w) + d.x * w, y: inp.y * (1 - w) + d.y * w };
  };
  return P;
}
// Bubble check for arena hazards: true = this hit is blocked (and the bubble pops).
function shielded(b) {
  if (b.pow !== 'bubble') return false;
  b.pow = null; b.hitCd = Math.max(b.hitCd, 0.8); b.scaredT = 0.4;
  ring(b.x, b.y - 18, POWERS.bubble.color, 12, 60, 0.4, 5); sparks(b.x, b.y - 20, 10, ['#ffffff', '#7EE2B8'], 200, 0.4);
  if (b.human) { popText(b.x, b.y - 40, 'BUBBLE SAVED YOU!', '#7EE2B8', 16); beep(700, 0.12, 'sine', 0.05); }
  return true;
}
