// 08 · Turbo Turnpike — three laps of a drifty oval. Boost strips on the straights, oil slicks on the
// inside line, grass is slow, slipstream lets you pass.
// Anti-exploit: progress is counted by 8 track sectors that must be crossed in order ON the tarmac —
// cutting the infield or spinning in the middle counts for nothing.
ARENAS.turnpike = (() => {
  const C = { x: 480, y: 300 }, OR = { x: 440, y: 270 }, IR = { x: 250, y: 110 }, MID = { x: 345, y: 190 }, LAPS = 3, SECT = 8;
  const SW = (2 * Math.PI) / SECT;
  const BOOSTS = [-Math.PI / 2, Math.PI / 2 + 0.55];
  let beans, oils, skids, lastLap;
  const sq = (v) => v * v, e = (b, r) => sq((b.x - C.x) / r.x) + sq((b.y - C.y) / r.y);
  const angOf = (x, y) => Math.atan2((y - C.y) / MID.y, (x - C.x) / MID.x);
  const tangent = (a) => norm(-MID.x * Math.sin(a), MID.y * Math.cos(a));
  const onTrack = (b) => e(b, IR) >= 0.96 && e(b, OR) <= 1.04;
  const sectorOf = (x, y) => { let a = angOf(x, y); if (a < 0) a += Math.PI * 2; return Math.floor(a / SW) % SECT; };
  const ptAt = (a, rf) => ({ x: C.x + Math.cos(a) * MID.x * rf, y: C.y + Math.sin(a) * MID.y * rf });
  const oilAt = (b) => oils.find((o) => sq((b.x - o.x) / o.rx) + sq((b.y - o.y) / o.ry) < 1);
  function progOf(b) { let a = angOf(b.x, b.y); if (a < 0) a += Math.PI * 2; let f = a / SW - b.secIdx; if (f < -1) f += SECT; return (b.sec + clamp(f, 0, 0.99)) * SW; }
  // ellipse ring band (wall) between z = 0 and z = hz, for angles a0..a1, drawn in world space
  function wallBand(a0, a1, rx, ry, hz, face, topCol) {
    const steps = 10;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; ctx.lineTo(C.x + Math.cos(a) * rx, C.y + Math.sin(a) * ry); }
    for (let i = steps; i >= 0; i--) { const a = a0 + (a1 - a0) * i / steps; ctx.lineTo(C.x + Math.cos(a) * rx, C.y + Math.sin(a) * ry - lift(hz)); }
    ctx.closePath(); ctx.fillStyle = face; ctx.fill();
    ctx.beginPath(); for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; ctx.lineTo(C.x + Math.cos(a) * rx, C.y + Math.sin(a) * ry - lift(hz)); }
    ctx.strokeStyle = topCol; ctx.lineWidth = 3; ctx.stroke();
  }
  function barrier(front) {
    // outer barrier with sponsor panels; back half drawn before the track, front half after the beans
    const rx = OR.x + 18, ry = OR.y + 18, n = 24;
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, mid = (a0 + a1) / 2;
      if ((Math.sin(mid) > 0) !== front) continue;
      const shadeF = 0.75 + 0.25 * Math.max(0, -Math.cos(mid));
      wallBand(a0, a1 + 0.002, rx, ry, 18, k % 2 ? shade('#FF557D', shadeF) : shade('#e8ecff', shadeF), 'rgba(255,255,255,.6)');
    }
  }
  return {
    key: 'turnpike', name: 'Turbo Turnpike', genre: 'Race', theme: 'meadow', timeout: ROUND_SECONDS, maxSpeed: 255,
    objective: 'Three laps, clockwise, on the tarmac. Hit the boost strips and dodge the oil on the inside line. Tuck in behind someone to slipstream past.',
    init(bs) {
      beans = bs; lastLap = false;
      beans.forEach((b, i) => {
        b.x = 515 + Math.floor(i / 4) * 34; b.y = C.y + IR.y + 28 + (i % 4) * 36;
        b.sec = 0; b.secIdx = sectorOf(b.x, b.y); b.prog = 0; b.fx = -1; b.fy = 0; b.boostCd = 0; b.linePh = rnd(0, 6.3); b.spin = 0;
      });
      // oil slicks on the inside line, away from the start grid and the boosts
      oils = []; skids = [];
      const used = [];
      let guard = 0;
      while (oils.length < 3 && guard++ < 500) {
        const a = rnd(0, Math.PI * 2);
        if (Math.abs(angDiff(a, Math.PI / 2)) < 0.7 || used.some((u) => Math.abs(angDiff(a, u)) < 1.2) || BOOSTS.some((bo) => Math.abs(angDiff(a, bo)) < 0.45)) continue;
        used.push(a); const p = ptAt(a, rnd(0.8, 0.88)); oils.push({ ...p, rx: rnd(36, 46), ry: rnd(24, 30), a });
      }
      for (let k = 0; k < 10; k++) skids.push({ a: rnd(0, Math.PI * 2), rf: rnd(0.8, 1.15), len: rnd(0.15, 0.35) });
    },
    mods(b) {
      if (b.z <= 0.5 && oilAt(b)) return { traction: 0.04 };
      const onGrass = e(b, IR) < 1 || e(b, OR) > 1; return onGrass ? { slow: 0.42, traction: 0.8 } : { traction: 0.42 };
    },
    update(dt, t) {
      for (const b of beans) {
        // outer wall
        const q = e(b, { x: OR.x + 14, y: OR.y + 14 });
        if (q > 1) { const s = 1 / Math.sqrt(q); b.x = C.x + (b.x - C.x) * s; b.y = C.y + (b.y - C.y) * s; b.vx *= 0.55; b.vy *= 0.55; if (b.hitCd <= 0) { sparks(b.x, b.y - 10, 5, ['#fff', '#FFD95B'], 160, 0.3); b.hitCd = 0.3; } }
        // sector progress: only adjacent sectors, only on tarmac
        if (onTrack(b)) {
          const idx = sectorOf(b.x, b.y);
          if (idx === (b.secIdx + 1) % SECT) { b.sec++; b.secIdx = idx; }
          else if (idx === (b.secIdx + SECT - 1) % SECT) { b.sec--; b.secIdx = idx; }
        }
        b.prog = progOf(b);
        if (oilAt(b) && b.z <= 0.5 && hyp(b.vx, b.vy) > 120 && b.spin <= 0) { b.spin = 0.6; b.scaredT = 0.6; if (b.human) popText(b.x, b.y - 36, 'OIL!', '#c9cfe8', 16); }
        b.spin -= dt;
        // slipstream: tuck in right behind someone and you get pulled along (+~12%)
        b.draft = false;
        for (const o of beans) if (o !== b) { const dx = o.x - b.x, dy = o.y - b.y, along = dx * b.fx + dy * b.fy, side = Math.abs(dx * b.fy - dy * b.fx); if (along > 18 && along < 80 && side < 18) { b.kx += b.fx * 150 * dt; b.ky += b.fy * 150 * dt; b.draft = true; break; } }
        b.boostCd -= dt;
        if (b.z <= 0.5 && b.boostCd <= 0) for (const ba of BOOSTS) {
          const px = C.x + Math.cos(ba) * MID.x, py = C.y + Math.sin(ba) * MID.y;
          if (hyp(b.x - px, b.y - py) < 44) { const tg = tangent(ba); b.kx += tg.x * 430; b.ky += tg.y * 430; b.boostCd = 0.8; ring(px, py, '#37D8E9', 10, 60, 0.35, 4); if (b.human) beep(900, 0.08, 'sine', 0.05); }
        }
      }
      const lead = Math.max(...beans.map((b) => b.sec));
      if (!lastLap && lead >= (LAPS - 1) * SECT + 1) { lastLap = true; announce('FINAL LAP!', '#FFD95B'); }
    },
    botInput(b, t) {
      const a = angOf(b.x, b.y) + 0.5;
      let rf = 1 - 0.12 * b.skill + 0.06 * Math.sin(t * 0.6 + b.linePh); // better drivers hug the inside line
      const tgt0 = ptAt(a, rf);
      if (oils.some((o) => hyp(o.x - tgt0.x, o.y - tgt0.y) < o.rx + 26) && Math.random() < 0.35 + b.skill * 0.65) rf += 0.17; // swing wide of the oil
      const tgt = ptAt(a, rf);
      const d = norm(tgt.x - b.x - b.vx * 0.25 * b.skill, tgt.y - b.y - b.vy * 0.25 * b.skill);
      return { x: d.x, y: d.y, jump: false, dive: false };
    },
    draw(t) {
      barrier(false);
      // tarmac (raised slab) + infield
      ctx.fillStyle = '#15172a'; ctx.beginPath(); ctx.ellipse(C.x, C.y + lift(6), OR.x + 4, OR.y + 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mat('asphalt'); ctx.beginPath(); ctx.ellipse(C.x, C.y, OR.x, OR.y, 0, 0, Math.PI * 2); ctx.fill();
      const sh = ctx.createRadialGradient(C.x - 120, C.y - 120, 50, C.x, C.y, 520); sh.addColorStop(0, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(0,0,0,.2)');
      ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(C.x, C.y, OR.x, OR.y, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(10,10,20,.35)'; ctx.lineWidth = 3;
      for (const s of skids) { ctx.beginPath(); for (let k = 0; k <= 10; k++) { const p = ptAt(s.a + s.len * k / 10, s.rf); ctx.lineTo(p.x, p.y); } ctx.stroke(); }
      ctx.setLineDash([3, 14]); ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(C.x, C.y, MID.x, MID.y, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      // infield: raised grass island
      ctx.fillStyle = '#163a28'; ctx.beginPath(); ctx.ellipse(C.x, C.y + lift(2), IR.x, IR.y, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mat('grass'); ctx.beginPath(); ctx.ellipse(C.x, C.y - lift(5), IR.x, IR.y, 0, 0, Math.PI * 2); ctx.fill();
      const ig = ctx.createRadialGradient(C.x, C.y - 40, 20, C.x, C.y, IR.x); ig.addColorStop(0, 'rgba(255,255,220,.12)'); ig.addColorStop(1, 'rgba(0,30,10,.25)');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.ellipse(C.x, C.y - lift(5), IR.x, IR.y, 0, 0, Math.PI * 2); ctx.fill();
      // kerbs
      ctx.lineWidth = 9;
      for (const [rx, ry, dy] of [[IR.x + 3, IR.y + 3, -lift(3)], [OR.x - 3, OR.y - 3, 0]]) {
        ctx.setLineDash([18, 18]); ctx.strokeStyle = '#ff3d5a'; ctx.beginPath(); ctx.ellipse(C.x, C.y + dy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.lineDashOffset = 18; ctx.strokeStyle = '#f4f6ff'; ctx.stroke(); ctx.lineDashOffset = 0; ctx.setLineDash([]);
      }
      bigLabel('TURBO', C.x, C.y - 30, 'rgba(255,255,255,.25)', 40);
      bigLabel('TURNPIKE', C.x, C.y + 22, 'rgba(255,255,255,.25)', 30);
      // start / finish line
      for (let y = C.y + IR.y + 2; y < C.y + OR.y - 2; y += 12) for (let k = 0; k < 3; k++) { ctx.fillStyle = ((y / 12 + k) | 0) % 2 ? '#f4f6ff' : '#111322'; ctx.fillRect(472 + k * 8, y, 8, 12); }
      // oil slicks: glossy puddles with a rainbow sheen
      for (const o of oils) {
        ctx.fillStyle = 'rgba(5,5,12,.9)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.rx, o.ry, 0.3, 0, Math.PI * 2); ctx.fill();
        const sg = ctx.createLinearGradient(o.x - o.rx, o.y, o.x + o.rx, o.y); sg.addColorStop(0, 'rgba(232,91,217,.3)'); sg.addColorStop(0.5, 'rgba(55,216,233,.3)'); sg.addColorStop(1, 'rgba(255,217,91,.3)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(o.x - 4, o.y - 3, o.rx * 0.6, o.ry * 0.45, 0.3 + Math.sin(t) * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(o.x - o.rx * 0.3, o.y - o.ry * 0.35, 6, 2.5, 0.3, 0, Math.PI * 2); ctx.fill();
      }
      // boost strips
      for (const ba of BOOSTS) {
        const px = C.x + Math.cos(ba) * MID.x, py = C.y + Math.sin(ba) * MID.y, tg = tangent(ba);
        lightPool(px, py, 90, 'rgba(55,216,233,1)', 0.35);
        ctx.save(); ctx.translate(px, py); ctx.rotate(Math.atan2(tg.y, tg.x));
        ctx.fillStyle = '#0d2f45'; roundRect(-46, -28, 92, 56, 10); ctx.fill();
        glow('#37D8E9', 12, () => { ctx.strokeStyle = '#37D8E9'; ctx.lineWidth = 3; roundRect(-46, -28, 92, 56, 10); ctx.stroke(); });
        ctx.strokeStyle = '#9ff4ff'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        for (let k = -1; k <= 1; k++) { const o = ((t * 70) % 26) + k * 26 - 13; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8 + k); ctx.beginPath(); ctx.moveTo(o - 8, -14); ctx.lineTo(o + 6, 0); ctx.lineTo(o - 8, 14); ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.lineCap = 'butt'; ctx.restore();
      }
      // slipstream lines
      for (const b of beans) if (b.draft) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; for (const s2 of [-8, 8]) { ctx.beginPath(); ctx.moveTo(b.x - b.fx * 16 + b.fy * s2, b.y - b.fy * 16 - b.fx * s2); ctx.lineTo(b.x - b.fx * 40 + b.fy * s2, b.y - b.fy * 40 - b.fx * s2); ctx.stroke(); } }
      // start pylon with lap board
      const me = beans.find((b) => b.human) || [...beans].sort((a, b) => b.prog - a.prog)[0];
      const lap = clamp(Math.floor(me.sec / SECT) + 1, 1, LAPS);
      const pylon = { y: C.y + IR.y - 4, draw: () => billboard(480, C.y + IR.y - 4, 0, () => {
        ctx.fillStyle = '#25305d'; roundRect(-5, -78, 10, 78, 3); ctx.fill();
        ctx.fillStyle = '#0b0e24'; roundRect(-48, -114, 96, 40, 8); ctx.fill();
        glow('#FFD95B', 10, () => { ctx.strokeStyle = '#FFD95B'; ctx.lineWidth = 2; roundRect(-48, -114, 96, 40, 8); ctx.stroke(); });
        ctx.fillStyle = '#FFD95B'; ctx.font = '17px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`LAP ${lap}/${LAPS}`, 0, -93);
        const wv = Math.sin(t * 6) * 3;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { ctx.fillStyle = (r + c) % 2 ? '#111322' : '#f4f6ff'; ctx.fillRect(6 + c * 7, -74 + r * 7 + (c * wv) / 4, 7, 7); }
      }) };
      drawAll(beans, [pylon]);
      barrier(true);
      tally(beans, (b) => `${Math.round(clamp(b.prog / (LAPS * 2 * Math.PI), 0, 1) * 100)}%`, (b) => b.prog / (LAPS * 2 * Math.PI));
    },
    winner(t, to) { return scoreWinner(beans, to, (b) => b.sec, LAPS * SECT, (b) => b.prog); },
  };
})();
