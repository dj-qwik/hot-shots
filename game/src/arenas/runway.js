// 01 · Rocket Runway — sprint up a launch deck. Pads pulse green (launch) / red (knock back) on a beat,
// mills sweep lanes, bumper walls alternate sides and laser gates zap anyone who jumps through them.
// Mid-deck the runway SPLITS: one side is a fast conveyor shortcut through slamming pistons, the other a
// safe but slower slalom. At 15 s OVERDRIVE kicks in: the beat, gates, mills and pistons all speed up.
// Anti-exploit: pad rows shift their gaps every row (no straight line), walls block each edge in turn,
// pads count the instant you land (b.touch), and the gates punish bunny-hopping.
ARENAS.runway = (() => {
  const LEN = 3450, L = 200, Rt = 760, PH = 54, GZ = 50; // GZ: laser height
  const LAYOUTS = [
    { xs: [255, 395, 565, 705], w: 100 },
    { xs: [290, 480, 670], w: 150 },
    { xs: [270, 420, 580, 725], w: 110 },
  ];
  function gapsOf(row) {
    const g = [], half = row.w / 2;
    let prev = L;
    for (const x of row.xs) { if (x - half - prev >= 2 * R + 4) g.push((prev + x - half) / 2); prev = x + half; }
    if (Rt - prev >= 2 * R + 4) g.push((prev + Rt) / 2);
    return g;
  }
  let rows, mills, walls, gates, beans, camY, rate, clock, zone, pistons, overdrive;
  // every cycle runs on `clock` (game time scaled by `rate`), so OVERDRIVE can speed the whole deck up.
  // `ahead` = seconds of real time to look into the future (bots).
  const padPh = (row, ahead = 0) => (clock + ahead * rate + row.ph) % 1.7;
  const padGreen = (row, ahead) => padPh(row, ahead) < 0.75;
  const padSoon = (row) => { const p = padPh(row); return (p > 0.55 && p < 0.75) || p > 1.5; };
  const GP = 2.2, GON = 1.1, GWARN = 0.5;
  const gatePh = (g, ahead = 0) => (clock + ahead * rate + g.ph) % GP;
  const gateOn = (g, ahead) => gatePh(g, ahead) < GON;
  const gateWarn = (g) => gatePh(g) > GP - GWARN;
  // shortcut pistons: 2 s cycle, slam for 0.6 s, amber warning 0.5 s before
  const PP = 2, PON = 0.6, PWARN = 0.5, CONV = 170;
  const pistPh = (p, ahead = 0) => (clock + ahead * rate + p.ph) % PP;
  const pistOn = (p, ahead) => pistPh(p, ahead) < PON;
  const pistWarn = (p) => pistPh(p) > PP - PWARN;
  const inZone = (y) => zone && y < zone.bot && y > zone.top;
  const shortSide = (x) => (zone.side < 0 ? x < 480 : x > 480);
  const laneOf = (b) => { if (!inZone(b.y)) return [L, Rt]; return b.x < 480 ? [L, 470] : [490, Rt]; };
  const grounded = (b) => b.z <= 0.5 || b.touch;
  return {
    cam() { return camY; },
    key: 'runway', name: 'Rocket Runway', genre: 'Sprint', theme: 'space', timeout: ROUND_SECONDS, maxSpeed: 220,
    objective: 'First to the beacon. Green pads launch you, red knock you back, gates zap jumpers. Mid-deck, pick the fast conveyor through the pistons or the safe slalom.',
    power: {
      kinds: ['zoom', 'bubble'], every: [4, 6],
      spot() {
        const ys = beans.map((b) => b.y).sort((a, c) => a - c), y = (ys[ys.length >> 1] ?? LEN) - rnd(160, 420);
        if (y < 200 || y > LEN - 200) return null;
        return { x: inZone(y) ? (Math.random() < 0.5 ? rnd(L + 40, 440) : rnd(520, Rt - 40)) : rnd(L + 40, Rt - 40), y };
      },
    },
    init(bs) {
      beans = bs; rows = []; mills = []; walls = []; gates = []; pistons = []; rate = 1; clock = 0; overdrive = false;
      // the split: between the 3rd and 4th pad rows, replacing that block's wall / mill / gate
      zone = { bot: LEN - 1475, top: LEN - 1845, side: Math.random() < 0.5 ? -1 : 1 };
      const sx1 = zone.side < 0 ? L : 490, sx2 = zone.side < 0 ? 470 : Rt; // shortcut lane
      const fx1 = zone.side < 0 ? 490 : L, fx2 = zone.side < 0 ? Rt : 470; // safe slalom lane
      walls.push({ x1: 470, x2: 490, y: (zone.bot + zone.top) / 2, h: zone.bot - zone.top, divider: true });
      const inner = zone.side < 0 ? fx1 : fx2, outer = zone.side < 0 ? fx2 : fx1;
      for (const [k2, fromInner] of [[0, true], [1, false], [2, true]]) {
        const y = zone.bot - 85 - k2 * 105, a = fromInner ? inner : outer, bnd = fromInner ? outer : inner;
        walls.push({ x1: Math.min(a, a + (bnd - a) * 0.66), x2: Math.max(a, a + (bnd - a) * 0.66), y, h: 20, slalom: true });
      }
      const ph0 = rnd(0, PP);
      for (let k2 = 0; k2 < 3; k2++) pistons.push({ y: zone.bot - 70 - k2 * 115, x1: sx1, x2: sx2, ph: (ph0 + k2 * 0.62) % PP });
      let k = 0;
      for (let y = LEN - 560; y > 520; y -= 440, k++) {
        rows.push({ y, ph: Math.random() * 1.7, ...LAYOUTS[k % 3] });
        if (y < zone.bot + 60 && y - 330 > zone.top - 60) continue; // the split replaces this block's hazards
        if (y - 110 > 300) walls.push(k % 2 ? { x1: L, x2: L + 170, y: y - 110, h: 22 } : { x1: Rt - 170, x2: Rt, y: y - 110, h: 22 });
        if (y - 220 > 400) mills.push({ x: [480, 330, 630][k % 3], y: y - 220, a: rnd(0, 6.3), w: (k % 2 ? 1 : -1) * (1.9 + k * 0.06), arm: 125 });
        if (y - 330 > 300) gates.push({ y: y - 330, ph: rnd(0, GP) });
      }
      const n = beans.length;
      beans.forEach((b, i) => { b.x = L + 40 + (i + 0.5) * (Rt - L - 80) / n; b.y = LEN - 120; b.fy = -1; b.fx = 0; b.prevY = b.y; b.wob = rnd(0, 6.3); b.route = null; });
      camY = LEN - 660;
    },
    update(dt, t) {
      if (!overdrive && t >= 15) { overdrive = true; rate = 1.45; announce('TWIST: OVERDRIVE!', '#ff5ad1'); }
      clock += dt * rate;
      for (const m of mills) m.a += m.w * dt * rate;
      for (const b of beans) for (const wl of walls) {
        const cx = clamp(b.x, wl.x1, wl.x2), cy = clamp(b.y, wl.y - wl.h / 2, wl.y + wl.h / 2);
        const dx = b.x - cx, dy = b.y - cy, d = hyp(dx, dy);
        if (d < R) { if (d > 0.01) { b.x = cx + dx / d * R; b.y = cy + dy / d * R; } else b.y = wl.y + wl.h / 2 + R; if (b.ky < 0) b.ky = 0; }
      }
      for (const b of beans) {
        b.x = clamp(b.x, L + R, Rt - R); b.y = clamp(b.y, 60, LEN - 40);
        if (grounded(b) && b.padCd <= 0) {
          for (const row of rows) {
            if (Math.abs(b.y - row.y) > PH / 2) continue;
            for (const px of row.xs) if (Math.abs(b.x - px) < row.w / 2) {
              if (padGreen(row)) { b.ky = -820; b.vz = 160; b.padCd = 0.6; b.happyT = 0.6; ring(px, row.y, '#3fcf8e', 10, 70, 0.35, 4); if (b.human) beep(880, 0.07, 'sine', 0.05); }
              else if (shielded(b)) b.padCd = 0.6;
              else { b.ky = 600; b.stun = 0.8; b.padCd = 0.6; b.scaredT = 0.6; sparks(b.x, b.y - 8, 6, ['#ff3d5a', '#FFD95B'], 160, 0.3); if (b.human) { beep(120, 0.1, 'sawtooth', 0.04); shake(2); } }
            }
          }
        }
        // laser gates: zap airborne beans crossing an active beam
        for (const g of gates) {
          const crossed = (b.prevY - g.y) * (b.y - g.y) <= 0 || Math.abs(b.y - g.y) < 8;
          if (crossed && b.z > 10 && gateOn(g) && b.hitCd <= 0 && !shielded(b)) {
            b.vz = Math.min(b.vz, -150); b.ky = 380; b.stun = 0.75; b.hitCd = 0.8; b.scaredT = 0.9;
            sparks(b.x, b.y - lift(GZ), 12, ['#fff', '#ff5ad1', '#8F75FF'], 220, 0.4);
            if (b.human) { popText(b.x, b.y - 46, 'ZAPPED!', '#ff5ad1', 18); beep(1400, 0.08, 'square', 0.04); shake(4); }
          }
        }
        b.prevY = b.y;
        // the shortcut: a conveyor hurries you forward through slamming pistons
        if (inZone(b.y) && shortSide(b.x)) {
          if (grounded(b) && b.stun <= 0) b.y -= CONV * rate * dt;
          if (b.hitCd <= 0 && b.z < 60) for (const p of pistons) if (pistOn(p) && Math.abs(b.y - p.y) < 14 + R && !shielded(b)) {
            b.ky = 620; b.stun = 0.85; b.hitCd = 0.9; b.scaredT = 0.8; b.vz = 0;
            sparks(b.x, b.y - 14, 10, ['#FFD95B', '#fff', '#ff3d5a'], 220, 0.35);
            if (b.human) { popText(b.x, b.y - 40, 'SLAMMED!', '#FFD95B', 18); beep(110, 0.12, 'sawtooth', 0.05); shake(4); }
            break;
          }
        }
        for (const m of mills) {
          const dHub = hyp(b.x - m.x, b.y - m.y);
          if (dHub < 18 + R) { const n = norm(b.x - m.x, b.y - m.y); b.x = m.x + n.x * (18 + R); b.y = m.y + n.y * (18 + R); }
          if (b.z > 14 || b.hitCd > 0) continue;
          for (const off of [0, Math.PI]) {
            const ax = m.x + Math.cos(m.a + off) * m.arm, ay = m.y + Math.sin(m.a + off) * m.arm;
            if (segDist(b.x, b.y, m.x, m.y, ax, ay) < R + 6 && !shielded(b)) {
              const tang = { x: -Math.sin(m.a + off) * Math.sign(m.w), y: Math.cos(m.a + off) * Math.sign(m.w) };
              b.kx += tang.x * 420; b.ky += tang.y * 420 + 120; b.stun = 0.45; b.hitCd = 0.7; b.scaredT = 0.6;
              sparks(b.x, b.y - 12, 6, ['#FFD95B', '#fff'], 180, 0.3);
              if (b.human) { beep(140, 0.1, 'triangle', 0.05); shake(3); }
            }
          }
        }
      }
      camY = followCam(beans, camY, LEN, dt);
    },
    botInput(b, t) {
      let tx = b.tx || b.x, jump = false, up = -1;
      const [lx, rx] = laneOf(b);
      // the split: pick a route on approach (bolder, better bots take the shortcut more often)
      if (!b.route && b.y < zone.bot + 220 && b.y > zone.bot) b.route = Math.random() < 0.25 + b.skill * 0.5 ? 'short' : 'safe';
      if (b.y < zone.top) b.route = null;
      if (b.route && b.y > zone.top - 10) {
        const short = b.route === 'short', sx = zone.side < 0 ? (short ? 330 : 625) : (short ? 625 : 330);
        if (b.y > zone.bot - 4) tx = sx;
        if (inZone(b.y) && short) {
          // wait (lean back against the belt) if the next piston will be slamming when we reach it
          const p = pistons.find((q) => q.y < b.y + 4 && b.y - q.y < 95);
          if (p && (pistOn(p, (b.y - p.y) / 390) || pistOn(p, (b.y - p.y) / 390 + 0.15)) && Math.random() < 0.35 + b.skill * 0.65) up = 0.75;
          tx = sx;
        }
      }
      const wall = walls.find((wl) => !wl.divider && wl.y < b.y && b.y - wl.y < 160 && wl.x2 > lx && wl.x1 < rx);
      const ahead = rows.find((r) => r.y < b.y - 5 && b.y - r.y < 170);
      if (ahead && !inZone(b.y)) {
        const willBeGreen = padGreen(ahead, (b.y - ahead.y) / 210);
        if (willBeGreen) tx = ahead.xs.reduce((a, p) => (Math.abs(p - b.x) < Math.abs(a - b.x) ? p : a), ahead.xs[0]);
        else {
          const gaps = gapsOf(ahead); tx = gaps.reduce((a, p) => (Math.abs(p - b.x) < Math.abs(a - b.x) ? p : a), gaps[0]);
          if (b.y - ahead.y < PH / 2 + 22 && Math.random() < b.skill * 0.25) jump = true;
        }
      }
      for (const m of mills) {
        if (Math.abs(b.y - m.y) < m.arm + 30) {
          for (const off of [0, Math.PI]) {
            const ax = m.x + Math.cos(m.a + off) * m.arm, ay = m.y + Math.sin(m.a + off) * m.arm;
            if (segDist(b.x, b.y, m.x, m.y, ax, ay) < 34 && Math.random() < b.skill * 0.5) jump = true;
          }
        }
      }
      // never jump into a live (or about-to-be-live) laser gate
      const g = gates.find((x) => x.y < b.y + 10 && b.y - x.y < 150);
      if (jump && g && (gateOn(g) || gateOn(g, 0.7)) && Math.random() < 0.4 + b.skill * 0.6) jump = false;
      if (wall && b.x > wall.x1 - R - 6 && b.x < wall.x2 + R + 6) tx = wall.x1 - lx > rx - wall.x2 ? (lx + wall.x1) / 2 : (wall.x2 + rx) / 2;
      b.tx = clamp(tx + Math.sin(t * 1.3 + b.wob) * 14, lx + R, rx - R);
      const d = norm(clamp((b.tx - b.x) / 50, -1, 1), up);
      return { x: d.x, y: d.y, jump, dive: Math.random() < 0.004 };
    },
    draw(t) {
      const y0 = camY - 10, y1 = camY + 700;
      ctx.save(); ctx.beginPath(); ctx.rect(-400, camY - 5, W + 800, 1400); ctx.clip();
      // launch deck: raised metal runway with neon edge rails
      ctx.fillStyle = 'rgba(0,0,10,.5)'; ctx.fillRect(L - 30, y0, Rt - L + 60, y1 - y0);
      ctx.fillStyle = '#121638'; ctx.fillRect(L - 14, y0, Rt - L + 28, y1 - y0);
      ctx.fillStyle = mat('metal'); ctx.fillRect(L, y0, Rt - L, y1 - y0);
      ctx.fillStyle = 'rgba(20,26,80,.55)'; ctx.fillRect(L, y0, Rt - L, y1 - y0);
      const sg = ctx.createLinearGradient(L, 0, Rt, 0); sg.addColorStop(0, 'rgba(143,117,255,.16)'); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,20,.3)');
      ctx.fillStyle = sg; ctx.fillRect(L, y0, Rt - L, y1 - y0);
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
      for (let y = Math.floor(y0 / 80) * 80; y < y1; y += 80) { ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(Rt, y); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(55,216,233,.3)'; ctx.lineWidth = 4; ctx.setLineDash([26, 22]); ctx.lineDashOffset = -t * 60;
      ctx.beginPath(); ctx.moveTo(480, y0); ctx.lineTo(480, y1); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      for (const x of [L - 7, Rt + 7]) glow('#8F75FF', 14, () => { ctx.fillStyle = '#8F75FF'; ctx.fillRect(x - 3, y0, 6, y1 - y0); });
      additive(() => { for (let y = Math.floor(y0 / 60) * 60; y < y1; y += 60) { const on = ((y / 60 + Math.floor(t * 8)) % 6) === 0; ctx.fillStyle = on ? 'rgba(200,190,255,.9)' : 'rgba(143,117,255,.35)'; ctx.fillRect(L - 9, y, 4, 22); ctx.fillRect(Rt + 5, y + 30, 4, 22); } });
      // start + beacon pads
      if (y1 > LEN - 200) { platformRect(L + 10, LEN - 190, Rt - L - 20, 140, mat('tile'), '#1b2050', 8, 10); bigLabel('LAUNCH', 480, LEN - 120, 'rgba(255,255,255,.5)', 26); }
      if (y0 < 300) { lightPool(480, 100, 300, 'rgba(126,226,184,1)', 0.4); platformRect(L + 10, 40, Rt - L - 20, 100, mat('neon'), '#123a33', 8, 10); ctx.fillStyle = 'rgba(126,226,184,.22)'; ctx.fillRect(L + 10, 40, Rt - L - 20, 100); bigLabel('BEACON', 480, 112, '#7EE2B8', 24); }
      // pads: extruded glowing slabs
      for (const row of rows) {
        if (row.y < y0 - 60 || row.y > y1 + 60) continue;
        const green = padGreen(row), soon = padSoon(row), col = green ? '#3fcf8e' : '#ff3d5a';
        for (const px of row.xs) lightPool(px, row.y, row.w * 0.75, green ? 'rgba(63,207,142,1)' : 'rgba(255,61,90,1)', 0.35);
        for (const px of row.xs) {
          const x0 = px - row.w / 2, yy = row.y - PH / 2;
          ctx.fillStyle = green ? '#145c3d' : '#6a1726'; roundRect(x0, yy + lift(8), row.w, PH, 10); ctx.fill();
          const pg = ctx.createLinearGradient(0, yy, 0, yy + PH); pg.addColorStop(0, green ? '#6dfab8' : '#ff7a8e'); pg.addColorStop(1, col);
          glow(col, 16, () => { ctx.fillStyle = pg; roundRect(x0, yy, row.w, PH, 10); ctx.fill(); });
          ctx.fillStyle = 'rgba(255,255,255,.25)'; roundRect(x0 + 6, yy + 4, row.w - 12, 7, 4); ctx.fill();
          if (soon) { ctx.strokeStyle = Math.sin(t * 30) > 0 ? '#FFD95B' : '#fff'; ctx.lineWidth = 4; roundRect(x0, yy, row.w, PH, 10); ctx.stroke(); }
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          if (green) { const o = (t * 40) % 14; for (let k = 0; k < 2; k++) { const ay = row.y + 8 - k * 14 - o; ctx.beginPath(); ctx.moveTo(px, ay - 9); ctx.lineTo(px + 11, ay + 2); ctx.lineTo(px - 11, ay + 2); ctx.closePath(); ctx.fill(); } }
          else { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px - 8, row.y - 8); ctx.lineTo(px + 8, row.y + 8); ctx.moveTo(px + 8, row.y - 8); ctx.lineTo(px - 8, row.y + 8); ctx.stroke(); ctx.lineCap = 'butt'; }
        }
      }
      // gate floor strips + mill shadows
      for (const g of gates) {
        if (g.y < y0 - 20 || g.y > y1 + 20) continue;
        const on = gateOn(g), warn = gateWarn(g);
        ctx.fillStyle = on ? 'rgba(255,90,209,.35)' : warn ? 'rgba(255,217,91,.3)' : 'rgba(143,117,255,.15)'; ctx.fillRect(L, g.y - 6, Rt - L, 12);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let x = L + 6; x < Rt; x += 28) ctx.fillRect(x, g.y - 6, 14, 12);
        if (on) lightPool(480, g.y, 260, 'rgba(255,90,209,1)', 0.25);
        bigLabel(on ? 'NO JUMPING' : warn ? 'LASER ARMING' : 'LASER GATE', 480, g.y + 24, on ? 'rgba(255,140,220,.9)' : 'rgba(255,255,255,.45)', 12);
      }
      // the split: conveyor shortcut (moving chevrons + piston slots) and the safe slalom
      if (zone.bot > y0 - 40 && zone.top < y1 + 40) {
        const sx1 = zone.side < 0 ? L : 490, sx2 = zone.side < 0 ? 470 : Rt, h = zone.bot - zone.top;
        ctx.fillStyle = '#0d1030'; ctx.fillRect(sx1, zone.top, sx2 - sx1, h);
        ctx.fillStyle = mat('rubber'); ctx.globalAlpha = 0.6; ctx.fillRect(sx1, zone.top, sx2 - sx1, h); ctx.globalAlpha = 1;
        const off = (clock * CONV) % 46;
        ctx.fillStyle = 'rgba(55,216,233,.28)';
        for (let y = zone.bot - off; y > zone.top + 10; y -= 46) { const cx = (sx1 + sx2) / 2; ctx.beginPath(); ctx.moveTo(cx, y - 14); ctx.lineTo(cx + 60, y + 10); ctx.lineTo(cx + 40, y + 10); ctx.lineTo(cx, y - 6); ctx.lineTo(cx - 40, y + 10); ctx.lineTo(cx - 60, y + 10); ctx.closePath(); ctx.fill(); }
        for (const pi of pistons) {
          const on = pistOn(pi), warn = pistWarn(pi);
          ctx.fillStyle = on ? 'rgba(255,61,90,.45)' : warn ? (Math.sin(t * 30) > 0 ? 'rgba(255,217,91,.55)' : 'rgba(255,217,91,.2)') : 'rgba(0,0,0,.35)';
          ctx.fillRect(pi.x1 + 4, pi.y - 12, pi.x2 - pi.x1 - 8, 24);
          ctx.fillStyle = 'rgba(255,217,91,.5)'; for (let x = pi.x1 + 8; x < pi.x2 - 16; x += 24) ctx.fillRect(x, pi.y - 12, 12, 4);
        }
        // divider rail
        ctx.fillStyle = '#2b2266'; ctx.fillRect(470, zone.top, 20, h + lift(6));
        glow('#8F75FF', 12, () => { ctx.fillStyle = '#a48dff'; ctx.fillRect(472, zone.top - lift(10), 16, h); });
        const bx = (sx1 + sx2) / 2, fxm = zone.side < 0 ? (490 + Rt) / 2 : (L + 470) / 2;
        bigLabel('SHORTCUT', bx, zone.bot - 28, 'rgba(55,216,233,.9)', 16); bigLabel('SAFE', fxm, zone.bot - 28, 'rgba(126,226,184,.85)', 16);
      }
      for (const m of mills) if (m.y > y0 - 160 && m.y < y1 + 160) for (const off of [0, Math.PI]) {
        ctx.strokeStyle = 'rgba(0,0,10,.35)'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m.x + 6, m.y + 6); ctx.lineTo(m.x + 6 + Math.cos(m.a + off) * m.arm, m.y + 6 + Math.sin(m.a + off) * m.arm); ctx.stroke(); ctx.lineCap = 'butt';
      }
      ctx.restore();
      // upright: walls, mills, gate posts + beams, beacon tower
      const ups = [];
      const vis = (y) => y > camY + 30 && y < y1 + 40;
      for (const pi of pistons) if (pistOn(pi) && vis(pi.y)) ups.push({ y: pi.y, draw: () => billboard((pi.x1 + pi.x2) / 2, pi.y, 0, () => {
        const k = Math.min(1, pistPh(pi) / 0.08), w = pi.x2 - pi.x1 - 10;
        box(w, 22, 44 * k, '#ffd95b', '#c98a12', { r: 4 });
        ctx.fillStyle = '#2a2200'; for (let x = -w / 2 + 6; x < w / 2 - 12; x += 26) { ctx.beginPath(); ctx.moveTo(x, -44 * k + 6); ctx.lineTo(x + 12, -44 * k + 6); ctx.lineTo(x + 20, -6); ctx.lineTo(x + 8, -6); ctx.closePath(); ctx.fill(); }
      }) });
      for (const wl of walls) if (!wl.divider && vis(wl.y)) ups.push({ y: wl.y, draw: () => billboard((wl.x1 + wl.x2) / 2, wl.y, 0, () => {
        box(wl.x2 - wl.x1, wl.h, 30, '#a48dff', '#5a43c9', { r: 6 });
        ctx.fillStyle = '#FFD95B'; for (let x = -(wl.x2 - wl.x1) / 2 + 8; x < (wl.x2 - wl.x1) / 2 - 16; x += 26) { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + 12, -4); ctx.lineTo(x + 22, -24); ctx.lineTo(x + 10, -24); ctx.closePath(); ctx.fill(); }
      }) });
      for (const m of mills) if (m.y > camY - 140 && m.y < y1 + 40) ups.push({ y: m.y, draw: () => {
        const az = 22;
        ctx.save(); ctx.beginPath(); ctx.rect(-400, camY - 5, W + 800, 1400); ctx.clip();
        for (const off of [0, Math.PI]) {
          const ax = m.x + Math.cos(m.a + off) * m.arm, ay = m.y + Math.sin(m.a + off) * m.arm;
          ctx.strokeStyle = '#a07a12'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m.x, m.y - lift(az) + 3); ctx.lineTo(ax, ay - lift(az) + 3); ctx.stroke();
          ctx.strokeStyle = '#FFD95B'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(m.x, m.y - lift(az)); ctx.lineTo(ax, ay - lift(az)); ctx.stroke();
          ctx.strokeStyle = '#2a2200'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
          billboard(ax, ay, az, () => glow('#ff3d5a', 10, () => { ctx.fillStyle = '#ff6b80'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); }));
        }
        if (m.y > camY + 30) billboard(m.x, m.y, 0, () => { ctx.fillStyle = '#3b2f8f'; roundRect(-12, -34, 24, 34, 6); ctx.fill(); ctx.translate(0, -30); sphere(14, '#8F75FF'); });
        ctx.restore();
      } });
      for (const g of gates) if (vis(g.y)) {
        const on = gateOn(g), warn = gateWarn(g);
        ups.push({ y: g.y, draw: () => {
          for (const x of [L - 8, Rt + 8]) billboard(x, g.y, 0, () => {
            ctx.fillStyle = '#20264f'; roundRect(-8, -80, 16, 80, 4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(-6, -78, 3, 76);
            glow(on ? '#ff5ad1' : warn ? '#FFD95B' : '#8F75FF', 12, () => { ctx.fillStyle = on ? '#ff9be6' : warn ? '#FFD95B' : '#6b5ad1'; ctx.beginPath(); ctx.arc(0, -lift(GZ) * TILT, 7, 0, Math.PI * 2); ctx.fill(); });
          });
          const by = g.y - lift(GZ);
          if (on) additive(() => {
            ctx.strokeStyle = 'rgba(255,90,209,.45)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(L - 8, by); ctx.lineTo(Rt + 8, by); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,230,250,.95)'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = L - 8; x <= Rt + 8; x += 20) ctx.lineTo(x, by + Math.sin(x * 0.2 + t * 50) * 1.5); ctx.stroke();
          });
          else if (warn && Math.sin(t * 40) > 0) { ctx.strokeStyle = 'rgba(255,217,91,.7)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(L - 8, by); ctx.lineTo(Rt + 8, by); ctx.stroke(); ctx.setLineDash([]); }
        } });
      }
      if (camY < 320) ups.push({ y: 60, draw: () => billboard(480, 60, 0, () => {
        ctx.fillStyle = '#1f254d'; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-10, -110); ctx.lineTo(10, -110); ctx.lineTo(26, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(143,117,255,.6)'; ctx.lineWidth = 2; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-24 + k * 3.2, -k * 22); ctx.lineTo(24 - k * 3.2, -k * 22 - 22); ctx.stroke(); }
        const p = 1 + Math.sin(t * 6) * 0.2;
        additive(() => { const gg = ctx.createRadialGradient(0, -122, 0, 0, -122, 60 * p); gg.addColorStop(0, 'rgba(126,226,184,.9)'); gg.addColorStop(1, 'rgba(126,226,184,0)'); ctx.fillStyle = gg; ctx.fillRect(-70, -190, 140, 140); });
        ctx.translate(0, -122); sphere(14 * p, '#7EE2B8');
      }) });
      drawAll(beans, ups);
      progressStrip(beans, LEN, 140);
    },
    winner(t, timedOut) {
      const done = beans.filter((b) => b.y < 140).sort((a, b) => a.y - b.y);
      if (done.length) return done[0];
      if (timedOut) return [...beans].sort((a, b) => a.y - b.y)[0];
      return null;
    },
  };
})();
