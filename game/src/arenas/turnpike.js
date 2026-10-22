// 08 · Turbo Turnpike — one lap of a long, winding circuit (one of three layouts, picked each round). The track
// is walled in, so there is no cutting: the only way round is the tarmac. Racing lines matter: boost pads sit on
// the OUTSIDE of the straights (fast, but you arrive wide), oil slicks on the INSIDE of corners (the short line,
// if you can thread it), and turbo cells give one free dash on your next dive. Bump rivals into the walls.
// Anti-exploit: walls make shortcuts impossible; progress is measured along the centreline and only counts
// forward; holding one direction scrapes the walls (which slows you), and spamming dive without turbo is a lunge.
ARENAS.turnpike = (() => {
  const HW = 62, LEN = 1520, DS = 6;
  const LAYOUTS = [
    [[480, 1440], [760, 1440], [870, 1360], [870, 1080], [790, 990], [580, 985], [515, 890], [600, 790], [860, 730], [880, 430], [820, 250], [640, 180], [380, 170], [200, 220], [130, 380], [130, 690], [230, 790], [330, 895], [240, 1010], [130, 1110], [130, 1340], [220, 1440]],
    [[420, 1440], [760, 1440], [870, 1350], [860, 1200], [700, 1160], [420, 1160], [300, 1080], [330, 960], [560, 940], [800, 900], [870, 780], [800, 660], [520, 640], [330, 600], [300, 480], [420, 400], [760, 380], [870, 280], [780, 170], [460, 160], [180, 190], [120, 400], [120, 1300], [200, 1430]],
    [[480, 1440], [780, 1440], [870, 1350], [860, 1240], [760, 1200], [360, 1200], [270, 1130], [290, 1010], [380, 960], [780, 960], [870, 880], [860, 760], [760, 720], [360, 720], [270, 650], [290, 530], [380, 480], [780, 480], [870, 400], [860, 260], [760, 180], [300, 170], [130, 240], [100, 420], [100, 1340], [200, 1440]],
  ];
  let beans, track, N, pads, oils, cells, camY;
  // closed Catmull-Rom through the layout points, resampled every DS px
  function buildTrack(pts) {
    const raw = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let k = 0; k < 24; k++) {
        const u = k / 24, u2 = u * u, u3 = u2 * u;
        raw.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3)));
      }
    }
    const out = []; let acc = 0;
    out.push({ x: raw[0][0], y: raw[0][1] });
    for (let i = 1; i <= raw.length; i++) {
      const a = [...raw[i - 1]], b = raw[i % raw.length]; let seg = hyp(b[0] - a[0], b[1] - a[1]); // copy: never move the source points
      while (acc + seg >= DS) { const f = (DS - acc) / seg; const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f; out.push({ x, y }); a[0] = x; a[1] = y; seg = hyp(b[0] - x, b[1] - y); acc = 0; }
      acc += seg;
    }
    while (out.length > 2 && hyp(out.at(-1).x - out[0].x, out.at(-1).y - out[0].y) < DS * 0.75) out.pop(); // no duplicate point at the seam
    const m = out.length;
    for (let i = 0; i < m; i++) { const p = out[(i - 1 + m) % m], q = out[(i + 1) % m], d = norm(q.x - p.x, q.y - p.y); out[i].tx = d.x; out[i].ty = d.y; out[i].nx = -d.y; out[i].ny = d.x; }
    // signed curvature over ~60 px (positive = turning toward +normal)
    for (let i = 0; i < m; i++) { const a = out[(i - 5 + m) % m], b = out[(i + 5) % m]; out[i].k = Math.atan2(a.tx * b.ty - a.ty * b.tx, a.tx * b.tx + a.ty * b.ty); }
    return out;
  }
  const at = (i) => track[((i % N) + N) % N];
  function nearest(b) {
    let best = b.ti, bd = 1e9;
    for (let d = -28; d <= 28; d++) { const p = at(b.ti + d), dx = b.x - p.x, dy = b.y - p.y, q = dx * dx + dy * dy; if (q < bd) { bd = q; best = b.ti + d; } }
    return ((best % N) + N) % N;
  }
  const lateral = (b, p) => (b.x - p.x) * p.nx + (b.y - p.y) * p.ny;
  const prog = (b) => b.laps * N + b.ti;
  // bend ahead: summed curvature over the next `n` samples
  const bendAhead = (i, from, n) => { let s = 0; for (let k = from; k < from + n; k += 3) s += at(i + k).k; return s; };
  const placeAt = (i, off) => { const p = at(i); return { x: p.x + p.nx * off, y: p.y + p.ny * off, i: ((i % N) + N) % N, off }; };

  return {
    cam() { return camY; },
    debug() { return { track, pads, oils, cells, LAYOUTS }; },
    // shared power-ups on the straights (turbo cells stay the track's own thing)
    power: {
      kinds: ['zoom', 'shove', 'bubble'], every: [4.5, 6.5], botGrab: 70,
      spot() { for (let k = 0; k < 12; k++) { const i = 30 + ((Math.random() * (N - 40)) | 0); if (Math.abs(bendAhead(i, -8, 16)) < 0.4) { const p = placeAt(i, rnd(-HW * 0.5, HW * 0.5)); return { x: p.x, y: p.y }; } } return null; },
    },
    key: 'turnpike', name: 'Turbo Turnpike', genre: 'Race', theme: 'meadow', timeout: ROUND_SECONDS, maxSpeed: 265,
    objective: 'One lap, walls all round. Boost pads sit on the outside line, oil on the inside of the corners. Grab a turbo cell, then dive on a straight to use it.',
    init(bs) {
      beans = bs;
      track = buildTrack(LAYOUTS[(Math.random() * LAYOUTS.length) | 0]); N = track.length;
      // features: boost pads on the outside before bends, oil on the inside of bends, turbo cells on straights
      pads = []; oils = []; cells = [];
      for (let i = 40; i < N - 20; i += 4) {
        const bend = bendAhead(i, 18, 30);
        if (Math.abs(bend) > 1.2 && pads.every((p) => Math.abs(p.i - i) > 90) && Math.random() < 0.5) pads.push({ ...placeAt(i, -Math.sign(bend) * HW * 0.52), cd: 0 });
        const here = bendAhead(i, -6, 12);
        if (Math.abs(here) > 0.9 && oils.every((o) => Math.abs(o.i - i) > 70) && Math.random() < 0.35) oils.push({ ...placeAt(i, Math.sign(here) * HW * 0.5), rx: rnd(28, 36), ry: rnd(18, 24) });
      }
      for (let k = 0; k < 4; k++) for (let tries = 0; tries < 20; tries++) {
        const i = 60 + ((Math.random() * (N - 80)) | 0);
        if (Math.abs(bendAhead(i, -10, 20)) < 0.4 && cells.every((c) => Math.abs(c.i - i) > N / 6)) { cells.push({ ...placeAt(i, rnd(-HW * 0.5, HW * 0.5)), cd: 0 }); break; }
      }
      // starting grid behind the line, two abreast
      beans.forEach((b, j) => {
        const p = placeAt(N - 10 - Math.floor(j / 2) * 9, (j % 2 ? 1 : -1) * HW * 0.42);
        b.x = p.x; b.y = p.y; b.ti = p.i; b.laps = -1; b.fx = at(p.i).tx; b.fy = at(p.i).ty; b.turbo = 0; b.boostCd = 0; b.spin = 0; b.prevDive = 0; b.linePh = rnd(0, 6.3);
      });
      camY = clamp(beans[0].y - 300, -30, LEN - 560);
    },
    mods(b) { if (b.z <= 0.5 && b.spin > 0) return { traction: 0.04 }; return { traction: 0.42 }; },
    update(dt, t) {
      for (const c of cells) c.cd -= dt;
      for (const b of beans) {
        const prevTi = b.ti; b.ti = nearest(b);
        if (b.ti < N / 4 && prevTi > N * 3 / 4) b.laps++; else if (b.ti > N * 3 / 4 && prevTi < N / 4) b.laps--;
        // walls: keep to the tarmac, scraping slows you down
        const p = at(b.ti), off = lateral(b, p), lim = HW - R;
        if (Math.abs(off) > lim) {
          const s = Math.sign(off), push = Math.abs(off) - lim;
          b.x -= p.nx * s * push; b.y -= p.ny * s * push;
          const vn = b.vx * p.nx + b.vy * p.ny; if (vn * s > 0) { b.vx -= p.nx * vn * 1.4; b.vy -= p.ny * vn * 1.4; }
          const kn = b.kx * p.nx + b.ky * p.ny; if (kn * s > 0) { b.kx -= p.nx * kn; b.ky -= p.ny * kn; }
          b.vx *= 0.94; b.vy *= 0.94;
          if (b.hitCd <= 0 && hyp(b.vx, b.vy) > 140) { sparks(b.x - p.nx * s * 6, b.y - p.ny * s * 6 - 8, 4, ['#fff', '#FFD95B'], 140, 0.25); b.hitCd = 0.25; }
        }
        // oil: spin out
        b.spin -= dt;
        if (b.z <= 0.5 && b.spin <= 0 && hyp(b.vx, b.vy) > 110 && oils.some((o) => { const ex = (b.x - o.x) / o.rx, ey = (b.y - o.y) / o.ry; return ex * ex + ey * ey < 1; }) && !shielded(b)) { b.spin = 0.7; b.scaredT = 0.7; if (b.human) popText(b.x, b.y - 36, 'OIL!', '#c9cfe8', 16); }
        // boost pads: a shove along the track
        b.boostCd -= dt;
        if (b.z <= 0.5 && b.boostCd <= 0) for (const pd of pads) if (hyp(b.x - pd.x, b.y - pd.y) < 34) { const q = at(pd.i); b.kx += q.tx * 440; b.ky += q.ty * 440; b.boostCd = 0.8; ring(pd.x, pd.y, '#37D8E9', 10, 60, 0.35, 4); if (b.human) beep(900, 0.08, 'sine', 0.05); }
        // turbo cells: one charge; your next dive becomes a dash instead of a lunge
        if (!b.turbo) for (const c of cells) if (c.cd <= 0 && hyp(b.x - c.x, b.y - c.y) < 30) { b.turbo = 1; c.cd = 5; ring(c.x, c.y, '#FFD95B', 10, 50, 0.35, 4); if (b.human) { beep(1200, 0.08, 'triangle', 0.05); popText(b.x, b.y - 38, 'TURBO READY — DIVE!', '#FFD95B', 15); } }
        if (b.diveT > b.prevDive + 0.001 && b.turbo) {
          b.turbo = 0; b.proneT = 0.12; b.diveT = 0.12; b.fatigue = Math.max(0, b.fatigue - 1);
          const q = at(b.ti), d = hyp(b.fx, b.fy) > 0.1 ? norm(b.fx * 0.6 + q.tx, b.fy * 0.6 + q.ty) : { x: q.tx, y: q.ty };
          b.kx += d.x * 560; b.ky += d.y * 560; ring(b.x, b.y, '#FFD95B', 8, 70, 0.4, 5); if (b.human) { beep(500, 0.15, 'sawtooth', 0.05); shake(2); }
        }
        b.prevDive = b.diveT;
      }
      // camera: follow you (or the leader), centred, looking ahead along your motion
      const me = beans.find((b) => b.human) || beans.reduce((a, b) => (prog(a) >= prog(b) ? a : b));
      const view = (H - Y0) / TILT;
      camY += (clamp(me.y - view * 0.5 + clamp(me.vy * 0.35, -110, 110), -30, LEN - view + 20) - camY) * Math.min(1, dt * 5);
    },
    botInput(b, t) {
      const sp = hyp(b.vx, b.vy), look = 12 + Math.round(sp / 22);
      const bend = bendAhead(b.ti, look - 6, 24);
      // racing line: inside of the coming bend (better drivers commit more), wobbling a little
      let off = clamp(bend * 22 * (0.4 + b.skill * 0.6), -HW * 0.55, HW * 0.55) + Math.sin(t * 0.7 + b.linePh) * 8;
      let tgt = placeAt(b.ti + look, off);
      // dodge oil, grab boost pads / turbo cells that are close to our line
      for (const o of oils) if (hyp(o.x - tgt.x, o.y - tgt.y) < o.rx + 22 && Math.random() < 0.4 + b.skill * 0.6) { off = off + (lateral(o, at(o.i)) > off ? -40 : 40); tgt = placeAt(b.ti + look, clamp(off, -HW * 0.7, HW * 0.7)); }
      for (const f of [...pads, ...(b.turbo ? [] : cells.filter((c) => c.cd <= 0))]) { const ahead = (f.i - b.ti + N) % N; if (ahead > 4 && ahead < look + 10 && Math.abs(f.off - off) < 45 * b.skill + 10) tgt = { x: f.x, y: f.y }; }
      const d = norm(tgt.x - b.x - b.vx * 0.18, tgt.y - b.y - b.vy * 0.18);
      // use turbo on a straight
      const dive = !!b.turbo && Math.abs(bendAhead(b.ti, 4, 36)) < 0.35 && b.diveCd <= 0 && Math.random() < 0.08 + b.skill * 0.1;
      return { x: d.x, y: d.y, jump: false, dive };
    },
    draw(t) {
      const y0 = camY - 60, y1 = camY + 760;
      // ground: grass field with mown stripes
      ctx.fillStyle = mat('grass'); ctx.fillRect(-200, y0, W + 400, y1 - y0);
      for (let y = Math.floor(y0 / 80) * 80; y < y1; y += 80) { ctx.fillStyle = (y / 80) % 2 ? 'rgba(170,240,140,.1)' : 'rgba(10,40,10,.1)'; ctx.fillRect(-200, y, W + 400, 80); }
      // offset outline; on the inside of very tight turns the offset is pulled in so the outline never folds over itself
      const path = (off, lift0 = 0) => { ctx.beginPath(); for (let i = 0; i <= N; i++) { const p = at(i), r = 60 / Math.max(0.05, Math.abs(p.k)), o = off * p.k > 0 ? Math.sign(off) * Math.min(Math.abs(off), r * 0.9) : off; ctx.lineTo(p.x + p.nx * o, p.y + p.ny * o - lift0); } ctx.closePath(); };
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      // barrier walls (raised tyre walls on both edges), then the tarmac
      for (const s of [-1, 1]) { path(s * (HW + 7)); ctx.strokeStyle = '#1b1d33'; ctx.lineWidth = 14; ctx.stroke(); }
      path(0); ctx.strokeStyle = '#15172a'; ctx.lineWidth = HW * 2 + 6; ctx.stroke();
      path(0); ctx.strokeStyle = mat('asphalt'); ctx.lineWidth = HW * 2; ctx.stroke();
      path(0); ctx.strokeStyle = 'rgba(20,10,40,.25)'; ctx.lineWidth = HW * 2; ctx.stroke();
      ctx.setLineDash([16, 18]); path(0); ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      for (const s of [-1, 1]) {
        ctx.setLineDash([14, 14]); path(s * (HW - 3)); ctx.strokeStyle = '#ff3d5a'; ctx.lineWidth = 6; ctx.stroke();
        ctx.lineDashOffset = 14; ctx.strokeStyle = '#f4f6ff'; ctx.stroke(); ctx.lineDashOffset = 0; ctx.setLineDash([]);
        path(s * (HW + 7), lift(8)); ctx.strokeStyle = s > 0 ? '#e8ecff' : '#FF557D'; ctx.lineWidth = 10; ctx.stroke();
        path(s * (HW + 7), lift(12)); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.lineCap = 'butt';
      // start / finish line
      { const p = at(0); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.ty, p.tx)); for (let k = -HW; k < HW; k += 12) for (let r = 0; r < 2; r++) { ctx.fillStyle = ((k / 12 + r) & 1) ? '#f4f6ff' : '#111322'; ctx.fillRect(-6 + r * 6, k, 6, 12); } ctx.restore(); }
      // boost pads, oil, turbo cells
      for (const pd of pads) { if (pd.y < y0 || pd.y > y1) continue; const q = at(pd.i); ctx.save(); ctx.translate(pd.x, pd.y); ctx.rotate(Math.atan2(q.ty, q.tx)); glow('#37D8E9', 12, () => { ctx.fillStyle = 'rgba(55,216,233,.35)'; roundRect(-30, -20, 60, 40, 8); ctx.fill(); }); ctx.fillStyle = '#9ff4ff'; for (let k = 0; k < 3; k++) { const x = -16 + k * 14 + ((t * 40) % 14); ctx.beginPath(); ctx.moveTo(x + 8, 0); ctx.lineTo(x - 2, -12); ctx.lineTo(x - 2, 12); ctx.closePath(); ctx.fill(); } ctx.restore(); }
      for (const o of oils) { if (o.y < y0 || o.y > y1) continue; ctx.fillStyle = 'rgba(8,8,16,.85)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.rx, o.ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(160,120,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(o.x - 4, o.y - 3, o.rx * 0.6, o.ry * 0.45, 0.3, 0, Math.PI * 2); ctx.stroke(); }
      const ups = [];
      for (const c of cells) { if (c.cd > 0 || c.y < y0 || c.y > y1) continue; contactShadow(c.x, c.y + 4, 14, 7, 0.4); ups.push({ y: c.y, draw: () => billboard(c.x, c.y, 18 + Math.sin(t * 4 + c.i) * 4, () => { glow('#FFD95B', 16, () => { ctx.fillStyle = '#FFD95B'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); }); ctx.fillStyle = '#7a4a00'; ctx.font = '12px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('T', 0, 1); }) }); }
      // turbo charge shows over your head
      for (const b of beans) if (b.turbo) ups.push({ y: b.y + 1, draw: () => billboard(b.x, b.y, 64 + b.z, () => { glow('#FFD95B', 10, () => { ctx.fillStyle = '#FFD95B'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); }); }) });
      drawAll(beans, ups);
      // minimap + your position (screen space)
      inScreen(() => {
        const bx = W - 92, by = 122, sw = 74, sh = 122, sx = sw / 820, sy = sh / 1340;
        ctx.globalAlpha = 0.72; ctx.fillStyle = 'rgba(10,13,36,.7)'; roundRect(bx - 6, by - 6, sw + 12, sh + 36, 10); ctx.fill();
        ctx.beginPath(); for (let i = 0; i <= N; i += 4) { const p = at(i); ctx.lineTo(bx + (p.x - 80) * sx, by + (p.y - 120) * sy); } ctx.closePath();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
        const p0 = at(0); ctx.fillStyle = '#f4f6ff'; ctx.fillRect(bx + (p0.x - 80) * sx - 2, by + (p0.y - 120) * sy - 5, 4, 10);
        for (const b of [...beans].sort((a, c) => (a.human ? 1 : 0) - (c.human ? 1 : 0))) { ctx.fillStyle = b.color; ctx.strokeStyle = '#0b0f28'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx + (b.x - 80) * sx, by + (b.y - 120) * sy, b.human ? 5.5 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        const me = beans.find((b) => b.human);
        if (me) { const place = 1 + beans.filter((o) => o !== me && prog(o) > prog(me)).length; ctx.fillStyle = '#FFD95B'; ctx.font = '15px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`P${place} / ${beans.length}`, bx + sw / 2, by + sh + 16); }
        ctx.globalAlpha = 1;
      });
    },
    winner(t, to) {
      const done = beans.filter((b) => prog(b) >= N).sort((a, c) => prog(c) - prog(a));
      if (done.length) return done[0];
      return to ? beans.reduce((a, c) => (prog(a) >= prog(c) ? a : c)) : null;
    },
  };
})();
