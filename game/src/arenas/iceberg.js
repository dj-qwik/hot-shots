// 28 · Iceberg Tilt — survival on a slippery iceberg that tips toward wherever the weight is (plus a
// growing ocean swell). The edge crumbles inward AND the centre melts into a growing hole, so the safe
// band keeps narrowing: you must keep reading the slope and walking uphill without falling in either
// side. Penguins belly-slide across the ice (they wave from the rim first): jump them or get bowled downhill.
// TWIST at 15 s: the berg cracks in two — a water gap opens across it and each half tilts on its own.
// Timeout tie-break: closest to the middle of the safe band.
ARENAS.iceberg = (() => {
  const C = { x: 480, y: 300 }, POOL_R = 296, O = ovalKit(C, 1.3), B0 = 252;
  let bergR, holeR, tilt, beans, warned, penguins, sliders, slideT, crack, tiltB;
  const grounded = (b) => b.z <= 0.5 || b.touch;
  // after the crack: which half is b on (+1/-1), how far from the crack line (circle units), and that half's tilt
  const side = (x, y) => (crack ? ((x - C.x) / O.SX) * crack.nx + (y - C.y) * crack.ny : 1);
  const tiltOf = (b) => (crack && side(b.x, b.y) < 0 ? tiltB : tilt);
  const bandMid = () => (holeR + bergR) / 2;
  return {
    key: 'iceberg', name: 'Iceberg Tilt', genre: 'Survival', theme: 'arctic', timeout: ROUND_SECONDS, maxSpeed: 185,
    objective: 'Walk uphill as the ice tips. Jump the sliding penguins. The berg cracks mid-round!',
    power: {
      kinds: ['bubble', 'zoom', 'spring'], every: [4.5, 6.5],
      spot() { for (let k = 0; k < 8; k++) { const a = rnd(0, Math.PI * 2), r = rnd(holeR + 30, Math.max(holeR + 40, bergR - 30)), q = O.pt(a, r); if (!crack || Math.abs(side(q.x, q.y)) > crack.gap + 20) return q; } return null; },
      rescue(b) { // a bubble floats you back onto the middle of the ice band, on your side of the crack
        let a = O.ang(b.x, b.y); let q = O.pt(a, bandMid());
        if (crack && Math.abs(side(q.x, q.y)) < crack.gap + 24) { a += 0.6; q = O.pt(a, bandMid()); }
        b.x = q.x; b.y = q.y; b.vx = b.vy = b.kx = b.ky = 0; b.z = 0; return true;
      },
      botGrab: 70,
    },
    init(bs) {
      beans = bs; bergR = B0; holeR = 0; tilt = { x: 0, y: 0 }; tiltB = { x: 0, y: 0 }; warned = false; sliders = []; slideT = 2.6; crack = null;
      placeRing(beans, C.x, C.y, 128 * O.SX, 128, rnd(0, Math.PI * 2));
      penguins = Array.from({ length: 5 }, (_, i) => { const a = rnd(0, Math.PI * 2), r = rnd(258, 282); return { x: C.x + Math.cos(a) * r * 1.4, y: C.y + Math.sin(a) * r, ph: rnd(0, 6), s: rnd(0.8, 1.05) }; });
    },
    mods() { return { traction: 0.35 }; },
    update(dt, t) {
      bergR = clamp(B0 - Math.max(0, t - 4.5) * 5.2, 128, B0);
      if (!warned && t > 5.5) { warned = true; announce('CENTRE MELTING!', '#9fe8ff', 'Stay on the ring of ice'); }
      holeR = clamp((t - 7) * 3.6, 0, 66);
      // the crack (twist): a gap across the berg; each half tilts toward its own crowd
      if (!crack && t >= 15) {
        const a = rnd(0, Math.PI); crack = { nx: Math.cos(a), ny: Math.sin(a), gap: 7 };
        tiltB = { ...tilt }; announce('TWIST: THE BERG CRACKS!', '#9fe8ff', 'each half tips on its own');
        shake(5); sparks(C.x, C.y - 10, 24, ['#ffffff', '#9fe8ff'], 300, 0.6);
      }
      if (crack) crack.gap = Math.min(15, crack.gap + dt * 1.2);
      const sw = 0.14 + t * 0.026, sa = t * 0.8;
      for (const half of crack ? [1, -1] : [0]) {
        let wx = 0, wy = 0, n = 0;
        for (const b of beans) if (b.alive && b.z <= 0.5 && (!half || Math.sign(side(b.x, b.y)) === half)) { wx += (b.x - C.x) / (bergR * O.SX); wy += (b.y - C.y) / bergR; n++; }
        const swA = sa + (half < 0 ? 2.1 : 0), k = half ? 1.6 : 1.3;
        const target = { x: wx / Math.max(2, n) * k + Math.cos(swA) * sw, y: wy / Math.max(2, n) * k + Math.sin(swA) * sw };
        const tl = half < 0 ? tiltB : tilt;
        tl.x += (target.x - tl.x) * Math.min(1, dt * 2); tl.y += (target.y - tl.y) * Math.min(1, dt * 2);
      }
      // belly-sliding penguins: wave from the rim (telegraph), then zoom straight across
      if (t > 2.5 && (slideT -= dt) <= 0) {
        slideT = rnd(2.2, 3.4) * (t > 15 ? 0.8 : 1);
        const a = rnd(0, Math.PI * 2), st = O.pt(a, bergR + 28), live = beans.filter((b) => b.alive);
        const aim = live.length && Math.random() < 0.55 ? live[(Math.random() * live.length) | 0] : O.pt(rnd(0, Math.PI * 2), rnd(0, bergR * 0.6));
        const d = norm(aim.x - st.x, aim.y - st.y);
        sliders.push({ x: st.x, y: st.y, vx: d.x * 285, vy: d.y * 285, warn: 0.95, life: 3.2, s: rnd(1.25, 1.45) });
      }
      for (const p of sliders) { if (p.warn > 0) p.warn -= dt; else { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } }
      sliders = sliders.filter((p) => p.life > 0);
      for (const b of beans) {
        if (!b.alive) continue;
        const tl = tiltOf(b);
        if (b.z <= 0.5) { b.x += tl.x * 175 * dt; b.y += tl.y * 175 * dt; }
        for (const p of sliders) if (p.warn <= 0 && b.z < 14 && b.hitCd <= 0 && hyp(b.x - p.x, b.y - p.y) < 20 + R) {
          if (shielded(b)) continue;
          b.kx += p.vx * 1.15; b.ky += p.vy * 1.15; b.stun = 0.35; b.hitCd = 0.6; b.scaredT = 0.6;
          sparks(b.x, b.y - 12, 8, ['#ffffff', '#9fe8ff'], 180, 0.35); if (b.human) { popText(b.x, b.y - 36, 'PENGUINED!', '#9fe8ff', 16); beep(300, 0.08, 'square', 0.05); }
        }
        const r = O.d(b.x, b.y), inGap = crack && Math.abs(side(b.x, b.y)) < crack.gap && r < bergR;
        if (grounded(b) && (r > bergR || r < holeR - 4 || inGap)) { puff(b.x, b.y, 8, 'rgba(220,245,255,.8)', 110, 7, 0.5); ring(b.x, b.y, 'rgba(255,255,255,.8)', 6, 40, 0.4, 3); kill(b, t); }
      }
      for (const p of penguins) p.ph += dt;
    },
    botInput(b, t) {
      const dx0 = (b.x - C.x) / O.SX, dy0 = b.y - C.y, r = Math.max(1, hyp(dx0, dy0)), ux = dx0 / r, uy = dy0 / r;
      const want = bandMid(), radial = clamp((want - r) / 60, -1.5, 1.5);
      const tl = tiltOf(b);
      let x = -tl.x * (1.2 + b.skill) + ux * radial * (0.6 + b.skill * 0.5), y = -tl.y * (1.2 + b.skill) + uy * radial * (0.6 + b.skill * 0.5), jump = false;
      // keep clear of the crack (stay on our side)
      if (crack) { const sd = side(b.x, b.y), sg = sd >= 0 ? 1 : -1; if (Math.abs(sd) < crack.gap + 50) { const w = (1.4 - Math.abs(sd) / (crack.gap + 50)) * (0.6 + b.skill * 0.8); x += crack.nx * sg * w * O.SX; y += crack.ny * sg * w; } }
      // penguins: sidestep their line, or hop at the last moment
      for (const p of sliders) {
        const sp = 285, dx = p.vx / sp, dy = p.vy / sp, rx = b.x - p.x, ry = b.y - p.y, along = rx * dx + ry * dy;
        if (along < -20) continue;
        const px = rx - dx * along, py = ry - dy * along, pd = hyp(px, py), eta = along / sp + Math.max(0, p.warn);
        if (pd < 20 + R + 18 && eta < 1.3) {
          if (eta < 0.2 && Math.random() < b.skill) jump = true;
          else { const n = pd > 1 ? { x: px / pd, y: py / pd } : { x: -dy, y: dx }, w = (0.5 + b.skill * 0.8) * (1.4 - eta); x += n.x * w; y += n.y * w; }
        }
      }
      const sep = separation(b, beans, 45); x += sep.x * 0.5; y += sep.y * 0.5;
      const d = hyp(x, y) > 1 ? norm(x, y) : { x, y };
      return { x: d.x, y: d.y, jump, dive: false };
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
      if (crack) { // the water gap across the berg, with jagged ice lips
        ctx.save(); ctx.beginPath(); ctx.arc(C.x, C.y, bergR + 2, 0, Math.PI * 2); ctx.clip();
        ctx.translate(C.x, C.y); ctx.rotate(Math.atan2(crack.ny, crack.nx));
        ctx.fillStyle = '#0a2c4f'; ctx.fillRect(-crack.gap, -bergR - 4, crack.gap * 2, bergR * 2 + 8);
        ctx.fillStyle = mat('water'); ctx.globalAlpha = 0.6; ctx.fillRect(-crack.gap, -bergR - 4, crack.gap * 2, bergR * 2 + 8); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#e9f9ff'; ctx.lineWidth = 3;
        for (const sg of [-1, 1]) { ctx.beginPath(); for (let y = -bergR; y <= bergR; y += 14) ctx.lineTo(sg * (crack.gap + ((y * 7) % 5)), y); ctx.stroke(); }
        ctx.restore();
      }
      });
      // downhill chevrons painted across the ice, stronger with steeper tilt (one set per half after the crack)
      for (const half of crack ? [1, -1] : [0]) {
        const tv = half < 0 ? tiltB : tilt, tl2 = hyp(tv.x, tv.y); if (tl2 <= 0.06) continue;
        const dv = { x: tv.x / tl2, y: tv.y / tl2 };
        ctx.save(); ctx.beginPath(); ctx.ellipse(C.x, C.y, (bergR - 10) * O.SX, bergR - 10, 0, 0, Math.PI * 2); ctx.ellipse(C.x, C.y, (holeR + 10) * O.SX, holeR + 10, 0, 0, Math.PI * 2, true); ctx.clip();
        if (half) { // half-plane clip (in world space: the crack line is stretched by SX)
          const ax = -crack.ny * O.SX, ay = crack.nx, nxw = crack.nx / O.SX, nyw = crack.ny, L = 900;
          ctx.beginPath(); ctx.moveTo(C.x + ax * L, C.y + ay * L); ctx.lineTo(C.x - ax * L, C.y - ay * L); ctx.lineTo(C.x - ax * L + nxw * half * L * 2, C.y - ay * L + nyw * half * L * 2); ctx.lineTo(C.x + ax * L + nxw * half * L * 2, C.y + ay * L + nyw * half * L * 2); ctx.closePath(); ctx.clip();
        }
        ctx.translate(C.x, C.y); ctx.rotate(Math.atan2(dv.y, dv.x));
        ctx.strokeStyle = `rgba(255,85,125,${clamp(tl2 * 0.9, 0.12, 0.55)})`; ctx.lineWidth = 6; ctx.lineCap = 'round';
        const off = (t * 40 * (0.5 + tl2)) % 70;
        for (let yy = -bergR * O.SX; yy < bergR * O.SX; yy += 64) for (let xx = -bergR * O.SX - 70; xx < bergR * O.SX; xx += 70) { const x0 = xx + off; ctx.beginPath(); ctx.moveTo(x0 - 10, yy - 12); ctx.lineTo(x0 + 5, yy); ctx.lineTo(x0 - 10, yy + 12); ctx.stroke(); }
        ctx.restore(); ctx.lineCap = 'butt';
        if (!half) bigLabel('DOWNHILL', C.x + dv.x * (bergR + 30) * O.SX, C.y + dv.y * (bergR + 30), 'rgba(255,85,125,.85)', 12);
      }
      // belly-sliding penguins: dashed lane while they wave, then the slide
      for (const p of sliders) {
        const sp = hyp(p.vx, p.vy), dx = p.vx / sp, dy = p.vy / sp;
        if (p.warn > 0) {
          ctx.strokeStyle = `rgba(255,217,91,${0.35 + 0.35 * Math.sin(t * 20)})`; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 90;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + dx * 760, p.y + dy * 760); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
          ctx.fillStyle = 'rgba(255,217,91,.12)'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(dy, dx)); ctx.fillRect(0, -22, 760, 44); ctx.restore();
        }
        contactShadow(p.x, p.y + 4, 22, 10, 0.35);
        sprite(p.y, () => billboard(p.x, p.y, 0, () => {
          ctx.scale(p.s, p.s);
          if (p.warn > 0) { // standing on the rim, flapping, with an alert bubble
            const fl = Math.sin(t * 22) * 0.4;
            ctx.fillStyle = '#1a1f3a'; ctx.beginPath(); ctx.ellipse(0, -15, 9, 15, 0, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(-8, -16); ctx.rotate(-0.6 - fl); ctx.fillRect(-2, 0, 4, 12); ctx.restore(); ctx.save(); ctx.translate(8, -16); ctx.rotate(0.6 + fl); ctx.fillRect(-2, 0, 4, 12); ctx.restore();
            ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.ellipse(0, -12, 6, 11, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFB547'; ctx.beginPath(); ctx.moveTo(-3, -23); ctx.lineTo(3, -23); ctx.lineTo(0, -18); ctx.fill();
            glow('#FFD95B', 10, () => { ctx.fillStyle = '#FFD95B'; ctx.beginPath(); ctx.arc(0, -46, 9, 0, Math.PI * 2); ctx.fill(); });
            ctx.fillStyle = '#2a1a00'; ctx.font = '13px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, -45);
          } else { // belly-sliding
            ctx.rotate(Math.atan2(dy, dx) * 0.25);
            ctx.fillStyle = '#1a1f3a'; ctx.beginPath(); ctx.ellipse(0, -7, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.ellipse(0, -5, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFB547'; ctx.beginPath(); ctx.moveTo(dx > 0 ? 18 : -18, -8); ctx.lineTo(dx > 0 ? 24 : -24, -7); ctx.lineTo(dx > 0 ? 18 : -18, -5); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.arc(-dx * (16 + k * 9), -2, 3 - k * 0.6, 0, Math.PI * 2); ctx.fill(); }
          }
        }));
      }
      drawAll(beans);
      const alive = beans.filter((b) => b.alive).length;
      inScreen(() => { ctx.font = '12px Bungee, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText(`${alive} ABOARD`, W - 16, H - 92); });
    },
    winner(t, to) { return survivalWinner(beans, t, to, (b) => -Math.abs(O.d(b.x, b.y) - bandMid())); },
  };
})();
