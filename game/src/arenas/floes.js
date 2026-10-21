// 23 · Frostbite Floes — survival on drifting ice floes in a frozen pool. The most crowded floe cracks,
// sinks and is gone; every floe slowly melts. Hop between floes (jump) to stay dry. Last one dry wins.
// Anti-camping: the sinker targets the most crowded floe AND, from 10 s, any floe someone has been on
// for 4+ s, so parking on one big floe is never safe. Melting shrinks the field so rounds end < 30 s.
ARENAS.floes = (() => {
  const POOL = { x1: 24, y1: 30, x2: 936, y2: 580 };
  const THICK = 14;
  let floes, beans, sinkT, splashes, lastAnnounce;
  const floeOf = (b) => floes.find((f) => f.state !== 2 && f.r > 4 && hyp(b.x - f.x, b.y - f.y) < f.r);
  const bobZ = (f, t) => Math.sin(t * 1.8 + f.ph) * 2.2 - (f.state === 1 ? (1 - f.t / f.T) * 12 : 0);
  function floePath(f, r, y) {
    const n = f.shape.length;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a0 = (i / n) * Math.PI * 2 + f.rot, a1 = ((i + 1) / n) * Math.PI * 2 + f.rot;
      const r0 = r * f.shape[i % n], r1 = r * f.shape[(i + 1) % n];
      const x0 = f.x + Math.cos(a0) * r0, y0 = y + Math.sin(a0) * r0;
      const x1 = f.x + Math.cos(a1) * r1, y1 = y + Math.sin(a1) * r1;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(x0, y0, mx, my);
    }
    ctx.closePath();
  }
  return {
    key: 'floes', name: 'Frostbite Floes', genre: 'Survival', theme: 'arctic', timeout: ROUND_SECONDS, maxSpeed: 180,
    objective: 'Jump between drifting ice floes. Crowded floes — and floes you camp on — crack and sink. Last one dry wins.',
    init(bs) {
      beans = bs; floes = []; sinkT = 3; splashes = []; lastAnnounce = 0;
      for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 4; gx++) {
        floes.push({
          x: 170 + gx * 205 + rnd(-20, 20), y: 120 + gy * 180 + rnd(-15, 15), r: rnd(54, 70), vx: rnd(-18, 18), vy: rnd(-12, 12),
          state: 0, t: 0, T: 1.8, ph: rnd(0, 6.3), rot: rnd(0, 6.3), occ: 0,
          shape: Array.from({ length: 11 }, () => rnd(0.9, 1.04)),
          snow: Array.from({ length: 3 }, () => ({ a: rnd(0, 6.3), d: rnd(0.15, 0.55), s: rnd(0.12, 0.22) })),
        });
      }
      beans.forEach((b, i) => { const f = floes[(i * 5) % floes.length]; const a = i * 2.4; b.x = f.x + Math.cos(a) * 18; b.y = f.y + Math.sin(a) * 18; b.zoff = 0; });
    },
    mods() { return { traction: 0.55 }; },
    update(dt, t) {
      for (const f of floes) {
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < POOL.x1 + f.r || f.x > POOL.x2 - f.r) f.vx = -f.vx;
        if (f.y < POOL.y1 + f.r || f.y > POOL.y2 - f.r) f.vy = -f.vy;
        f.x = clamp(f.x, POOL.x1 + f.r, POOL.x2 - f.r); f.y = clamp(f.y, POOL.y1 + f.r, POOL.y2 - f.r);
        f.r = Math.max(0, f.r - 0.9 * dt);
        if (f.state === 1 && (f.t -= dt) <= 0) { f.state = 2; ring(f.x, f.y, 'rgba(255,255,255,.8)', f.r * 0.5, f.r * 1.3, 0.6, 4); puff(f.x, f.y, 10, 'rgba(230,248,255,.85)', 90, 8, 0.6); }
        // occupancy timer: anyone parked on this floe makes it a target
        const occupied = beans.some((b) => b.alive && b.z <= 0.5 && hyp(b.x - f.x, b.y - f.y) < f.r);
        f.occ = occupied ? f.occ + dt : Math.max(0, f.occ - dt * 2);
      }
      for (let i = 0; i < floes.length; i++) for (let j = i + 1; j < floes.length; j++) {
        const a = floes[i], c = floes[j]; if (a.state === 2 || c.state === 2) continue; const d = hyp(a.x - c.x, a.y - c.y);
        if (d < a.r + c.r + 14 && d > 0) { const n = norm(c.x - a.x, c.y - a.y); a.vx -= n.x * 20 * dt; a.vy -= n.y * 20 * dt; c.vx += n.x * 20 * dt; c.vy += n.y * 20 * dt; }
      }
      const live = floes.filter((f) => f.state === 0);
      if ((sinkT -= dt) <= 0 && live.length > 1) {
        sinkT = Math.max(1.2, 3 - t * 0.08);
        const crowd = (f) => beans.filter((b) => b.alive && hyp(b.x - f.x, b.y - f.y) < f.r).length;
        const score = (f) => crowd(f) * 2 + (t > 10 && f.occ > 4 ? 3 : 0) + (Math.random() - 0.5) * 2;
        const pick = live.sort((a, c) => score(c) - score(a))[0];
        pick.state = 1; pick.t = pick.T = 1.8;
        if (beans.some((b) => b.human && b.alive && hyp(b.x - pick.x, b.y - pick.y) < pick.r)) popText(pick.x, pick.y - 30, 'CRACKING!', '#9fe8ff', 18);
      }
      if (live.length <= 3 && lastAnnounce < 1) { lastAnnounce = 1; announce('LAST FLOES!', '#9fe8ff'); }
      for (const b of beans) {
        if (!b.alive) continue;
        b.x = clamp(b.x, POOL.x1 + 4, POOL.x2 - 4); b.y = clamp(b.y, POOL.y1 + 4, POOL.y2 - 4);
        const f = floeOf(b);
        b.zoff = f ? bobZ(f, t) : 0;
        if (b.z > 0.5) continue;
        if (f) { b.x += f.vx * dt; b.y += f.vy * dt; if (f.state === 1) b.scaredT = 0.2; }
        else {
          kill(b, t); splashes.push({ x: b.x, y: b.y, t: 0.8 });
          puff(b.x, b.y, 12, 'rgba(220,245,255,.9)', 120, 7, 0.6); sparks(b.x, b.y - 10, 10, ['#ffffff', '#9fe8ff'], 220, 0.5);
        }
      }
      for (const s of splashes) s.t -= dt; splashes = splashes.filter((s) => s.t > 0);
    },
    botInput(b, t) {
      const f = floeOf(b);
      const safe = (g) => g.state === 0 && g.r > 32;
      const parked = f && t > 10 && f.occ > 3 * (1.3 - b.skill * 0.3);
      let target = f && safe(f) && f.r > 44 && !parked ? f : null;
      if (!target) {
        let best = null, bs = 1e9;
        for (const g of floes) { if (!safe(g) || g === f) continue; const gap = hyp(g.x - b.x, g.y - b.y) - g.r; const crowd = beans.filter((o) => o.alive && hyp(o.x - g.x, o.y - g.y) < g.r).length; const s = gap + crowd * 30 - g.r; if (s < bs) { bs = s; best = g; } }
        target = best || f;
      }
      if (!target) return { x: 0, y: 0, jump: false, dive: false };
      let dx = target.x - b.x, dy = target.y - b.y;
      if (target === f) { const sep = separation(b, beans, 40); dx = dx * 0.02 + sep.x; dy = dy * 0.02 + sep.y; }
      const d = norm(dx, dy);
      let jump = false;
      if (f && target !== f && hyp(b.x - f.x, b.y - f.y) > f.r - 16 && Math.random() < 0.5 + b.skill * 0.5) jump = true;
      return { x: d.x, y: d.y, jump, dive: false };
    },
    draw(t) {
      const { x1, y1, x2, y2 } = POOL;
      // pool basin: snowy rim with an inner ice wall
      ctx.fillStyle = 'rgba(5,20,40,.45)'; roundRect(x1 - 30, y1 - 22 + lift(-8), x2 - x1 + 60, y2 - y1 + 52, 34); ctx.fill();
      ctx.fillStyle = '#c9e6f5'; roundRect(x1 - 26, y1 - 24, x2 - x1 + 52, y2 - y1 + 48, 32); ctx.fill();
      ctx.fillStyle = mat('ice'); roundRect(x1 - 26, y1 - 24, x2 - x1 + 52, y2 - y1 + 48, 32); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; roundRect(x1 - 24, y1 - 22, x2 - x1 + 48, y2 - y1 + 44, 30); ctx.stroke();
      // water (scrolling pattern) + depth gradient
      ctx.save(); roundRect(x1, y1, x2 - x1, y2 - y1, 18); ctx.clip();
      const off = (t * 14) % 256;
      ctx.translate(off, off * 0.4); ctx.fillStyle = mat('water'); ctx.fillRect(x1 - 300, y1 - 300, x2 - x1 + 600, y2 - y1 + 600); ctx.translate(-off, -off * 0.4);
      const wg = ctx.createLinearGradient(0, y1, 0, y2); wg.addColorStop(0, 'rgba(6,30,60,.55)'); wg.addColorStop(1, 'rgba(40,140,190,.12)');
      ctx.fillStyle = wg; ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      // inner wall shadow along the top edge reads as depth
      const ig = ctx.createLinearGradient(0, y1, 0, y1 + 40); ig.addColorStop(0, 'rgba(0,15,35,.6)'); ig.addColorStop(1, 'rgba(0,15,35,0)');
      ctx.fillStyle = ig; ctx.fillRect(x1, y1, x2 - x1, 40);
      // caustic shimmer
      for (let k = 0; k < 9; k++) { const cx = x1 + ((k * 137 + t * 22) % (x2 - x1)), cy = y1 + ((k * 89 + t * 9) % (y2 - y1)); lightPool(cx, cy, 70, '#bdf3ff', 0.06); }
      // ripples & splashes
      for (const f of floes) if (f.state !== 2 && f.r > 4) { const k = (t * 0.8 + f.ph) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.22 * (1 - k)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.05 + k * 0.35), 0, Math.PI * 2); ctx.stroke(); }
      for (const s of splashes) { const k = 1 - s.t / 0.8; ctx.strokeStyle = `rgba(255,255,255,${s.t})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, 8 + k * 40, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(s.x, s.y, 4 + k * 22, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      // floes: submerged base, side wall, snowy top with ice texture, rim light
      const order = floes.filter((f) => f.state !== 2 && f.r > 3).sort((a, c) => a.y - c.y);
      for (const f of order) {
        const z = bobZ(f, t), y = f.y - lift(z);
        const sinking = f.state === 1, k = sinking ? 1 - f.t / f.T : 0;
        ctx.globalAlpha = sinking ? 1 - k * 0.45 : 1;
        ctx.fillStyle = 'rgba(160,220,245,.18)'; floePath(f, f.r * 1.12, f.y + lift(10)); ctx.fill();
        ctx.fillStyle = sinking ? '#7fb6d6' : '#9fd3ec';
        for (let k = THICK; k > 0; k -= 2.5) { floePath(f, f.r, y + lift(k)); ctx.fill(); } // stacked outlines = a solid side wall
        ctx.fillStyle = 'rgba(40,120,170,.35)'; floePath(f, f.r, y + lift(THICK)); ctx.fill();
        floePath(f, f.r, y);
        ctx.fillStyle = mat('ice'); ctx.fill();
        const tg = ctx.createRadialGradient(f.x - f.r * 0.35, y - f.r * 0.4, 4, f.x, y, f.r * 1.1);
        tg.addColorStop(0, sinking ? 'rgba(190,225,245,.25)' : 'rgba(255,255,255,.55)'); tg.addColorStop(1, sinking ? 'rgba(70,140,190,.45)' : 'rgba(150,205,235,.25)');
        ctx.fillStyle = tg; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        for (const s of f.snow) { ctx.beginPath(); ctx.ellipse(f.x + Math.cos(s.a + f.rot) * f.r * s.d, y + Math.sin(s.a + f.rot) * f.r * s.d, f.r * s.s, f.r * s.s * 0.7, s.a, 0, Math.PI * 2); ctx.fill(); }
        // camped floes glow a warning tint before they are picked to crack
        if (!sinking && t > 10 && f.occ > 2.5) { ctx.fillStyle = `rgba(120,190,255,${0.14 + 0.1 * Math.sin(t * 8)})`; floePath(f, f.r, y); ctx.fill(); }
        if (sinking) {
          ctx.strokeStyle = 'rgba(20,70,110,.85)'; ctx.lineWidth = 2.4; ctx.beginPath();
          ctx.moveTo(f.x - f.r * 0.7, y - 4); ctx.lineTo(f.x - 6, y + 4); ctx.lineTo(f.x + f.r * 0.55, y - f.r * 0.35);
          ctx.moveTo(f.x - 6, y + 4); ctx.lineTo(f.x + 8, y + f.r * 0.65); ctx.moveTo(f.x - 6, y + 4); ctx.lineTo(f.x - f.r * 0.3, y + f.r * 0.6); ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 20)})`; ctx.lineWidth = 3; floePath(f, f.r * 1.06, f.y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      drawAll(beans);
      const alive = beans.filter((b) => b.alive).length;
      inScreen(() => { ctx.font = '12px Bungee, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(`${alive} STILL DRY`, 48, H - 92); });
    },
    winner(t, to) { return survivalWinner(beans, t, to, (b) => { const f = floeOf(b); return f ? f.r : 0; }); },
  };
})();
