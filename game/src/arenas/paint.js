// 33 · Paint the Town — every step paints the floor your colour, but painting costs ink. You refill ONLY by
// standing on your own colour (or grabbing a paint orb, which also bursts a big splash). Your own colour
// speeds you up; rivals' colour slows you. Paint over the leader. First to 30% of the floor, or most at the buzzer.
ARENAS.paint = (() => {
  const CS = 40, X0 = 60, Y0 = 60, COLS = 21, ROWS = 12, N = COLS * ROWS, TARGET_FRAC = 0.3;
  const INK = 100, COST = 7, REFILL = 70;
  let grid, beans, orbs, orbT, jit;
  const target = () => Math.round(N * TARGET_FRAC);
  const cellOf = (x, y) => { const cx = Math.floor((x - X0) / CS), cy = Math.floor((y - Y0) / CS); return cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS ? cy * COLS + cx : -1; };
  const centre = (i) => ({ x: X0 + (i % COLS) * CS + CS / 2, y: Y0 + Math.floor(i / COLS) * CS + CS / 2 });
  function paintCell(b, i, free = false) {
    if (i < 0) return false;
    const prev = grid[i];
    if (prev === b.i) return false;
    if (!free) { if (b.ink < COST) return false; b.ink -= COST; }
    if (prev >= 0) { const o = beans.find((q) => q.i === prev); if (o) o.painted--; }
    grid[i] = b.i; b.painted++;
    const c = centre(i);
    if (Math.random() < 0.5) part({ x: c.x + rnd(-10, 10), y: c.y + rnd(-10, 10), vx: rnd(-50, 50), vy: rnd(-50, 50), size: rnd(2, 4), life: 0.35, color: b.color, kind: 'dot', drag: 5 });
    return true;
  }
  function burst(b, x, y, rad) {
    const cx = Math.floor((x - X0) / CS), cy = Math.floor((y - Y0) / CS);
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= COLS || Y >= ROWS || dx * dx + dy * dy > rad * rad + 1) continue;
      paintCell(b, Y * COLS + X, true);
    }
  }
  // all of one colour's cells as a single blobby path (circles with stable jitter merge into paint)
  function blobPath(owner, r, ox = 0, oy = 0) {
    ctx.beginPath();
    for (let i = 0; i < N; i++) if (grid[i] === owner) {
      const c = centre(i), j = jit[i];
      ctx.moveTo(c.x + j.x + ox + r * j.s, c.y + j.y + oy); ctx.arc(c.x + j.x + ox, c.y + j.y + oy, r * j.s, 0, Math.PI * 2);
    }
  }
  return {
    key: 'paint', name: 'Paint the Town', genre: 'Territory', theme: 'sunset', timeout: ROUND_SECONDS, maxSpeed: 215,
    objective: `Walk to paint the floor your colour. Painting uses ink — refill by standing on your own colour. First to ${Math.round(TARGET_FRAC * 100)}% wins.`,
    init(bs) {
      beans = bs; grid = new Int8Array(N).fill(-1); orbs = []; orbT = 1.5;
      jit = Array.from({ length: N }, () => ({ x: rnd(-4, 4), y: rnd(-4, 4), s: rnd(0.92, 1.12) }));
      placeRing(beans, 480, 300, 280, 160, rnd(0, Math.PI * 2));
      beans.forEach((b) => { b.painted = 0; b.ink = INK; b.inkFlash = 0; burst(b, b.x, b.y, 1); });
    },
    mods(b) {
      const i = cellOf(b.x, b.y), g = i >= 0 ? grid[i] : -1;
      return { slow: g === b.i ? 1.12 : g >= 0 ? 0.8 : 1 };
    },
    update(dt, t) {
      if ((orbT -= dt) <= 0 && orbs.length < 3) { orbT = 2.6; orbs.push({ x: rnd(X0 + 50, X0 + COLS * CS - 50), y: rnd(Y0 + 50, Y0 + ROWS * CS - 50), drop: 0.8 }); }
      for (const o of orbs) o.drop = Math.max(0, o.drop - dt);
      for (const b of beans) {
        b.x = clamp(b.x, X0 + 10, X0 + COLS * CS - 10); b.y = clamp(b.y, Y0 + 8, Y0 + ROWS * CS - 8);
        b.inkFlash = Math.max(0, b.inkFlash - dt);
        if (b.z > 0.5) continue;
        const i = cellOf(b.x, b.y);
        // slow passive regen means nobody is ever locked out; standing on your own colour is the fast refill
        b.ink = Math.min(INK, b.ink + (i >= 0 && grid[i] === b.i ? REFILL : 6) * dt);
        if (i >= 0 && grid[i] !== b.i && !paintCell(b, i) && b.inkFlash <= 0) { b.inkFlash = 0.6; if (b.human) popText(b.x, b.y - 40, 'NO INK!', '#FF557D', 14); }
        for (const o of orbs) if (!o.used && !o.drop && hyp(o.x - b.x, o.y - b.y) < 26) {
          o.used = true; b.ink = INK; burst(b, o.x, o.y, 2);
          ring(o.x, o.y, b.color, 10, 110, 0.45, 8); sparks(o.x, o.y, 16, [b.color, '#fff'], 260, 0.5); hype(0.25);
          if (b.human) beep(600, 0.12, 'sine', 0.05);
        }
      }
      orbs = orbs.filter((o) => !o.used);
    },
    botInput(b, t) {
      if ((b.think -= 1 / 60) <= 0 || !b.plan) {
        b.think = rnd(0.3, 0.5);
        const leader = [...beans].sort((a, c) => c.painted - a.painted)[0];
        let best = null, bs = -1e9;
        for (const o of orbs) { const s = 150 - hyp(o.x - b.x, o.y - b.y) * 0.35 + (b.ink < 30 ? 60 : 0); if (s > bs) { bs = s; best = o; } }
        if (b.ink < 22 + (1 - b.skill) * 10) {
          // refill: nearest own cell
          for (let i = 0; i < N; i++) if (grid[i] === b.i) { const c = centre(i), s = 120 - hyp(c.x - b.x, c.y - b.y) * 0.5; if (s > bs) { bs = s; best = c; } }
        } else {
          for (let k = 0; k < 24; k++) {
            const i = (Math.random() * N) | 0, g = grid[i]; if (g === b.i) continue;
            const c = centre(i);
            let own = 0; for (const di of [-1, 1, -COLS, COLS]) { const j = i + di; if (j >= 0 && j < N && grid[j] === b.i) own++; }
            const gain = g === leader.i && leader !== b ? 2.2 : g >= 0 ? 1.6 : 1.3;
            const s = gain * 30 + own * 10 * b.skill - hyp(c.x - b.x, c.y - b.y) * 0.22;
            if (s > bs) { bs = s; best = c; }
          }
        }
        b.plan = best || centre((Math.random() * N) | 0);
      }
      const d = seek(b, b.plan.x, b.plan.y);
      return { x: d.x, y: d.y, jump: false, dive: false };
    },
    draw(t) {
      const BW = COLS * CS, BH = ROWS * CS;
      // ── canvas board: raised white slab with a wooden frame
      const dep = lift(18);
      ctx.fillStyle = 'rgba(20,5,20,.35)'; roundRect(X0 - 14, Y0 - 8 + dep + 12, BW + 36, BH + 26, 14); ctx.fill();
      ctx.fillStyle = '#5a2e1c'; roundRect(X0 - 20, Y0 - 20 + dep, BW + 40, BH + 40, 14); ctx.fill();
      ctx.fillStyle = mat('wood'); roundRect(X0 - 20, Y0 - 20, BW + 40, BH + 40, 14); ctx.fill();
      ctx.fillStyle = 'rgba(60,25,10,.25)'; roundRect(X0 - 20, Y0 - 20, BW + 40, BH + 40, 14); ctx.fill();
      ctx.fillStyle = mat('plastic'); ctx.fillRect(X0, Y0, BW, BH);
      ctx.strokeStyle = 'rgba(90,70,130,.07)'; ctx.lineWidth = 1;
      for (let x = X0; x <= X0 + BW; x += CS) { ctx.beginPath(); ctx.moveTo(x, Y0); ctx.lineTo(x, Y0 + BH); ctx.stroke(); }
      for (let y = Y0; y <= Y0 + BH; y += CS) { ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X0 + BW, y); ctx.stroke(); }
      // ── glossy paint: rim shadow, body, highlight per colour
      ctx.save(); ctx.beginPath(); ctx.rect(X0, Y0, BW, BH); ctx.clip();
      for (const b of beans) {
        if (!b.painted) continue;
        blobPath(b.i, CS * 0.7, 2, 3); ctx.fillStyle = shade(b.color, 0.55); ctx.fill();
        blobPath(b.i, CS * 0.7); ctx.fillStyle = b.color; ctx.fill();
        blobPath(b.i, CS * 0.42, -5, -6); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill();
        blobPath(b.i, CS * 0.12, -9, -10); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
      }
      grain(X0, Y0, BW, BH, 0.05);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.strokeRect(X0 + 1, Y0 + 1, BW - 2, BH - 2);
      // ── paint orbs: falling in with a target ring, then floating with glow
      for (const o of orbs) {
        ctx.strokeStyle = `rgba(255,255,255,${0.4 + 0.4 * Math.sin(t * 10)})`; ctx.lineWidth = 2.5; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(o.x, o.y, 26, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        contactShadow(o.x, o.y, 18, 10, 0.3);
        lightPool(o.x, o.y, 60, 'rgba(255,255,255,1)', 0.25);
      }
      const extras = [];
      const rainbow = ['#FF557D', '#FFB547', '#7EE2B8', '#37D8E9', '#8F75FF'];
      for (const o of orbs) extras.push({ y: o.y, draw: () => billboard(o.x, o.y, 22 + Math.sin(t * 4 + o.x) * 4 + o.drop * 300, () => {
        const c = rainbow[Math.floor(t * 3 + o.x) % rainbow.length];
        glow(c, 18, () => sphere(14, c));
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 18, t * 3, t * 3 + 1.4); ctx.stroke();
      }) });
      // ink tanks over heads
      for (const b of beans) extras.push({ y: b.y + 0.05, draw: () => billboard(b.x, b.y, b.z + (b.human ? 86 : 74), () => {
        const w = b.human ? 34 : 26, h = b.human ? 7 : 5, f = b.ink / INK;
        ctx.fillStyle = 'rgba(14,10,30,.8)'; roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 4); ctx.fill();
        const low = f < 0.2;
        ctx.fillStyle = low && Math.sin(t * 16) > 0 ? '#FF557D' : b.color; roundRect(-w / 2, -h / 2, w * f, h, 2.5); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-w / 2, -h / 2, w * f, 1.5);
      }) });
      drawAll(beans, extras);
      const leader = [...beans].sort((a, c) => c.painted - a.painted)[0];
      tally(beans, (b) => `${Math.round((b.painted / N) * 100)}%${b === leader && b.painted > 0 ? ' ★' : ''}`, (b) => b.painted / target());
    },
    winner(t, to) { return scoreWinner(beans, to, (b) => b.painted, target()); },
  };
})();
