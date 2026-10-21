// 26 · Marble Madness — survival on a wooden game board. Giant marbles shoot out of launch chutes on
// every side; a lit lane + arrow shows where each one will roll a second before it fires. Big marbles
// must be dodged; small ones can be jumped. More and faster marbles over time.
// Timeout tie-break: closest to the board centre.
ARENAS.marbles = (() => {
  const X1 = 80, X2 = 880, Y1 = 70, Y2 = 530, CX = 480, CY = 300;
  let marbles, beans, spawnT;
  const COLS = ['#FF557D', '#37D8E9', '#FFD95B', '#8F75FF', '#7EE2B8', '#FFB547'];
  function spawn() {
    const big = Math.random() < 0.6, r = big ? rnd(42, 56) : 21, sp = big ? rnd(230, 300) : rnd(300, 380);
    const side = (Math.random() * 4) | 0; let x, y, vx, vy;
    if (side === 0) { x = X1 - r - 40; y = rnd(Y1 + 30, Y2 - 30); vx = sp; vy = 0; }
    else if (side === 1) { x = X2 + r + 40; y = rnd(Y1 + 30, Y2 - 30); vx = -sp; vy = 0; }
    else if (side === 2) { y = Y1 - r - 40; x = rnd(X1 + 30, X2 - 30); vy = sp; vx = 0; }
    else { y = Y2 + r + 40; x = rnd(X1 + 30, X2 - 30); vy = -sp; vx = 0; }
    marbles.push({ x, y, vx, vy, r, big, warn: 1.0, rot: rnd(0, 6), c: COLS[(Math.random() * COLS.length) | 0], fired: false });
  }
  // a shaded glass marble with a swirl that rolls with its travel
  function drawMarble(m) {
    const sp = hyp(m.vx, m.vy), dx = m.vx / sp, dy = m.vy / sp;
    sphere(m.r, m.c);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, m.r * 0.98, 0, Math.PI * 2); ctx.clip();
    const ph = m.rot % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = m.r * 0.22;
    // swirl band: moves across the sphere along the roll direction
    const off = Math.cos(ph) * m.r * 0.9, vis = Math.sin(ph) > 0;
    if (vis) { ctx.beginPath(); ctx.ellipse(dx * off, dy * off * 0.9, m.r * (dy ? 1 : 0.35 + 0.6 * Math.abs(Math.sin(ph))), m.r * (dx ? 1 : 0.35 + 0.6 * Math.abs(Math.sin(ph))), 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-m.r * 0.38, -m.r * 0.45, m.r * 0.18, m.r * 0.11, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  return {
    key: 'marbles', name: 'Marble Madness', genre: 'Survival', theme: 'sunset', timeout: ROUND_SECONDS, maxSpeed: 205,
    objective: 'Marbles fire from the chutes along the lit lanes. Dodge the giant ones. Jump the small ones.',
    init(bs) { beans = bs; marbles = []; spawnT = 1.0; placeRing(beans, CX, CY, 130, 100, rnd(0, Math.PI * 2)); },
    update(dt, t) {
      if ((spawnT -= dt) <= 0) { spawnT = Math.max(0.25, 1.0 - t * 0.04); spawn(); if (t > 9 && Math.random() < 0.6) spawn(); if (t > 18) spawn(); }
      for (const m of marbles) {
        if (m.warn > 0) { m.warn -= dt; continue; }
        if (!m.fired) { m.fired = true; puff(clamp(m.x, X1, X2), clamp(m.y, Y1, Y2), 5, 'rgba(255,230,190,.7)', 80, 6, 0.35); }
        m.x += m.vx * dt; m.y += m.vy * dt; m.rot += hyp(m.vx, m.vy) * dt / m.r;
      }
      marbles = marbles.filter((m) => m.warn > 0 || (m.x > X1 - 200 && m.x < X2 + 200 && m.y > Y1 - 200 && m.y < Y2 + 200));
      for (const b of beans) {
        if (!b.alive) continue;
        b.x = clamp(b.x, X1 + R, X2 - R); b.y = clamp(b.y, Y1 + R, Y2 - R);
        for (const m of marbles) if (m.warn <= 0 && hyp(b.x - m.x, b.y - m.y) < m.r + R - 4 && (m.big || b.z < 16)) { sparks(b.x, b.y - 16, 10, [m.c, '#fff'], 240, 0.4); kill(b, t, 80); break; }
      }
    },
    botInput(b, t) {
      let x = (CX - b.x) * 0.004, y = (CY - b.y) * 0.004, jump = false;
      for (const m of marbles) {
        const sp = hyp(m.vx, m.vy), dir = { x: m.vx / sp, y: m.vy / sp };
        const rel = { x: b.x - m.x, y: b.y - m.y }, along = rel.x * dir.x + rel.y * dir.y;
        if (along < -m.r) continue; // already past
        const perp = { x: rel.x - dir.x * along, y: rel.y - dir.y * along }, pd = hyp(perp.x, perp.y);
        const eta = (along - m.r) / sp + Math.max(0, m.warn);
        if (pd < m.r + R + 26 && eta < 1.6) {
          if (!m.big && eta < 0.18 && Math.random() < b.skill) jump = true;
          else if (m.big || eta > 0.5) { const n = pd > 1 ? { x: perp.x / pd, y: perp.y / pd } : { x: -dir.y, y: dir.x }; const w = (0.6 + b.skill * 0.6) * (1.6 - eta); x += n.x * w; y += n.y * w; }
        }
      }
      const sep = separation(b, beans, 40); x += sep.x * 0.6; y += sep.y * 0.6;
      const d = hyp(x, y) > 1 ? norm(x, y) : { x, y };
      return { x: d.x, y: d.y, jump, dive: false };
    },
    draw(t) {
      // ── the board: thick wooden slab with a felt play field and raised rails
      platformRect(X1 - 26, Y1 - 26, X2 - X1 + 52, Y2 - Y1 + 52, mat('wood'), '#6e4524', 26, 18);
      ctx.fillStyle = mat('felt'); ctx.fillRect(X1, Y1, X2 - X1, Y2 - Y1);
      const fg = ctx.createRadialGradient(CX, CY, 60, CX, CY, 520); fg.addColorStop(0, 'rgba(255,240,200,.12)'); fg.addColorStop(1, 'rgba(0,20,10,.35)');
      ctx.fillStyle = fg; ctx.fillRect(X1, Y1, X2 - X1, Y2 - Y1);
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2;
      for (let x = X1 + 80; x < X2; x += 80) { ctx.beginPath(); ctx.moveTo(x, Y1); ctx.lineTo(x, Y2); ctx.stroke(); }
      for (let y = Y1 + 76; y < Y2; y += 76) { ctx.beginPath(); ctx.moveTo(X1, y); ctx.lineTo(X2, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,217,91,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(CX, CY, 70, 0, Math.PI * 2); ctx.stroke();
      bigLabel('MARBLE MADNESS', CX, CY, 'rgba(255,217,91,.25)', 26);
      // inner rail shadow + rail lip
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 8; ctx.strokeRect(X1 + 3, Y1 + 3, X2 - X1 - 6, Y2 - Y1 - 6);
      ctx.strokeStyle = '#d29760'; ctx.lineWidth = 3; ctx.strokeRect(X1 - 1, Y1 - 1, X2 - X1 + 2, Y2 - Y1 + 2);
      // ── lane telegraphs + launch chutes (glow when about to fire)
      for (const m of marbles) if (m.warn > 0) {
        const sp = hyp(m.vx, m.vy), dir = { x: m.vx / sp, y: m.vy / sp }, k = 1 - m.warn;
        const col = m.big ? '255,85,125' : '255,217,91';
        ctx.fillStyle = `rgba(${col},${0.1 + 0.16 * k + 0.08 * Math.sin(t * 24)})`;
        if (dir.x) ctx.fillRect(X1, m.y - m.r, X2 - X1, m.r * 2); else ctx.fillRect(m.x - m.r, Y1, m.r * 2, Y2 - Y1);
        ctx.strokeStyle = `rgba(${col},.75)`; ctx.lineWidth = 2; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 120 * (dir.x + dir.y);
        if (dir.x) { ctx.beginPath(); ctx.moveTo(X1, m.y - m.r); ctx.lineTo(X2, m.y - m.r); ctx.moveTo(X1, m.y + m.r); ctx.lineTo(X2, m.y + m.r); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(m.x - m.r, Y1); ctx.lineTo(m.x - m.r, Y2); ctx.moveTo(m.x + m.r, Y1); ctx.lineTo(m.x + m.r, Y2); ctx.stroke(); }
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        // chevrons along the lane
        ctx.fillStyle = `rgba(${col},.55)`;
        for (let s = 0; s < 6; s++) { const f = ((s / 6) + t * 0.8) % 1; const px = dir.x ? (dir.x > 0 ? X1 + f * (X2 - X1) : X2 - f * (X2 - X1)) : m.x; const py = dir.y ? (dir.y > 0 ? Y1 + f * (Y2 - Y1) : Y2 - f * (Y2 - Y1)) : m.y; ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(dir.y, dir.x)); ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(8, 0); ctx.lineTo(-8, 12); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill(); ctx.restore(); }
        if (!m.big) { const ex = clamp(m.x, X1 + 40, X2 - 40), ey = clamp(m.y, Y1 + 30, Y2 - 30); bigLabel('JUMP', ex + (dir.y ? 36 : 0), ey + (dir.x ? 0 : 0) - (dir.x ? m.r + 12 : 0), '#FFD95B', 13); }
        // the chute on the rail
        const cxp = clamp(m.x, X1 - 14, X2 + 14), cyp = clamp(m.y, Y1 - 14, Y2 + 14);
        sprite(cyp, () => billboard(cxp, cyp, 0, () => {
          box(m.r * 2 + 14, 22, 26, '#3a2a1f', '#2a1c12', { r: 5 });
          ctx.fillStyle = '#0b0805'; ctx.beginPath(); ctx.ellipse(0, -26, m.r * 0.9, 6, 0, 0, Math.PI * 2); ctx.fill();
          glow(m.big ? '#FF557D' : '#FFD95B', 12, () => { ctx.fillStyle = m.big ? '#FF557D' : '#FFD95B'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 22); roundRect(-m.r - 4, -6, m.r * 2 + 8, 5, 2); ctx.fill(); ctx.globalAlpha = 1; });
        }));
      }
      // ── marbles (shadow on the felt, sphere upright)
      for (const m of marbles) {
        if (m.warn > 0 || m.x < X1 - m.r || m.x > X2 + m.r || m.y < Y1 - m.r || m.y > Y2 + m.r) continue; // still inside its chute
        contactShadow(m.x + 6, m.y + 4, m.r * 1.15, m.r * 0.8, 0.4);
        sprite(m.y, () => billboard(m.x, m.y, m.r, () => drawMarble(m)));
      }
      drawAll(beans);
      const alive = beans.filter((b) => b.alive).length;
      inScreen(() => { ctx.font = '12px Bungee, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(`${alive} STANDING`, W - 16, H - 92); });
    },
    winner(t, to) { return survivalWinner(beans, t, to, (b) => -hyp(b.x - CX, b.y - CY)); },
  };
})();
