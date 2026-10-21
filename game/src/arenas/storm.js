// 25 · Storm Dome — survival under a thunderstorm. Charging clouds mark lightning strikes (most of them
// track a player, so standing still gets you fried); wind gusts shove everyone toward the shrinking edge.
// Timeout tie-break: closest to the centre.
ARENAS.storm = (() => {
  const C = { x: 480, y: 300 }, O = ovalKit(C, 1.35), D0 = 268;
  let domeR, strikes, bolts, scorch, beans, spawnT, gust;
  // jagged bolt path from the sky to a floor point, in screen px relative to the strike point
  function boltPath(seed, h) {
    const pts = [[0, 0]]; let x = 0;
    srand(seed);
    for (let y = -24; y > -h; y -= 22 + prand() * 16) { x += (prand() - 0.5) * 34; pts.push([x, y]); }
    pts.push([x * 0.6, -h]);
    return pts;
  }
  return {
    key: 'storm', name: 'Storm Dome', genre: 'Survival', theme: 'night', timeout: ROUND_SECONDS, maxSpeed: 195,
    objective: 'A charging cloud means lightning lands in that ring — get out. Lean into the wind gusts. Last one standing wins.',
    init(bs) {
      beans = bs; domeR = D0; strikes = []; bolts = []; scorch = []; spawnT = 1.5;
      gust = { next: rnd(5, 7), warn: 0, on: 0, dir: { x: 1, y: 0 } };
      placeRing(beans, C.x, C.y, 130 * O.SX, 130, rnd(0, Math.PI * 2));
    },
    update(dt, t) {
      domeR = clamp(D0 - Math.max(0, t - 5) * 4.4, 165, D0);
      if ((spawnT -= dt) <= 0) {
        spawnT = Math.max(0.2, 0.8 - t * 0.035);
        const alive = beans.filter((b) => b.alive);
        const n = t > 18 ? 3 : t > 9 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          let x, y;
          if (Math.random() < 0.55 && alive.length) { const b = alive[(Math.random() * alive.length) | 0]; x = b.x + rnd(-30, 30); y = b.y + rnd(-30, 30); }
          else { const q = O.pt(rnd(0, Math.PI * 2), Math.sqrt(Math.random()) * domeR); x = q.x; y = q.y; }
          strikes.push({ x, y, r: 54, t: 1.15, T: 1.15, seed: (Math.random() * 1e9) | 0 });
        }
      }
      for (const s of strikes) {
        s.t -= dt;
        if (s.t <= 0) {
          bolts.push({ x: s.x, y: s.y, t: 0.3, seed: s.seed });
          scorch.push({ x: s.x, y: s.y, r: s.r * 0.6, t: 4 });
          sparks(s.x, s.y, 16, ['#fff', '#cfe9ff', '#FFD95B'], 300, 0.45); ring(s.x, s.y, '#cfe9ff', 8, 70, 0.3, 5);
          for (const b of beans) if (b.alive && hyp(b.x - s.x, b.y - s.y) < s.r && b.z < 40) kill(b, t, 60);
          if (beans.some((b) => b.human && hyp(b.x - s.x, b.y - s.y) < 200)) { beep(70, 0.15, 'square', 0.04); shake(3); }
        }
      }
      strikes = strikes.filter((s) => s.t > 0);
      for (const bo of bolts) bo.t -= dt; bolts = bolts.filter((bo) => bo.t > 0);
      for (const sc of scorch) sc.t -= dt; scorch = scorch.filter((sc) => sc.t > 0);
      // wind: warn, then gust
      if (gust.on > 0) gust.on -= dt;
      else if (gust.warn > 0) { gust.warn -= dt; if (gust.warn <= 0) { gust.on = 2.2; hype(0.2); } }
      else if (t > gust.next) { const a = rnd(0, Math.PI * 2); gust.dir = { x: Math.cos(a), y: Math.sin(a) }; gust.warn = 1.2; gust.next = t + 6.5; announce('WIND!', '#37D8E9', 'Lean into the arrows'); }
      if (gust.on > 0 && Math.random() < 0.6) { const p = rnd(-domeR, domeR); part({ x: C.x - gust.dir.x * domeR * O.SX + -gust.dir.y * p * O.SX, y: C.y - gust.dir.y * domeR + gust.dir.x * p, vx: gust.dir.x * 520, vy: gust.dir.y * 520, size: 2, life: 0.8, color: 'rgba(200,235,255,.55)', kind: 'spark', drag: 0 }); }
      for (const b of beans) {
        if (!b.alive) continue;
        if (gust.on > 0) { b.x += gust.dir.x * 120 * dt; b.y += gust.dir.y * 120 * dt; }
        if (b.z <= 0.5 && O.d(b.x, b.y) > domeR) kill(b, t);
      }
    },
    botInput(b, t) {
      let x = (C.x - b.x) / (domeR * O.SX) * 0.8, y = (C.y - b.y) / domeR * 0.8;
      for (const s of strikes) { const d = hyp(b.x - s.x, b.y - s.y); if (d < s.r + 30) { const w = (1 - s.t / s.T + 0.4) * 3 * (0.6 + b.skill * 0.4); const n = d > 1 ? norm(b.x - s.x, b.y - s.y) : { x: 1, y: 0 }; x += n.x * w; y += n.y * w; } }
      if (gust.on > 0 || gust.warn > 0) { x -= gust.dir.x * 1.4 * b.skill; y -= gust.dir.y * 1.4 * b.skill; }
      const sep = separation(b, beans, 45); x += sep.x; y += sep.y;
      const d = hyp(x, y) > 1 ? norm(x, y) : { x, y };
      return { x: d.x, y: d.y, jump: false, dive: false };
    },
    draw(t) {
      // ── storm deck: raised stone disc with a glowing conductor ring
      O.stretch(() => {
      platformCircle(C.x, C.y, domeR, mat('stone'), '#1b1838', 26);
      ctx.fillStyle = 'rgba(16,14,44,.35)'; ctx.beginPath(); ctx.arc(C.x, C.y, domeR, 0, Math.PI * 2); ctx.fill();
      const dg = ctx.createRadialGradient(C.x, C.y - 40, 20, C.x, C.y, domeR);
      dg.addColorStop(0, 'rgba(120,140,255,.18)'); dg.addColorStop(1, 'rgba(10,8,30,.45)');
      ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(C.x, C.y, domeR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(160,190,255,.12)'; ctx.lineWidth = 2; for (let r = 50; r < domeR; r += 50) { ctx.beginPath(); ctx.arc(C.x, C.y, r, 0, Math.PI * 2); ctx.stroke(); }
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ctx.strokeStyle = 'rgba(160,190,255,.12)'; ctx.beginPath(); ctx.moveTo(C.x, C.y); ctx.lineTo(C.x + Math.cos(a) * domeR, C.y + Math.sin(a) * domeR); ctx.stroke(); }
      });
      // scorch marks
      for (const sc of scorch) { const a = clamp(sc.t / 4, 0, 1); const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, sc.r); g.addColorStop(0, `rgba(5,5,12,${0.75 * a})`); g.addColorStop(0.6, `rgba(40,30,60,${0.4 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.r, 0, Math.PI * 2); ctx.fill(); }
      O.stretch(() => {
      // shrinking edge telegraph
      if (t > 5 && domeR > 171) { ctx.strokeStyle = `rgba(255,181,71,${0.45 + 0.25 * Math.sin(t * 8)})`; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(C.x, C.y, domeR - 6, 0, Math.PI * 2); ctx.stroke(); }
      glow('#8F75FF', 14, () => { ctx.strokeStyle = '#a99bff'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(C.x, C.y, domeR - 1, 0, Math.PI * 2); ctx.stroke(); });
      });
      // wind arrows painted on the deck while a gust is coming / blowing
      if (gust.warn > 0 || gust.on > 0) {
        const ang = Math.atan2(gust.dir.y, gust.dir.x), on = gust.on > 0;
        ctx.save(); ctx.beginPath(); ctx.ellipse(C.x, C.y, (domeR - 6) * O.SX, domeR - 6, 0, 0, Math.PI * 2); ctx.clip();
        ctx.translate(C.x, C.y); ctx.rotate(ang);
        ctx.strokeStyle = on ? 'rgba(160,230,255,.55)' : `rgba(160,230,255,${0.25 + 0.2 * Math.sin(t * 14)})`; ctx.lineWidth = 7; ctx.lineCap = 'round';
        const off = (t * (on ? 220 : 60)) % 90;
        for (let yy = -domeR * O.SX; yy < domeR * O.SX; yy += 70) for (let xx = -domeR * O.SX - 90; xx < domeR * O.SX; xx += 90) { const x0 = xx + off; ctx.beginPath(); ctx.moveTo(x0 - 12, yy - 14); ctx.lineTo(x0 + 6, yy); ctx.lineTo(x0 - 12, yy + 14); ctx.stroke(); }
        ctx.restore(); ctx.lineCap = 'butt';
      }
      // strike telegraphs on the floor + a charging cloud above each
      for (const s of strikes) {
        const p = 1 - s.t / s.T;
        ctx.fillStyle = `rgba(255,217,91,${0.1 + p * 0.38})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.25 + p * 0.75), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = p > 0.7 && Math.sin(t * 40) > 0 ? '#fff' : '#FFD95B'; ctx.lineWidth = 3; ctx.setLineDash([9, 6]); ctx.lineDashOffset = -t * 40;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        if (p > 0.55) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; srand(s.seed + ((t * 20) | 0)); ctx.beginPath(); for (let k = 0; k < 3; k++) { let x = s.x, y = s.y; ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (prand() - 0.5) * 30; y += (prand() - 0.5) * 30; ctx.lineTo(x, y); } } ctx.stroke(); }
        sprite(s.y - 0.5, () => billboard(s.x, s.y, 0, () => {
          const cz = 92 + Math.sin(t * 3 + s.seed) * 3;
          const cg = ctx.createLinearGradient(0, -cz, 0, 0); cg.addColorStop(0, `rgba(255,230,140,${0.05 + p * 0.3})`); cg.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = cg; ctx.fillRect(-s.r * 0.35, -cz, s.r * 0.7, cz);
          ctx.translate(0, -cz);
          for (let k = 0; k < 5; k++) { const cx = (k - 2) * 15, cy = Math.abs(k - 2) * 4; const g = ctx.createRadialGradient(cx - 4, cy - 6, 2, cx, cy, 22); g.addColorStop(0, '#5b5f8f'); g.addColorStop(1, '#22233f'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 20 - Math.abs(k - 2) * 2, 0, Math.PI * 2); ctx.fill(); }
          if (Math.sin(t * 30 + s.seed) > 0.4 - p) additive(() => { const g = ctx.createRadialGradient(0, 4, 0, 0, 4, 40); g.addColorStop(0, `rgba(255,240,180,${0.35 + p * 0.5})`); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.fillRect(-40, -36, 80, 80); });
        }));
      }
      // bolts: sky to floor, depth-sorted at the strike point
      for (const bo of bolts) {
        lightPool(bo.x, bo.y, 120, '#dff0ff', bo.t * 2.2);
        sprite(bo.y, () => billboard(bo.x, bo.y, 0, () => {
          const pts = boltPath(bo.seed, 360), a = clamp(bo.t / 0.3, 0, 1);
          additive(() => {
            for (const [wdt, al, col] of [[16, 0.2, '#9fc4ff'], [6, 0.6, '#cfe0ff'], [2.4, 1, '#ffffff']]) {
              ctx.globalAlpha = al * a; ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.lineJoin = 'round';
              ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
            }
            ctx.globalAlpha = 1;
          });
        }));
      }
      drawAll(beans);
      if (bolts.length) inScreen(() => { ctx.fillStyle = `rgba(220,235,255,${Math.min(0.18, bolts.reduce((m, b) => Math.max(m, b.t), 0) * 0.5)})`; ctx.fillRect(0, 0, W, H); });
      const alive = beans.filter((b) => b.alive).length;
      inScreen(() => { ctx.font = '12px Bungee, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(`${alive} STANDING`, W - 16, H - 92); });
    },
    winner(t, to) { return survivalWinner(beans, t, to, (b) => -O.d(b.x, b.y)); },
  };
})();
