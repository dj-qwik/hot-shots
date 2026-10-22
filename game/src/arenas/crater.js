// 29 · Crater Crumble — a stone slab over a lava sea. Meteors are telegraphed by growing red target
// rings; when one lands it kills anyone inside (jumping does NOT save you — it falls from above) and
// leaves a permanent lava hole. Jump across holes or go around. Last one standing wins.
// Anti-camping: ~45% of meteors are aimed at a random living bean, so standing still in a corner or on
// an edge is punished; spawn rate ramps so the slab is shredded before 30 s.
// Rock SHELTERS: a meteor that lands on one is absorbed (no hole) and the shelter crumbles, so whoever is
// under it survives that one hit. New shelters pop up over time — they are worth fighting over.
// TWIST at 15 s: the slab tips — lava floods in from one side and keeps rising.
ARENAS.crater = (() => {
  const X1 = 120, X2 = 840, Y1 = 70, Y2 = 530, DEPTH = 34, H0 = 560;
  let holes, shadows, beans, spawnT, rocks, shelters, shelterT, flood;
  const SH_R = 36;
  const grounded = (b) => b.z <= 0.5 || b.touch;
  const flooded = (x, y) => flood && (flood.side === 0 ? x < X1 + flood.d : flood.side === 1 ? x > X2 - flood.d : flood.side === 2 ? y < Y1 + flood.d * 0.62 : y > Y2 - flood.d * 0.62);
  const unsafe = (x, y) => x < X1 + 12 || x > X2 - 12 || y < Y1 + 12 || y > Y2 - 12 || inHole(x, y) || flooded(x, y);
  function addShelter() {
    for (let k = 0; k < 20; k++) {
      const x = rnd(X1 + 60, X2 - 60), y = rnd(Y1 + 50, Y2 - 50);
      if (unsafe(x, y) || holes.some((h) => hyp(x - h.x, y - h.y) < h.r + SH_R + 10) || shelters.some((q) => hyp(q.x - x, q.y - y) < 150)) continue;
      shelters.push({ x, y, born: 0.6 }); return;
    }
  }
  const inHole = (x, y) => holes.some((h) => hyp(x - h.x, y - h.y) < h.r - 4);
  return {
    key: 'crater', name: 'Crater Crumble', genre: 'Survival', theme: 'fire', timeout: ROUND_SECONDS, maxSpeed: 200,
    objective: 'Dodge the meteor rings. Shelters block one hit. Lava floods in mid-round!',
    power: {
      kinds: ['bubble', 'spring', 'zoom'], every: [4.5, 6.5],
      spot() { for (let k = 0; k < 10; k++) { const x = rnd(X1 + 40, X2 - 40), y = rnd(Y1 + 40, Y2 - 40); if (!unsafe(x, y) && !holes.some((h) => hyp(x - h.x, y - h.y) < h.r + 30)) return { x, y }; } return null; },
      rescue(b) { // the bubble floats you to the nearest solid stone
        for (let r = 30; r < 400; r += 20) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r; if (!unsafe(x, y) && !holes.some((h) => hyp(x - h.x, y - h.y) < h.r + 16) && !shadows.some((s2) => hyp(x - s2.x, y - s2.y) < s2.r + 10)) { b.x = x; b.y = y; b.vx = b.vy = b.kx = b.ky = 0; return true; } }
        return false;
      },
      botGrab: 80,
    },
    init(bs) {
      beans = bs; holes = []; shadows = []; spawnT = 1.0; rocks = []; shelters = []; shelterT = 6; flood = null;
      placeRing(beans, 480, 300, 150, 110, rnd(0, 6.3));
      beans.forEach((b) => { b.zoff = 0; });
      for (let k = 0; k < 14; k++) rocks.push({ x: rnd(X1 + 20, X2 - 20), y: rnd(Y1 + 20, Y2 - 20), s: rnd(3, 7), a: rnd(0, 6.3) });
      for (let k = 0; k < 3; k++) addShelter();
    },
    update(dt, t) {
      if (!flood && t >= 15) { flood = { side: (Math.random() * 4) | 0, d: 0 }; announce('TWIST: THE SLAB TIPS!', '#ff7a3d', 'lava is flooding in'); shake(4); }
      if (flood) flood.d = Math.min(flood.side < 2 ? 330 : 280, flood.d + dt * (flood.side < 2 ? 26 : 18));
      if ((shelterT -= dt) <= 0) { shelterT = rnd(5, 7); if (shelters.length < 4) addShelter(); }
      for (const q of shelters) q.born = Math.max(0, q.born - dt);
      shelters = shelters.filter((q) => !flooded(q.x, q.y));
      if ((spawnT -= dt) <= 0) {
        spawnT = Math.max(0.28, 0.95 - t * 0.03);
        const alive = beans.filter((b) => b.alive);
        let x = rnd(X1 + 30, X2 - 30), y = rnd(Y1 + 30, Y2 - 30);
        if (Math.random() < 0.45 && alive.length) { const b = alive[(Math.random() * alive.length) | 0]; x = clamp(b.x + rnd(-40, 40), X1, X2); y = clamp(b.y + rnd(-40, 40), Y1, Y2); }
        shadows.push({ x, y, r: rnd(40, 52), t: 1.3, T: 1.3, spin: rnd(-2, 2) });
      }
      for (const s of shadows) {
        s.t -= dt;
        if (s.t <= 0) {
          // a shelter in the blast soaks it: it crumbles, nobody under it is hurt, and no hole is made
          const hit = shelters.filter((q) => hyp(q.x - s.x, q.y - s.y) < s.r + SH_R * 0.6);
          if (hit.length) {
            for (const q of hit) { sparks(q.x, q.y - 30, 16, ['#b8b0d0', '#ffd27a', '#fff'], 260, 0.5); puff(q.x, q.y - 20, 10, 'rgba(120,110,140,.85)', 120, 9, 0.7); }
            const safe = (b) => hit.some((q) => hyp(b.x - q.x, b.y - q.y) < SH_R);
            shelters = shelters.filter((q) => !hit.includes(q));
            for (const b of beans) if (b.alive && hyp(b.x - s.x, b.y - s.y) < s.r && !safe(b)) kill(b, t, 70);
            ring(s.x, s.y, '#d8d0f0', 10, s.r * 2, 0.4, 5); if (beans.some((b) => b.human && b.alive && hyp(b.x - s.x, b.y - s.y) < 170)) shake(4);
            continue;
          }
          holes.push({ x: s.x, y: s.y, r: s.r, born: t });
          rocks = rocks.filter((r) => hyp(r.x - s.x, r.y - s.y) > s.r);
          // impact: kills anyone inside, airborne or not
          for (const b of beans) if (b.alive && hyp(b.x - s.x, b.y - s.y) < s.r) kill(b, t, 70);
          sparks(s.x, s.y, 18, ['#ffd27a', '#ff7a3d', '#fff'], 340, 0.55); puff(s.x, s.y, 10, 'rgba(90,70,90,.8)', 120, 9, 0.7);
          ring(s.x, s.y, '#ffb347', 10, s.r * 2.2, 0.45, 6);
          if (beans.some((b) => b.human && b.alive && hyp(b.x - s.x, b.y - s.y) < 170)) shake(5);
          hype(0.06);
        }
      }
      shadows = shadows.filter((s) => s.t > 0);
      for (const b of beans) {
        if (!b.alive) continue;
        if (shadows.some((s) => hyp(b.x - s.x, b.y - s.y) < s.r && s.t < 0.5)) b.scaredT = 0.2;
        if (grounded(b) && (b.x < X1 || b.x > X2 || b.y < Y1 || b.y > Y2 || inHole(b.x, b.y) || flooded(b.x, b.y))) { sparks(b.x, b.y, 12, ['#ff7a3d', '#ffd27a'], 200, 0.5); kill(b, t); }
      }
    },
    botInput(b, t) {
      if ((b.think -= 1 / 60) <= 0 || !b.plan) {
        b.think = rnd(0.3, 0.5);
        let best = null, bs = -1e9;
        // shelters are candidates too: worth more when a meteor is coming for us, less when crowded
        const threat = shadows.some((sh) => hyp(b.x - sh.x, b.y - sh.y) < sh.r + 60);
        for (const q of shelters) {
          const crowd = beans.filter((o) => o !== b && o.alive && hyp(o.x - q.x, o.y - q.y) < SH_R + 10).length;
          if (crowd >= 2 || q.born > 0 || flooded(q.x, q.y)) continue;
          const sc = (threat ? 60 : 15) * b.skill - hyp(q.x - b.x, q.y - b.y) * 0.25 - crowd * 25 - shadows.reduce((a, sh) => a + (hyp(q.x - sh.x, q.y - sh.y) < sh.r + SH_R && sh.t < 0.4 ? 200 : 0), 0);
          if (sc > bs) { bs = sc; best = { x: q.x, y: q.y }; }
        }
        for (let k = 0; k < 14; k++) {
          const p = k === 0 ? { x: b.x, y: b.y } : { x: rnd(X1 + 30, X2 - 30), y: rnd(Y1 + 30, Y2 - 30) };
          let s = Math.min(p.x - X1, X2 - p.x, p.y - Y1, Y2 - p.y) * 0.5 - hyp(p.x - b.x, p.y - b.y) * 0.25;
          for (const h of holes) s -= Math.max(0, 90 - (hyp(p.x - h.x, p.y - h.y) - h.r)) * 1.2;
          for (const sh of shadows) s -= Math.max(0, sh.r + 40 - hyp(p.x - sh.x, p.y - sh.y)) * 4;
          if (flood) { const fx = flood.side === 0 ? p.x - (X1 + flood.d) : flood.side === 1 ? (X2 - flood.d) - p.x : flood.side === 2 ? p.y - (Y1 + flood.d * 0.62) : (Y2 - flood.d * 0.62) - p.y; s -= Math.max(0, 140 - fx) * 2; }
          if (s > bs) { bs = s; best = p; }
        }
        b.plan = best;
      }
      let x = b.plan.x - b.x, y = b.plan.y - b.y;
      const n0 = norm(x, y); x = n0.x; y = n0.y;
      const sheltered = shelters.some((q) => hyp(b.x - q.x, b.y - q.y) < SH_R - 6);
      if (sheltered) { x *= 0.15; y *= 0.15; }
      for (const sh of shadows) { const d = hyp(b.x - sh.x, b.y - sh.y); if (d < sh.r + 20 && !(sheltered && shelters.some((q) => hyp(q.x - sh.x, q.y - sh.y) < sh.r + SH_R * 0.6))) { const n = d > 1 ? norm(b.x - sh.x, b.y - sh.y) : { x: 1, y: 0 }; x += n.x * 3 * (0.5 + b.skill); y += n.y * 3 * (0.5 + b.skill); } }
      const d = hyp(x, y) > 0.2 ? norm(x, y) : { x: 0, y: 0 };
      const jump = inHole(b.x + d.x * 34, b.y + d.y * 34) && Math.random() < 0.4 + b.skill * 0.6;
      return { x: d.x, y: d.y, jump, dive: false };
    },
    draw(t) {
      // lava sea around and under the slab
      ctx.save();
      ctx.fillStyle = '#3a0a0a'; roundRect(40, 20, 880, 600, 40); ctx.fill();
      roundRect(40, 20, 880, 600, 40); ctx.clip();
      const off = (t * 10) % 128; ctx.translate(off, -off * 0.5); ctx.fillStyle = mat('lava'); ctx.fillRect(-100, -100, 1200, 900); ctx.translate(-off, off * 0.5);
      ctx.fillStyle = 'rgba(25,3,6,.42)'; ctx.fillRect(-100, -100, 1200, 900); // darken so the slab and holes read first
      lightPool(480, 320, 460, '#ff6a2a', 0.18 + 0.05 * Math.sin(t * 2));
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,150,60,.45)'; ctx.lineWidth = 3; roundRect(40, 20, 880, 600, 40); ctx.stroke();
      // slab: stone top, deep side lit orange from the lava below
      const d = lift(DEPTH);
      ctx.fillStyle = 'rgba(10,2,4,.55)'; roundRect(X1 + 8, Y1 + d + 10, X2 - X1, Y2 - Y1, 8); ctx.fill();
      const sg = ctx.createLinearGradient(0, Y2, 0, Y2 + d); sg.addColorStop(0, '#2a2236'); sg.addColorStop(1, '#a8401e');
      ctx.fillStyle = sg; ctx.fillRect(X1, Y1 + 8, X2 - X1, Y2 - Y1 + d - 8);
      ctx.fillStyle = mat('stone'); roundRect(X1, Y1, X2 - X1, Y2 - Y1, 8); ctx.fill();
      const tg = ctx.createLinearGradient(0, Y1, 0, Y2); tg.addColorStop(0, 'rgba(255,255,255,.06)'); tg.addColorStop(1, 'rgba(255,120,60,.12)');
      ctx.fillStyle = tg; roundRect(X1, Y1, X2 - X1, Y2 - Y1, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X1 + 8, Y1 + 1.5); ctx.lineTo(X2 - 8, Y1 + 1.5); ctx.stroke();
      glow('#ff7a3d', 10, () => { ctx.strokeStyle = 'rgba(255,140,60,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X1, Y2 + d); ctx.lineTo(X2, Y2 + d); ctx.stroke(); });
      // pebbles
      for (const r of rocks) { ctx.fillStyle = 'rgba(30,22,44,.55)'; ctx.beginPath(); ctx.ellipse(r.x + 1.5, r.y + 2, r.s, r.s * 0.6, r.a, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7a7096'; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.s, r.s * 0.65, r.a, 0, Math.PI * 2); ctx.fill(); }
      // holes: look down a rock shaft into glowing lava
      for (const h of holes) {
        const fresh = clamp(1 - (t - h.born) / 1.2, 0, 1);
        ctx.save(); ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#1b1220'; ctx.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
        ctx.fillStyle = mat('lava'); ctx.beginPath(); ctx.arc(h.x, h.y + lift(22), h.r, 0, Math.PI * 2); ctx.fill();
        lightPool(h.x, h.y + lift(18), h.r * 1.2, '#ff8a3d', 0.5 + fresh * 0.4);
        ctx.restore();
        glow('#ff7a3d', 12, () => { ctx.strokeStyle = `rgba(255,${130 + fresh * 100},60,.9)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.stroke(); });
        ctx.strokeStyle = 'rgba(40,25,50,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, h.r + 2.5, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke();
      }
      // the flood: lava creeping over the slab from one side
      if (flood && flood.d > 0) {
        ctx.save(); roundRect(X1, Y1, X2 - X1, Y2 - Y1, 8); ctx.clip();
        const fr = flood.side === 0 ? [X1, Y1, flood.d, Y2 - Y1] : flood.side === 1 ? [X2 - flood.d, Y1, flood.d, Y2 - Y1] : flood.side === 2 ? [X1, Y1, X2 - X1, flood.d * 0.62] : [X1, Y2 - flood.d * 0.62, X2 - X1, flood.d * 0.62];
        const off = (t * 22) % 128; ctx.save(); ctx.beginPath(); ctx.rect(...fr); ctx.clip(); ctx.translate(off, off * 0.4); ctx.fillStyle = mat('lava'); ctx.fillRect(fr[0] - 140, fr[1] - 140, fr[2] + 280, fr[3] + 280); ctx.restore();
        lightPool(fr[0] + fr[2] / 2, fr[1] + fr[3] / 2, Math.max(fr[2], fr[3]) * 0.7, '#ff6a2a', 0.35);
        // glowing front with arrows showing where it's heading
        const fx = flood.side === 0 ? X1 + flood.d : flood.side === 1 ? X2 - flood.d : null, fy = flood.side === 2 ? Y1 + flood.d * 0.62 : flood.side === 3 ? Y2 - flood.d * 0.62 : null;
        glow('#ffb347', 14, () => { ctx.strokeStyle = `rgba(255,${180 + 60 * Math.sin(t * 8)},80,.95)`; ctx.lineWidth = 5; ctx.beginPath(); if (fx != null) { ctx.moveTo(fx, Y1); ctx.lineTo(fx, Y2); } else { ctx.moveTo(X1, fy); ctx.lineTo(X2, fy); } ctx.stroke(); });
        ctx.fillStyle = 'rgba(255,190,90,.6)';
        for (let k = 0; k < 6; k++) { const u = (k + 0.5) / 6, px = fx != null ? fx + (flood.side === 0 ? 14 : -14) : X1 + u * (X2 - X1), py = fy != null ? fy + (flood.side === 2 ? 12 : -12) : Y1 + u * (Y2 - Y1); ctx.save(); ctx.translate(px, py); ctx.rotate(flood.side === 0 ? 0 : flood.side === 1 ? Math.PI : flood.side === 2 ? Math.PI / 2 : -Math.PI / 2); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -9); ctx.lineTo(-4, 9); ctx.closePath(); ctx.fill(); ctx.restore(); }
        ctx.restore();
      }
      // rock shelters: a stone canopy on two pillars (upright, depth-sorted)
      for (const q of shelters) {
        const grow = 1 - q.born / 0.6;
        ctx.fillStyle = 'rgba(126,226,184,.12)'; ctx.beginPath(); ctx.ellipse(q.x, q.y, SH_R, SH_R * 0.62, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(126,226,184,.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.ellipse(q.x, q.y, SH_R, SH_R * 0.62, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        contactShadow(q.x, q.y + 2, SH_R * 1.2, SH_R * 0.7, 0.5);
        sprite(q.y + 14, () => billboard(q.x, q.y, 0, () => {
          ctx.scale(grow, grow);
          for (const sx of [-1, 1]) { ctx.save(); ctx.translate(sx * 26, 10); box(14, 12, 44, '#8a80a8', '#5e5578', { r: 3 }); ctx.restore(); }
          ctx.translate(0, -50); box(78, 56, 14, '#a8a0c4', '#6e6590', { r: 10 });
          ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(-12, -18, 18, 5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#7EE2B8'; ctx.font = '10px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SHELTER', 0, -8);
        }));
      }
      // telegraphs: growing red fill + spinning reticle; flashes in the last 0.35 s
      for (const s of shadows) {
        const p = 1 - s.t / s.T, late = s.t < 0.35, on = late && Math.sin(t * 50) > 0;
        ctx.fillStyle = `rgba(${late ? 255 : 255},${late ? 40 : 90},${late ? 60 : 50},${0.14 + p * 0.38})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.25 + p * 0.75), 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(t * s.spin + p * 2);
        ctx.strokeStyle = on ? '#ffffff' : '#ff3c50'; ctx.lineWidth = 3; ctx.setLineDash([10, 7]); ctx.beginPath(); ctx.arc(0, 0, s.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(s.r * 0.55, 0); ctx.lineTo(s.r * 0.85, 0); ctx.stroke(); }
        ctx.restore();
        // the falling meteor itself (upright, depth-sorted with the beans)
        const hgt = (s.t / s.T) * H0, dx = (s.t / s.T) * 140;
        sprite(s.y + 0.5, () => billboard(s.x + dx, s.y, hgt, () => {
          additive(() => {
            const tg2 = ctx.createLinearGradient(0, 0, 70, -150); tg2.addColorStop(0, 'rgba(255,200,90,.85)'); tg2.addColorStop(1, 'rgba(255,90,40,0)');
            ctx.strokeStyle = tg2; ctx.lineCap = 'round'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(60, -130); ctx.stroke();
            ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,240,200,.8)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, -65); ctx.stroke(); ctx.lineCap = 'butt';
          });
          glow('#ff7a3d', 16, () => sphere(12, '#4a3550', { hi: '#ffb36b' }));
          ctx.strokeStyle = 'rgba(255,170,70,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(0, 2); ctx.lineTo(5, -5); ctx.moveTo(0, 2); ctx.lineTo(2, 8); ctx.stroke();
        }));
      }
      drawAll(beans);
      const alive = beans.filter((b) => b.alive).length;
      inScreen(() => { ctx.font = '12px Bungee, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,220,190,.85)'; ctx.fillText(`${alive} STANDING`, 48, H - 92); });
    },
    winner(t, to) { return survivalWinner(beans, t, to, (b) => -holes.reduce((s, h) => s + (hyp(b.x - h.x, b.y - h.y) < 120 ? 1 : 0), 0)); },
  };
})();
