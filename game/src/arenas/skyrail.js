// 10 · Skyrail Scramble — race across plank walkways over a canyon. Every section, two of the three lanes
// dead-end in a gap too wide to jump; a cross bar just before the gaps is the only way to the open lane.
// Planks collapse a moment after you stand on them (no camping), side gusts blow you off a lane unless you
// steer into them, and small holes need timed jumps. Fall = back to your last checkpoint.
// Anti-exploit: holding forward hits a dead end (or gets blown off) within seconds.
ARENAS.skyrail = (() => {
  const LEN = 3100, L = 200, Rt = 760, LANES = [300, 480, 660], PW = 76, PL = 40, GAP = 5;
  const COLLAPSE = 1.15, REGROW = 1.8;
  let rows, cells, plats, segs, beans, camY, wind, holes;
  const inRect = (b, c) => Math.abs(b.x - c.x) < c.w / 2 + 3 && Math.abs(b.y - c.y) < c.h / 2 + 3;
  const rowOf = (y) => Math.round(y / PL);
  function addCell(c) { cells.push(c); const r = rowOf(c.y); (rows.get(r) || rows.set(r, []).get(r)).push(c); }
  function cellAt(b) {
    const r = rowOf(b.y);
    for (let k = r - 1; k <= r + 1; k++) { const list = rows.get(k); if (list) for (const c of list) if (c.state !== 2 && inRect(b, c)) return c; }
    return null;
  }
  const platAt = (b) => plats.find((p) => Math.abs(b.x - p.x) < p.w / 2 + 3 && Math.abs(b.y - p.y) < p.h / 2 + 3);
  const laneOf = (x) => LANES.reduce((a, l) => (Math.abs(l - x) < Math.abs(a - x) ? l : a), LANES[0]);
  // the segment a bean at y is in, or the next one ahead of a platform
  const segAhead = (y) => segs.find((s) => s.yBot >= y - 4 && s.yTop < y) || segs.filter((s) => s.yBot < y).sort((a, b) => b.yBot - a.yBot)[0];

  function build() {
    rows = new Map(); cells = []; plats = []; segs = []; holes = [];
    plats.push({ x: 480, y: LEN - 110, w: Rt - L + 40, h: 180, kind: 'start' });
    plats.push({ x: 480, y: 2050, w: Rt - L + 40, h: 90, kind: 'cp' });
    plats.push({ x: 480, y: 1150, w: Rt - L + 40, h: 90, kind: 'cp' });
    plats.push({ x: 480, y: 130, w: Rt - L + 40, h: 160, kind: 'depot' });
    const sections = [[LEN - 200, 2095], [2005, 1195], [1105, 210]];
    let lastOpen = (Math.random() * 3) | 0;
    for (const [yb, yt] of sections) {
      const n = 2, len = (yb - yt) / n;
      for (let s = 0; s < n; s++) {
        const segBot = yb - s * len, segTop = yb - (s + 1) * len;
        let open; do open = (Math.random() * 3) | 0; while (open === lastOpen);
        lastOpen = open;
        const gapTop = segTop + 14, gapBot = gapTop + GAP * PL, barY = gapBot + 62;
        segs.push({ yBot: segBot, yTop: segTop, open, gapTop, gapBot, barY });
      }
    }
    // lane planks, leaving dead-end gaps and a few small jumpable holes
    const onPlat = (y) => plats.some((p) => Math.abs(y - p.y) < p.h / 2 - PL / 2 + 4);
    for (const [li, lx] of LANES.entries()) {
      let lastHole = -99;
      for (let y = 230; y < LEN - 30; y += PL) {
        if (onPlat(y)) continue;
        const seg = segs.find((s) => y <= s.yBot && y > s.yTop - 1);
        if (seg && li !== seg.open && y >= seg.gapTop && y <= seg.gapBot) continue; // dead end
        const nearBar = seg && Math.abs(y - seg.barY) < PL * 2.5;
        const nearGap = seg && y > seg.gapBot && y < seg.gapBot + PL * 2;
        if (!nearBar && !nearGap && y - lastHole > PL * 4 && !onPlat(y + PL) && !onPlat(y - PL) && Math.random() < 0.07) { lastHole = y; holes.push({ x: lx, y }); continue; }
        addCell({ x: lx, y, w: PW, h: PL, state: 0, t: 0, lane: li });
      }
    }
    // cross bars spanning all three lanes just before each dead end
    for (const s of segs) for (let x = 262 + 31; x < 698; x += 62) addCell({ x, y: s.barY, w: 62, h: PL, state: 0, t: 0, bar: true });
  }

  function drawPlank(c, t) {
    let y = c.y, a = 1, jx = 0;
    if (c.state === 1) { const k = 1 - clamp(c.t / COLLAPSE, 0, 1); jx = k > 0.45 ? Math.sin(t * 60 + c.x) * 1.6 * k : 0; }
    if (c.state === 2) {
      const sinceFall = REGROW - c.t;
      if (sinceFall < 0.5) { y += lift(-sinceFall * sinceFall * 260); a = 1 - sinceFall * 2; }
      else { // ghost outline while it regrows
        ctx.strokeStyle = `rgba(255,210,150,${0.12 + (c.t < 0.6 ? (0.6 - c.t) : 0)})`; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        roundRect(c.x - c.w / 2 + 3, c.y - c.h / 2 + 3, c.w - 6, c.h - 6, 4); ctx.stroke(); ctx.setLineDash([]); return;
      }
    }
    const x0 = c.x - c.w / 2 + 1 + jx, y0 = y - c.h / 2 + 1, w = c.w - 2, h = c.h - 2;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#5a3416'; roundRect(x0, y0 + lift(7), w, h, 4); ctx.fill();
    ctx.fillStyle = mat('wood'); roundRect(x0, y0, w, h, 4); ctx.fill();
    if (c.state === 1) { const k = 1 - clamp(c.t / COLLAPSE, 0, 1); ctx.fillStyle = `rgba(${k > 0.5 && Math.sin(t * 30) > 0 ? '255,120,40' : '40,15,0'},${0.15 + k * 0.4})`; roundRect(x0, y0, w, h, 4); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,230,190,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + 4, y0 + 2); ctx.lineTo(x0 + w - 4, y0 + 2); ctx.stroke();
    ctx.fillStyle = 'rgba(40,20,5,.55)'; for (const nx of [x0 + 6, x0 + w - 6]) { ctx.beginPath(); ctx.arc(nx, y0 + h / 2, 1.6, 0, Math.PI * 2); ctx.fill(); }
    if (c.state === 1 && c.t < COLLAPSE * 0.55) { ctx.strokeStyle = 'rgba(30,10,0,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.x - 10, y0 + 4); ctx.lineTo(c.x + 2, y0 + h / 2); ctx.lineTo(c.x - 4, y0 + h - 4); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  return {
    cam() { return camY; },
    key: 'skyrail', name: 'Skyrail Scramble', genre: 'Balance race', theme: 'sunset', timeout: ROUND_SECONDS, maxSpeed: 215,
    objective: 'Two of three lanes dead-end at a big gap. Switch lanes on the cross bar before the red signs. Planks drop if you stand still, and gusts blow you sideways.',
    init(bs) {
      beans = bs; build();
      const n = beans.length;
      beans.forEach((b, i) => { b.x = L + 40 + (i + 0.5) * (Rt - L - 80) / n; b.y = LEN - 90; b.fy = -1; b.fx = 0; b.cp = plats[0]; b.lane = null; b.falls = 0; });
      camY = LEN - 660;
      wind = { next: rnd(3.5, 5.5), warn: 0, on: 0, dir: 1 };
    },
    update(dt, t) {
      for (const c of cells) { if (c.state === 1 && (c.t -= dt) <= 0) { c.state = 2; c.t = REGROW; } else if (c.state === 2 && (c.t -= dt) <= 0) c.state = 0; }
      // gusts: 1.2 s warning, then 1.3 s of sideways push
      if (wind.on > 0) wind.on -= dt;
      else if (wind.warn > 0) { wind.warn -= dt; if (wind.warn <= 0) { wind.on = 1.3; hype(0.2); } }
      else if (t > wind.next) { wind.dir = Math.random() < 0.5 ? -1 : 1; wind.warn = 1.2; wind.next = t + rnd(4.2, 6); if (beans.some((b) => b.human)) announce(wind.dir > 0 ? 'GUST  ➜' : '⬅  GUST', '#9fe8ff'); }
      for (const b of beans) {
        b.x = clamp(b.x, L - 10, Rt + 10); b.y = clamp(b.y, 60, LEN - 30);
        const plat = platAt(b);
        if (wind.on > 0 && !plat) { b.x += wind.dir * 125 * dt; b.scaredT = 0.2; }
        if (b.z > 0.5) continue;
        if (plat) { if (plat.kind !== 'depot' && (!b.cp || plat.y < b.cp.y)) b.cp = plat; continue; }
        const cell = cellAt(b);
        if (cell) {
          if (cell.state === 0) { cell.state = 1; cell.t = COLLAPSE; }
          continue;
        }
        // fell: back to the last checkpoint
        puff(b.x, b.y, 8, 'rgba(255,255,255,.7)', 90, 7, 0.5);
        if (b.human) { beep(200, 0.2, 'sine', 0.05); popText(b.x, b.y - 30, 'FELL!', '#FF557D', 20); shake(3); }
        b.x = clamp(b.x, L + 60, Rt - 60); b.y = b.cp.y; b.vx = b.vy = b.kx = b.ky = 0; b.stun = 0.8; b.sq = 0.3; b.falls++; b.lane = null;
      }
      camY = followCam(beans, camY, LEN, dt);
    },
    botInput(b, t) {
      const plat = platAt(b);
      const seg = segAhead(b.y);
      let tx = b.x, up = -1, jump = false;
      if (plat) {
        // choose a lane on the platform: smart bots pick the next open lane
        if (b.lane == null || b.laneT !== seg) { b.laneT = seg; b.lane = seg && Math.random() < 0.55 + b.skill * 0.45 ? LANES[seg.open] : LANES[(Math.random() * 3) | 0]; }
        tx = b.lane;
        if (Math.abs(b.x - tx) > 14 && plat.y - plat.h / 2 > b.y - 40) up = -0.25;
      } else {
        const lane = laneOf(b.x);
        tx = lane;
        if (seg) {
          const deadHere = LANES.indexOf(lane) !== seg.open;
          if (deadHere && b.y > seg.gapBot - 4) {
            // walk to the bar, then slide along it to the open lane
            if (b.y > seg.barY + 8) tx = lane;
            else { tx = LANES[seg.open]; up = b.y < seg.barY - 8 ? 0.6 : 0; }
          }
          if (!deadHere && Math.abs(b.y - seg.barY) < 20 && Math.abs(b.x - LANES[seg.open]) > 10) { tx = LANES[seg.open]; up = 0; }
        }
        // jump holes or planks about to drop ahead
        const probe = { x: b.x, y: b.y - 34, z: 0 };
        const ahead = cellAt(probe);
        const blocked = !ahead && !platAt(probe) && !(seg && b.y - 34 < seg.gapBot && b.y - 34 > seg.gapTop && LANES.indexOf(laneOf(b.x)) !== seg.open);
        if ((blocked || (ahead && ahead.state === 1 && ahead.t < 0.35)) && up < 0 && Math.random() < 0.45 + b.skill * 0.55) jump = true;
      }
      let x = clamp((tx - b.x) / 24, -1, 1);
      if (wind.on > 0 || (wind.warn > 0 && wind.warn < 0.25)) x -= wind.dir * (0.4 + b.skill * 0.7);
      const d = norm(x, up);
      return { x: d.x, y: d.y, jump, dive: false };
    },
    draw(t) {
      const y0 = camY - 10, y1 = camY + 700;
      ctx.save(); ctx.beginPath(); ctx.rect(-400, camY - 5, W + 800, 1400); ctx.clip(); // floor-level art stays below the stands
      // canyon: hazy depth with drifting clouds far below
      const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#1d1640'); g.addColorStop(1, '#5a3a78');
      ctx.fillStyle = g; ctx.fillRect(L - 40, y0, Rt - L + 80, y1 - y0);
      ctx.save(); ctx.globalAlpha = 0.9; ctx.translate(-((t * 18) % 256), -((t * 6) % 256)); ctx.fillStyle = mat('cloud'); ctx.fillRect(L - 40 + ((t * 18) % 256), y0 + ((t * 6) % 256), Rt - L + 80, y1 - y0); ctx.restore();
      additive(() => { for (let k = 0; k < 14; k++) { const yy = Math.floor(camY / 90) * 90 + k * 90, xx = L + ((k * 137 + Math.floor(camY / 90) * 59) % (Rt - L)); ctx.fillStyle = `rgba(255,200,120,${0.12 + 0.08 * Math.sin(t * 2 + k)})`; ctx.beginPath(); ctx.arc(xx, yy, 2, 0, Math.PI * 2); ctx.fill(); } });
      // cliffs on both sides
      for (const [x0, x1] of [[L - 180, L - 30], [Rt + 30, Rt + 180]]) {
        ctx.fillStyle = '#2b2140'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillStyle = mat('stone'); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillStyle = 'rgba(20,10,40,.35)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        const edge = x0 < L ? x1 : x0;
        const eg = ctx.createLinearGradient(edge - 14, 0, edge + 14, 0); eg.addColorStop(0, x0 < L ? 'rgba(255,190,120,.35)' : 'rgba(10,5,20,.8)'); eg.addColorStop(1, x0 < L ? 'rgba(10,5,20,.8)' : 'rgba(255,190,120,.35)');
        ctx.fillStyle = eg; ctx.fillRect(edge - 14, y0, 28, y1 - y0);
      }
      // platforms (start / checkpoints / depot)
      for (const p of plats) {
        if (p.y < y0 - 200 || p.y > y1 + 200) continue;
        platformRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, p.kind === 'depot' ? mat('metal') : mat('stone'), p.kind === 'depot' ? '#26304f' : '#2a2140', 18, 12);
        if (p.kind === 'depot') { lightPool(p.x, p.y, 260, 'rgba(126,226,184,1)', 0.3); ctx.fillStyle = 'rgba(126,226,184,.18)'; roundRect(p.x - p.w / 2 + 10, p.y - p.h / 2 + 8, p.w - 20, p.h - 16, 10); ctx.fill(); }
        bigLabel(p.kind === 'depot' ? 'DEPOT' : p.kind === 'start' ? 'START' : 'CHECKPOINT', p.x, p.y + (p.kind === 'depot' ? 20 : 0), p.kind === 'depot' ? '#7EE2B8' : 'rgba(255,255,255,.75)', p.kind === 'depot' ? 30 : 16);
      }
      // planks, back to front
      for (const c of cells) if (c.y > y0 - 60 && c.y < y1 + 60) drawPlank(c, t);
      // rope rails along lanes (posts every 4 planks)
      ctx.strokeStyle = 'rgba(80,45,20,.9)'; ctx.lineWidth = 2;
      for (const lx of LANES) for (const s of [-1, 1]) {
        const x = lx + s * (PW / 2 + 2);
        for (let y = Math.floor(y0 / 160) * 160; y < y1; y += 160) {
          if (!cellAt({ x: lx, y }) || plats.some((p) => Math.abs(y - p.y) < p.h / 2 + 30)) continue;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - lift(16)); ctx.stroke();
          if (cellAt({ x: lx, y: y - 160 })) { ctx.strokeStyle = 'rgba(200,160,110,.6)'; ctx.beginPath(); ctx.moveTo(x, y - lift(14)); ctx.quadraticCurveTo(x, y - 80 - lift(8), x, y - 160 - lift(14)); ctx.stroke(); ctx.strokeStyle = 'rgba(80,45,20,.9)'; }
        }
      }
      ctx.restore();
      // dead-end warning signs + broken stubs
      const signs = [];
      for (const s of segs) {
        if (s.gapBot < y0 - 100 || s.gapTop > y1 + 100) continue;
        const vis = (yy) => yy > camY + 14;
        for (const [li, lx] of LANES.entries()) {
          if (li === s.open) {
            if (vis(s.barY - 30)) signs.push({ y: s.barY - 30, draw: () => billboard(lx, s.barY - 30, 0, () => { glow('#7EE2B8', 14, () => { ctx.fillStyle = '#7EE2B8'; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(10, -30); ctx.lineTo(4, -30); ctx.lineTo(4, -18); ctx.lineTo(-4, -18); ctx.lineTo(-4, -30); ctx.lineTo(-10, -30); ctx.closePath(); ctx.fill(); }); }) });
            continue;
          }
          const sy = s.gapBot + 8;
          if (s.gapBot - 10 > camY) { ctx.save(); ctx.translate(lx, s.gapBot - 2); ctx.rotate(0.35); ctx.fillStyle = '#6b4120'; ctx.fillRect(-30, -4, 34, 10); ctx.restore(); }
          if (vis(sy)) signs.push({ y: sy, draw: () => billboard(lx, sy, 0, () => {
            ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-1.5, -30, 3, 30);
            const p = 0.7 + 0.3 * Math.sin(t * 8);
            glow('#ff3d5a', 12 * p, () => { ctx.fillStyle = '#ff3d5a'; roundRect(-13, -50, 26, 22, 5); ctx.fill(); });
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-5, -45); ctx.lineTo(5, -33); ctx.moveTo(5, -45); ctx.lineTo(-5, -33); ctx.stroke(); ctx.lineCap = 'butt';
          }) });
        }
      }
      // finish arch over the depot
      const depot = plats[plats.length - 1];
      if (depot.y > y0 - 200) signs.push({ y: depot.y + depot.h / 2 - 6, draw: () => billboard(480, depot.y + depot.h / 2 - 6, 0, () => {
        for (const s of [-1, 1]) { ctx.fillStyle = '#2a3168'; roundRect(s * 270 - 7, -96, 14, 96, 4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(s * 270 - 5, -94, 3, 90); }
        glow('#7EE2B8', 18, () => { ctx.fillStyle = '#123a33'; roundRect(-280, -112, 560, 26, 8); ctx.fill(); });
        ctx.fillStyle = '#7EE2B8'; ctx.font = '18px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★ FINISH ★', 0, -98);
      }) });
      drawAll(beans, signs);
      // gust streaks
      if (wind.warn > 0 || wind.on > 0) inScreen(() => {
        const strong = wind.on > 0;
        ctx.strokeStyle = strong ? 'rgba(200,240,255,.55)' : 'rgba(200,240,255,.22)'; ctx.lineWidth = strong ? 3 : 2; ctx.lineCap = 'round';
        for (let i = 0; i < 16; i++) { const px = ((i * 151 + t * (strong ? 900 : 300) * wind.dir) % (W + 200) + W + 200) % (W + 200) - 100, py = 140 + (i * 53) % (H - 200); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - wind.dir * (strong ? 70 : 34), py); ctx.stroke(); }
        ctx.lineCap = 'butt';
      });
      progressStrip(beans, LEN, 200);
    },
    winner(t, to) { const d = beans.filter((b) => b.y < 200).sort((a, b) => a.y - b.y); if (d.length) return d[0]; return to ? [...beans].sort((a, b) => a.y - b.y)[0] : null; },
  };
})();
