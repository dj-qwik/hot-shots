// 26 · Marble Madness — survival on a wooden pinball board. Giant marbles shoot out of launch chutes on every
// side and RICOCHET off pop bumpers (a different set every round): the lit lane shows the marble's whole
// path, bounces included, a second before it fires. Bumpers also boing players away, so they're cover AND a
// hazard. Big marbles must be dodged (a super jump clears them); small ones can be hopped.
// TWIST at 15 s: the board tilts — everyone slides downhill and has to walk against it.
// Timeout tie-break: closest to the board centre.
ARENAS.marbles = (() => {
  const X1 = 80, X2 = 880, Y1 = 70, Y2 = 530, CX = 480, CY = 300, BR = 24;
  let marbles, beans, spawnT, bumpers, tilt, tiltK, twisted;
  const COLS = ['#FF557D', '#37D8E9', '#FFD95B', '#8F75FF', '#7EE2B8', '#FFB547'];
  const inBoard = (m, pad = 200) => m.x > X1 - pad && m.x < X2 + pad && m.y > Y1 - pad && m.y < Y2 + pad;
  // one physics step for a marble: move, bounce off pop bumpers. Same code predicts the telegraphed path.
  function advance(m, dt, live) {
    m.x += m.vx * dt; m.y += m.vy * dt;
    for (const bp of bumpers) {
      const dx = m.x - bp.x, dy = m.y - bp.y, d = hyp(dx, dy), min = m.r + BR;
      if (d < min && d > 0.01) {
        const nx = dx / d, ny = dy / d, vn = m.vx * nx + m.vy * ny;
        if (vn < 0) { m.vx -= 2 * vn * nx; m.vy -= 2 * vn * ny; }
        m.x = bp.x + nx * min; m.y = bp.y + ny * min;
        if (live) { m.seg++; bp.flash = 0.25; sparks(bp.x, bp.y - 20, 6, ['#fff', bp.c], 160, 0.3); }
        return true;
      }
    }
    return false;
  }
  function tracePath(m) {
    const g = { x: m.x, y: m.y, vx: m.vx, vy: m.vy, r: m.r }, pts = [{ x: g.x, y: g.y }];
    for (let k = 0; k < 420; k++) { if (advance(g, 1 / 60, false)) pts.push({ x: g.x, y: g.y }); if (!inBoard(g, m.r + 60)) break; }
    pts.push({ x: g.x, y: g.y });
    return pts;
  }
  function spawn() {
    const big = Math.random() < 0.6, r = big ? rnd(42, 56) : 21, sp = big ? rnd(230, 300) : rnd(300, 380);
    const side = (Math.random() * 4) | 0; let x, y, vx, vy;
    if (side === 0) { x = X1 - r - 40; y = rnd(Y1 + 30, Y2 - 30); vx = sp; vy = 0; }
    else if (side === 1) { x = X2 + r + 40; y = rnd(Y1 + 30, Y2 - 30); vx = -sp; vy = 0; }
    else if (side === 2) { y = Y1 - r - 40; x = rnd(X1 + 30, X2 - 30); vy = sp; vx = 0; }
    else { y = Y2 + r + 40; x = rnd(X1 + 30, X2 - 30); vy = -sp; vx = 0; }
    const m = { x, y, vx, vy, r, big, warn: 1.0, rot: rnd(0, 6), c: COLS[(Math.random() * COLS.length) | 0], fired: false, seg: 0 };
    m.path = tracePath(m);
    marbles.push(m);
  }
  // a shaded glass marble with a swirl that rolls with its travel
  function drawMarble(m) {
    const sp = hyp(m.vx, m.vy), dx = m.vx / sp, dy = m.vy / sp;
    sphere(m.r, m.c);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, m.r * 0.98, 0, Math.PI * 2); ctx.clip();
    const ph = m.rot % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = m.r * 0.22;
    const off = Math.cos(ph) * m.r * 0.9, vis = Math.sin(ph) > 0;
    if (vis) { ctx.beginPath(); ctx.ellipse(dx * off, dy * off * 0.9, m.r * (0.35 + 0.65 * Math.abs(dy)), m.r * (0.35 + 0.65 * Math.abs(dx)), 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-m.r * 0.38, -m.r * 0.45, m.r * 0.18, m.r * 0.11, -0.6, 0, Math.PI * 2); ctx.fill();
  }
  // distance from point p to segment a-b, and how far along (0..1)
  function segInfo(p, a, b) {
    const ux = b.x - a.x, uy = b.y - a.y, L2 = ux * ux + uy * uy || 1;
    const f = clamp(((p.x - a.x) * ux + (p.y - a.y) * uy) / L2, 0, 1), qx = a.x + ux * f, qy = a.y + uy * f;
    return { d: hyp(p.x - qx, p.y - qy), f, qx, qy, len: Math.sqrt(L2), ux, uy };
  }
  const grounded = (b) => b.z <= 0.5 || b.touch;
  return {
    key: 'marbles', name: 'Marble Madness', genre: 'Survival', theme: 'sunset', timeout: ROUND_SECONDS, maxSpeed: 205,
    objective: 'Marbles bounce off the bumpers, so follow the lit paths. Dodge big ones, hop small ones. Mid-round the board tilts.',
    power: {
      kinds: ['bubble', 'zoom', 'spring'], every: [4.5, 6.5],
      spot() { for (let k = 0; k < 10; k++) { const x = rnd(X1 + 60, X2 - 60), y = rnd(Y1 + 50, Y2 - 50); if (bumpers.every((bp) => hyp(bp.x - x, bp.y - y) > 70)) return { x, y }; } return null; },
      botGrab: 90,
    },
    init(bs) {
      beans = bs; marbles = []; spawnT = 1.0; bumpers = []; tilt = { x: 0, y: 0 }; tiltK = 0; twisted = false;
      const n = 3 + ((Math.random() * 2) | 0);
      for (let tries = 0; bumpers.length < n && tries < 200; tries++) {
        const x = rnd(X1 + 90, X2 - 90), y = rnd(Y1 + 70, Y2 - 70);
        if (hyp((x - CX) * 0.8, y - CY) < 150 || bumpers.some((bp) => hyp(bp.x - x, bp.y - y) < 190)) continue;
        bumpers.push({ x, y, flash: 0, c: COLS[bumpers.length % COLS.length] });
      }
      placeRing(beans, CX, CY, 130, 100, rnd(0, Math.PI * 2));
    },
    update(dt, t) {
      if (!twisted && t >= 15) {
        twisted = true;
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]], d = dirs[(Math.random() * dirs.length) | 0];
        tilt = { x: d[0], y: d[1] }; announce('TWIST: THE BOARD TILTS!', '#FFD95B', 'walk uphill');
      }
      if (twisted) tiltK = Math.min(1, tiltK + dt);
      if ((spawnT -= dt) <= 0) { spawnT = Math.max(0.24, 1.0 - t * 0.04); spawn(); if (t > 9 && Math.random() < 0.6) spawn(); if (t > 17) spawn(); if (t > 23) spawn(); }
      for (const bp of bumpers) bp.flash -= dt;
      for (const m of marbles) {
        if (m.warn > 0) { m.warn -= dt; continue; }
        if (!m.fired) { m.fired = true; puff(clamp(m.x, X1, X2), clamp(m.y, Y1, Y2), 5, 'rgba(255,230,190,.7)', 80, 6, 0.35); }
        advance(m, dt, true); m.rot += hyp(m.vx, m.vy) * dt / m.r;
      }
      marbles = marbles.filter((m) => m.warn > 0 || inBoard(m));
      for (const b of beans) {
        if (!b.alive) continue;
        // the tilt: everything on the felt slides downhill
        if (tiltK > 0 && grounded(b)) { b.x += tilt.x * 78 * tiltK * dt; b.y += tilt.y * 78 * tiltK * dt; }
        b.x = clamp(b.x, X1 + R, X2 - R); b.y = clamp(b.y, Y1 + R, Y2 - R);
        // pop bumpers: boing!
        for (const bp of bumpers) {
          const dx = b.x - bp.x, dy = b.y - bp.y, d = hyp(dx, dy), min = BR + R;
          if (d < min && d > 0.01) {
            const nx = dx / d, ny = dy / d; b.x = bp.x + nx * min; b.y = bp.y + ny * min;
            if (b.hitCd <= 0) { b.kx += nx * 430; b.ky += ny * 430; b.hitCd = 0.25; b.scaredT = 0.3; bp.flash = 0.25; if (b.human) beep(620, 0.06, 'square', 0.04); }
          }
        }
        for (const m of marbles) {
          if (m.warn > 0 || hyp(b.x - m.x, b.y - m.y) >= m.r + R - 4) continue;
          const clear = m.big ? b.z > 90 : b.z >= 16 && !b.touch; // only a super jump clears a giant marble
          if (clear) continue;
          if (shielded(b)) { b.kx += Math.sign(m.vx) * 300; b.ky += Math.sign(m.vy) * 300; break; }
          sparks(b.x, b.y - 16, 10, [m.c, '#fff'], 240, 0.4); kill(b, t, 80); break;
        }
      }
    },
    botInput(b, t) {
      let x = (CX - b.x) * 0.004, y = (CY - b.y) * 0.004, jump = false;
      // lean into the tilt (better players lean harder)
      x -= tilt.x * tiltK * (0.5 + b.skill * 0.5); y -= tilt.y * tiltK * (0.5 + b.skill * 0.5);
      for (const m of marbles) {
        // walk the predicted path from where the marble is now; the first stretch that comes near us decides
        const sp = hyp(m.vx, m.vy) || 1; let acc = 0;
        for (let i = Math.min(m.seg, m.path.length - 2); i < m.path.length - 1; i++) {
          const a = i === m.seg ? m : m.path[i], s = segInfo(b, a, m.path[i + 1]);
          const along = acc + s.f * s.len; acc += s.len;
          const eta = along / sp + Math.max(0, m.warn);
          if (s.d < m.r + R + 26 && eta < 1.6) {
            if (!m.big && eta < 0.18 && Math.random() < b.skill) jump = true;
            else if (m.big || eta > 0.5) { const px = b.x - s.qx, py = b.y - s.qy, pd = hyp(px, py); const n = pd > 1 ? { x: px / pd, y: py / pd } : { x: -s.uy / s.len, y: s.ux / s.len }; const w = (0.6 + b.skill * 0.6) * (1.6 - eta); x += n.x * w; y += n.y * w; }
            break;
          }
        }
      }
      for (const bp of bumpers) { const dx = b.x - bp.x, dy = b.y - bp.y, d = hyp(dx, dy); if (d < 70 && d > 1) { x += dx / d * 0.5 * b.skill; y += dy / d * 0.5 * b.skill; } }
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
      if (tiltK > 0) { // the low side darkens; arrows point downhill
        const tg = ctx.createLinearGradient(CX - tilt.x * 420, CY - tilt.y * 240, CX + tilt.x * 420, CY + tilt.y * 240);
        tg.addColorStop(0, 'rgba(255,240,200,0)'); tg.addColorStop(1, `rgba(0,0,0,${0.32 * tiltK})`);
        ctx.fillStyle = tg; ctx.fillRect(X1, Y1, X2 - X1, Y2 - Y1);
        ctx.fillStyle = `rgba(255,217,91,${0.18 * tiltK})`;
        for (let gx = X1 + 100; gx < X2; gx += 200) for (let gy = Y1 + 80; gy < Y2; gy += 150) { const ph = ((t * 0.9) % 1) * 30; ctx.save(); ctx.translate(gx + tilt.x * ph, gy + tilt.y * ph); ctx.rotate(Math.atan2(tilt.y, tilt.x)); ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-6, -16); ctx.lineTo(-6, 16); ctx.closePath(); ctx.fill(); ctx.restore(); }
      }
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2;
      for (let x = X1 + 80; x < X2; x += 80) { ctx.beginPath(); ctx.moveTo(x, Y1); ctx.lineTo(x, Y2); ctx.stroke(); }
      for (let y = Y1 + 76; y < Y2; y += 76) { ctx.beginPath(); ctx.moveTo(X1, y); ctx.lineTo(X2, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,217,91,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(CX, CY, 70, 0, Math.PI * 2); ctx.stroke();
      bigLabel('MARBLE MADNESS', CX, CY, 'rgba(255,217,91,.25)', 26);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 8; ctx.strokeRect(X1 + 3, Y1 + 3, X2 - X1 - 6, Y2 - Y1 - 6);
      ctx.strokeStyle = '#d29760'; ctx.lineWidth = 3; ctx.strokeRect(X1 - 1, Y1 - 1, X2 - X1 + 2, Y2 - Y1 + 2);
      // ── lane telegraphs along the whole predicted path (bounces included) + launch chutes
      ctx.save(); ctx.beginPath(); ctx.rect(X1, Y1, X2 - X1, Y2 - Y1); ctx.clip();
      for (const m of marbles) if (m.warn > 0) {
        const k = 1 - m.warn, col = m.big ? '255,85,125' : '255,217,91';
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath(); m.path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.strokeStyle = `rgba(${col},${0.12 + 0.16 * k + 0.08 * Math.sin(t * 24)})`; ctx.lineWidth = m.r * 2; ctx.stroke();
        ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 120; ctx.strokeStyle = `rgba(${col},.8)`; ctx.lineWidth = 2; ctx.stroke();
        ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.lineCap = 'butt';
        // chevrons along the path
        let total = 0; const segs = []; for (let i = 0; i < m.path.length - 1; i++) { const a = m.path[i], c = m.path[i + 1], l = hyp(c.x - a.x, c.y - a.y); segs.push({ a, c, l, s: total }); total += l; }
        ctx.fillStyle = `rgba(${col},.6)`;
        for (let s = 0; s < 9; s++) {
          const dist = ((s / 9) + t * 0.6) % 1 * total, sg = segs.find((g) => dist >= g.s && dist <= g.s + g.l); if (!sg || !sg.l) continue;
          const f = (dist - sg.s) / sg.l, px = sg.a.x + (sg.c.x - sg.a.x) * f, py = sg.a.y + (sg.c.y - sg.a.y) * f;
          ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(sg.c.y - sg.a.y, sg.c.x - sg.a.x)); ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(8, 0); ctx.lineTo(-8, 12); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        if (!m.big) { const p1 = m.path[1] || m.path[0], ex = clamp((m.path[0].x + p1.x) / 2, X1 + 40, X2 - 40), ey = clamp((m.path[0].y + p1.y) / 2, Y1 + 30, Y2 - 30); bigLabel('JUMP', ex, ey - 26, '#FFD95B', 13); }
      }
      ctx.restore();
      for (const m of marbles) if (m.warn > 0) {
        const cxp = clamp(m.x, X1 - 14, X2 + 14), cyp = clamp(m.y, Y1 - 14, Y2 + 14);
        sprite(cyp, () => billboard(cxp, cyp, 0, () => {
          box(m.r * 2 + 14, 22, 26, '#3a2a1f', '#2a1c12', { r: 5 });
          ctx.fillStyle = '#0b0805'; ctx.beginPath(); ctx.ellipse(0, -26, m.r * 0.9, 6, 0, 0, Math.PI * 2); ctx.fill();
          glow(m.big ? '#FF557D' : '#FFD95B', 12, () => { ctx.fillStyle = m.big ? '#FF557D' : '#FFD95B'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 22); roundRect(-m.r - 4, -6, m.r * 2 + 8, 5, 2); ctx.fill(); ctx.globalAlpha = 1; });
        }));
      }
      // ── pop bumpers
      for (const bp of bumpers) {
        contactShadow(bp.x + 4, bp.y + 6, BR * 1.4, BR * 0.8, 0.45);
        const lit = bp.flash > 0;
        sprite(bp.y, () => billboard(bp.x, bp.y, 0, () => {
          ctx.fillStyle = '#1b1d33'; ctx.beginPath(); ctx.ellipse(0, 0, BR + 4, (BR + 4) * 0.55, 0, 0, Math.PI * 2); ctx.fill();
          box(BR * 2, BR * 1.1, 16, '#e8ecff', '#9aa2c8', { r: BR * 0.55 });
          ctx.translate(0, -16);
          glow(bp.c, lit ? 26 : 10, () => { ctx.fillStyle = lit ? '#ffffff' : bp.c; ctx.beginPath(); ctx.ellipse(0, 0, BR, BR * 0.55, 0, 0, Math.PI * 2); ctx.fill(); });
          ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.ellipse(-BR * 0.35, -BR * 0.18, BR * 0.3, BR * 0.12, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = lit ? bp.c : 'rgba(20,20,40,.6)'; ctx.font = '10px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('POP', 0, 1);
        }));
      }
      // ── marbles (shadow on the felt, sphere upright)
      for (const m of marbles) {
        if (m.warn > 0 || m.x < X1 - m.r || m.x > X2 + m.r || m.y < Y1 - m.r || m.y > Y2 + m.r) continue;
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
