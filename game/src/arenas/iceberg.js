// 28 · Iceberg Tilt — survival on a slippery iceberg that tips toward wherever the weight is (plus a
// growing ocean swell). The edge crumbles inward AND the centre melts into a growing hole, so the safe
// band keeps narrowing: you must keep reading the slope and walking uphill without falling in either
// side. Timeout tie-break: closest to the middle of the safe band.
ARENAS.iceberg = (() => {
  const C = { x: 480, y: 300 }, POOL_R = 296, O = ovalKit(C, 1.3), B0 = 252;
  let bergR, holeR, tilt, beans, warned, penguins;
  const bandMid = () => (holeR + bergR) / 2;
  return {
    key: 'iceberg', name: 'Iceberg Tilt', genre: 'Survival', theme: 'arctic', timeout: ROUND_SECONDS, maxSpeed: 185,
    objective: 'The iceberg tips toward the crowd and the waves, so walk uphill. The edge crumbles and the centre melts. Last one aboard wins.',
    init(bs) {
      beans = bs; bergR = B0; holeR = 0; tilt = { x: 0, y: 0 }; warned = false;
      placeRing(beans, C.x, C.y, 128 * O.SX, 128, rnd(0, Math.PI * 2));
      penguins = Array.from({ length: 5 }, (_, i) => { const a = rnd(0, Math.PI * 2), r = rnd(258, 282); return { x: C.x + Math.cos(a) * r * 1.4, y: C.y + Math.sin(a) * r, ph: rnd(0, 6), s: rnd(0.8, 1.05) }; });
    },
    mods() { return { traction: 0.35 }; },
    update(dt, t) {
      bergR = clamp(B0 - Math.max(0, t - 4.5) * 5.2, 128, B0);
      if (!warned && t > 5.5) { warned = true; announce('CENTRE MELTING!', '#9fe8ff', 'Stay on the ring of ice'); }
      holeR = clamp((t - 7) * 3.6, 0, 66);
      let wx = 0, wy = 0, n = 0;
      for (const b of beans) if (b.alive && b.z <= 0.5) { wx += (b.x - C.x) / (bergR * O.SX); wy += (b.y - C.y) / bergR; n++; }
      const sw = 0.14 + t * 0.026, sa = t * 0.8;
      const target = { x: wx / Math.max(2, n) * 1.3 + Math.cos(sa) * sw, y: wy / Math.max(2, n) * 1.3 + Math.sin(sa) * sw };
      tilt.x += (target.x - tilt.x) * Math.min(1, dt * 2); tilt.y += (target.y - tilt.y) * Math.min(1, dt * 2);
      for (const b of beans) {
        if (!b.alive) continue;
        if (b.z <= 0.5) { b.x += tilt.x * 175 * dt; b.y += tilt.y * 175 * dt; }
        const r = O.d(b.x, b.y);
        if (b.z <= 0.5 && (r > bergR || r < holeR - 4)) { puff(b.x, b.y, 8, 'rgba(220,245,255,.8)', 110, 7, 0.5); ring(b.x, b.y, 'rgba(255,255,255,.8)', 6, 40, 0.4, 3); kill(b, t); }
      }
      for (const p of penguins) p.ph += dt;
    },
    botInput(b, t) {
      const dx0 = (b.x - C.x) / O.SX, dy0 = b.y - C.y, r = Math.max(1, hyp(dx0, dy0)), ux = dx0 / r, uy = dy0 / r;
      const want = bandMid(), radial = clamp((want - r) / 60, -1.5, 1.5);
      let x = -tilt.x * (1.2 + b.skill) + ux * radial * (0.6 + b.skill * 0.5), y = -tilt.y * (1.2 + b.skill) + uy * radial * (0.6 + b.skill * 0.5);
      const sep = separation(b, beans, 45); x += sep.x * 0.5; y += sep.y * 0.5;
      const d = hyp(x, y) > 1 ? norm(x, y) : { x, y };
      return { x: d.x, y: d.y, jump: false, dive: false };
    },
    draw(t) {
      // ── ocean pool on the stage
      ctx.fillStyle = 'rgba(4,20,40,.6)'; ctx.beginPath(); ctx.ellipse(C.x, C.y + lift(10), POOL_R * 1.45 + 10, POOL_R + 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.ellipse(C.x, C.y, POOL_R * 1.45, POOL_R, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = mat('water'); ctx.fillRect(C.x - POOL_R * 1.4, C.y - POOL_R - 10, POOL_R * 2.8, POOL_R * 2 + 20);
      const wg = ctx.createRadialGradient(C.x, C.y, bergR, C.x, C.y, POOL_R * 1.45); wg.addColorStop(0, 'rgba(120,210,255,.25)'); wg.addColorStop(1, 'rgba(4,20,50,.5)');
      ctx.fillStyle = wg; ctx.fillRect(C.x - POOL_R * 1.4, C.y - POOL_R - 10, POOL_R * 2.8, POOL_R * 2 + 20);
      for (let k = 0; k < 4; k++) { const rr = bergR + 14 + ((t * 26 + k * 30) % 120); ctx.strokeStyle = `rgba(255,255,255,${0.35 * (1 - (rr - bergR) / 134)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(C.x, C.y, rr * O.SX, rr, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = '#d8f3ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(C.x, C.y, POOL_R * 1.45, POOL_R, 0, 0, Math.PI * 2); ctx.stroke();
      // penguins on the pool rim (decor)
      for (const p of penguins) sprite(p.y, () => billboard(p.x, p.y, Math.abs(Math.sin(p.ph * 3)) * 2, () => {
        ctx.scale(p.s, p.s);
        ctx.fillStyle = '#1a1f3a'; ctx.beginPath(); ctx.ellipse(0, -14, 8.5, 14, Math.sin(p.ph * 3) * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.ellipse(0, -11, 5.5, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFB547'; ctx.beginPath(); ctx.moveTo(-2.5, -21); ctx.lineTo(2.5, -21); ctx.lineTo(0, -17); ctx.fill(); ctx.fillRect(-6, -1.5, 4, 2); ctx.fillRect(2, -1.5, 4, 2);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2.5, -24, 1.6, 0, Math.PI * 2); ctx.arc(2.5, -24, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-2.3, -24, 0.8, 0, Math.PI * 2); ctx.arc(2.7, -24, 0.8, 0, Math.PI * 2); ctx.fill();
      }));
      // ── the iceberg: underwater bulk, extruded ice wall, top face lit uphill / shaded downhill
      const tl = hyp(tilt.x, tilt.y), dir = tl > 0.01 ? { x: tilt.x / tl, y: tilt.y / tl } : { x: 0, y: 1 };
      O.stretch(() => {
      ctx.fillStyle = 'rgba(120,200,240,.25)'; ctx.beginPath(); ctx.arc(C.x + dir.x * 10, C.y + dir.y * 10 + lift(8), bergR + 22, 0, Math.PI * 2); ctx.fill();
      platformCircle(C.x, C.y, bergR, mat('ice'), '#7fbfe0', 20);
      const g = ctx.createLinearGradient(C.x - dir.x * bergR, C.y - dir.y * bergR, C.x + dir.x * bergR, C.y + dir.y * bergR);
      g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(40,110,170,${0.15 + tl * 0.45})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(C.x, C.y, bergR, 0, Math.PI * 2); ctx.fill();
      // crumbling edge telegraph
      if (t > 4 && bergR > 131) { ctx.strokeStyle = `rgba(255,181,71,${0.4 + 0.25 * Math.sin(t * 8)})`; ctx.lineWidth = 8; ctx.setLineDash([16, 10]); ctx.beginPath(); ctx.arc(C.x, C.y, bergR - 6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      // the melt hole (with cracks warning before it opens)
      if (t > 3 && holeR < 2) { ctx.strokeStyle = 'rgba(40,120,170,.7)'; ctx.lineWidth = 2; srand(7); ctx.beginPath(); for (let k = 0; k < 7; k++) { let x = C.x, y = C.y; ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (prand() - 0.5) * 30 * (t - 2); y += (prand() - 0.5) * 30 * (t - 2); ctx.lineTo(x, y); } } ctx.stroke(); }
      if (holeR > 0) {
        ctx.fillStyle = '#0a2c4f'; ctx.beginPath(); ctx.arc(C.x, C.y, holeR, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(C.x, C.y, holeR, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = mat('water'); ctx.fillRect(C.x - holeR, C.y - holeR + lift(14), holeR * 2, holeR * 2); ctx.fillStyle = 'rgba(0,20,40,.45)'; ctx.fillRect(C.x - holeR, C.y - holeR, holeR * 2, lift(16)); ctx.restore();
        ctx.strokeStyle = '#e9f9ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(C.x, C.y, holeR, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(255,181,71,${0.35 + 0.25 * Math.sin(t * 8)})`; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(C.x, C.y, holeR + 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      });
      // downhill chevrons painted across the ice, stronger with steeper tilt
      if (tl > 0.06) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(C.x, C.y, (bergR - 10) * O.SX, bergR - 10, 0, 0, Math.PI * 2); ctx.ellipse(C.x, C.y, (holeR + 10) * O.SX, holeR + 10, 0, 0, Math.PI * 2, true); ctx.clip();
        ctx.translate(C.x, C.y); ctx.rotate(Math.atan2(dir.y, dir.x));
        ctx.strokeStyle = `rgba(255,85,125,${clamp(tl * 0.9, 0.12, 0.55)})`; ctx.lineWidth = 6; ctx.lineCap = 'round';
        const off = (t * 40 * (0.5 + tl)) % 70;
        for (let yy = -bergR * O.SX; yy < bergR * O.SX; yy += 64) for (let xx = -bergR * O.SX - 70; xx < bergR * O.SX; xx += 70) { const x0 = xx + off; ctx.beginPath(); ctx.moveTo(x0 - 10, yy - 12); ctx.lineTo(x0 + 5, yy); ctx.lineTo(x0 - 10, yy + 12); ctx.stroke(); }
        ctx.restore(); ctx.lineCap = 'butt';
        bigLabel('DOWNHILL', C.x + dir.x * (bergR + 30) * O.SX, C.y + dir.y * (bergR + 30), 'rgba(255,85,125,.85)', 12);
      }
      drawAll(beans);
      const alive = beans.filter((b) => b.alive).length;
      inScreen(() => { ctx.font = '12px Bungee, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText(`${alive} ABOARD`, W - 16, H - 92); });
    },
    winner(t, to) { return survivalWinner(beans, t, to, (b) => -Math.abs(O.d(b.x, b.y) - bandMid())); },
  };
})();
