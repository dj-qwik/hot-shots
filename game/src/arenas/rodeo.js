// 44 · Rocket Rodeo — fly through 9 ring gates in order on a twitchy toy rocket. Three of the gates are FORKS:
// a small gold ring on the short line (tight to thread, and it gives a boost) or a big ring on the long way round.
// Asteroids drift across the deck and knock rockets off line. TWIST at 15 s: a gravity well opens and drags
// rockets and rocks toward its core; touch the core and you're flung away.
// Anti-exploit: gates are scattered 290–540 px apart in a random chain, so no fixed direction or spot scores;
// asteroids and the well punish holding one heading.
ARENAS.rodeo = (() => {
  let gates, beans, flames, rocks, well, twisted;
  const X0 = 14, Y0w = 14, X1 = 946, Y1 = 586, GATES = 9, FORKS = [2, 5, 7];
  const opts = (i) => gates[Math.min(i, GATES - 1)];
  const passR = (o) => (o.gold ? 17 : 26);
  return {
    key: 'rodeo', name: 'Rocket Rodeo', genre: 'Vehicle skill', theme: 'space', timeout: ROUND_SECONDS, maxSpeed: 265,
    objective: 'Steer early and fly through gates 1 to 9. At a fork, thread the small gold ring for a boost or take the big one. Dodge the asteroids.',
    power: {
      kinds: ['zoom', 'bubble', 'shove'], every: [4, 6],
      spot() { for (let k = 0; k < 8; k++) { const p = { x: rnd(100, 860), y: rnd(90, 510) }; if (rocks.every((r) => hyp(r.x - p.x, r.y - p.y) > r.r + 40)) return p; } return null; },
      botGrab: 110,
    },
    init(bs) {
      beans = bs; gates = []; flames = []; rocks = []; well = null; twisted = false;
      let p = { x: 480, y: 300 };
      let guard = 0;
      while (gates.length < GATES) {
        if (++guard > 4000) { gates.length = 0; p = { x: 480, y: 300 }; guard = 0; }
        const c = { x: rnd(90, 870), y: rnd(90, 500) }, d = hyp(c.x - p.x, c.y - p.y);
        if (d < 290 || d > 540) continue;
        const clear = (q) => gates.flat().every((g) => hyp(g.x - q.x, g.y - q.y) > 85) && hyp(q.x - 480, q.y - 300) > 70;
        if (!clear(c)) continue;
        if (FORKS.includes(gates.length)) {
          // the gold ring sits on the short line from the previous gate; the big ring swings well wide
          const mid = { x: (p.x + c.x) / 2, y: (p.y + c.y) / 2 }, n = norm(-(c.y - p.y), c.x - p.x), side = Math.random() < 0.5 ? 1 : -1;
          const big = { x: clamp(mid.x + n.x * side * 190, 80, 880), y: clamp(mid.y + n.y * side * 190, 80, 520) };
          if (!clear(big) || hyp(big.x - c.x, big.y - c.y) < 120) continue;
          gates.push([{ x: c.x, y: c.y, gold: true }, { ...big, gold: false }]);
        } else gates.push([{ x: c.x, y: c.y, gold: false }]);
        p = c;
      }
      for (let k = 0; k < 5; k++) for (let tries = 0; tries < 20; tries++) {
        const r = { x: rnd(80, 880), y: rnd(80, 520), r: rnd(16, 28), vx: rnd(-55, 55), vy: rnd(-45, 45), spin: rnd(-2, 2), a: 0, shape: [0, 1, 2, 3, 4, 5, 6].map(() => rnd(0.8, 1.15)) };
        if (hyp(r.x - 480, r.y - 300) > 140) { rocks.push(r); break; }
      }
      placeRing(beans, 480, 300, 60, 60);
      beans.forEach((b) => { b.next = 0; });
    },
    mods() { return { traction: 0.24, slow: 1 }; },
    update(dt, t) {
      if (!twisted && t >= 15) {
        twisted = true;
        let best = null;
        for (let k = 0; k < 12; k++) { const p = { x: rnd(200, 760), y: rnd(150, 450) }; const score = Math.min(...gates.flat().map((g) => hyp(g.x - p.x, g.y - p.y))); if (!best || score > best.s) best = { ...p, s: score }; }
        well = { x: best.x, y: best.y, core: 30, reach: 360, t: 0 };
        announce('TWIST: GRAVITY WELL!', '#B98CFF', 'It drags everything in. Touch the core and you get flung');
      }
      if (well) well.t += dt;
      // asteroids drift and bounce off the deck rim (and get pulled by the well)
      for (const r of rocks) {
        if (well) { const dx = well.x - r.x, dy = well.y - r.y, d = hyp(dx, dy) || 1; const f = 60 * Math.max(0, 1 - d / well.reach); r.vx += dx / d * f * dt; r.vy += dy / d * f * dt; if (d < well.core + r.r) { r.vx = -dx / d * 90; r.vy = -dy / d * 90; } }
        r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.spin * dt;
        if (r.x < 40 + r.r || r.x > 920 - r.r) { r.vx = -r.vx; r.x = clamp(r.x, 40 + r.r, 920 - r.r); }
        if (r.y < 40 + r.r || r.y > 560 - r.r) { r.vy = -r.vy; r.y = clamp(r.y, 40 + r.r, 560 - r.r); }
      }
      for (const b of beans) {
        if (b.x < 20 || b.x > 940) { b.vx *= -0.6; b.x = clamp(b.x, 20, 940); sparks(b.x, b.y - 10, 4, ['#fff', '#8F75FF'], 120, 0.25); }
        if (b.y < 20 || b.y > 580) { b.vy *= -0.6; b.y = clamp(b.y, 20, 580); sparks(b.x, b.y - 10, 4, ['#fff', '#8F75FF'], 120, 0.25); }
        // asteroid hits: bounce off and lose control for a moment
        for (const r of rocks) {
          const dx = b.x - r.x, dy = b.y - r.y, d = hyp(dx, dy) || 1;
          if (d < r.r + R - 2) {
            b.x = r.x + dx / d * (r.r + R - 2); b.y = r.y + dy / d * (r.r + R - 2);
            if (b.hitCd <= 0 && !shielded(b)) { b.kx += dx / d * 330; b.ky += dy / d * 330; b.vx *= 0.3; b.vy *= 0.3; b.stun = Math.max(b.stun, 0.45); b.hitCd = 0.5; sparks(b.x, b.y - 10, 8, ['#fff', '#c9b28a'], 180, 0.35); if (b.human) { popText(b.x, b.y - 34, 'CLONK!', '#FFB547', 16); shake(3); } }
            else if (b.hitCd <= 0) b.hitCd = 0.5;
          }
        }
        // gravity well: pull, and the core flings you
        if (well) {
          const dx = well.x - b.x, dy = well.y - b.y, d = hyp(dx, dy) || 1, k = Math.min(1, well.t / 1.5);
          const f = 330 * k * Math.max(0, 1 - d / well.reach);
          b.kx += dx / d * f * dt; b.ky += dy / d * f * dt;
          if (d < well.core + R && b.hitCd <= 0 && !shielded(b)) { b.kx = -dx / d * 520; b.ky = -dy / d * 520; b.stun = Math.max(b.stun, 0.7); b.hitCd = 0.8; ring(well.x, well.y, '#B98CFF', 10, 80, 0.4, 5); if (b.human) { popText(b.x, b.y - 34, 'FLUNG!', '#B98CFF', 18); shake(4); } }
        }
        // gates: any option of the current gate counts; gold rings give a boost along your heading
        const os = gates[b.next];
        if (os) for (const o of os) if (hyp(b.x - o.x, b.y - o.y) < passR(o)) {
          b.next++; b.happyT = 0.5;
          ring(o.x, o.y, b.color, 12, 70, 0.4, 4);
          if (o.gold && os.length > 1) { const sp = hyp(b.vx, b.vy) || 1; b.kx += b.vx / sp * 300; b.ky += b.vy / sp * 300; ring(o.x, o.y, '#FFD95B', 10, 90, 0.45, 6); if (b.human) popText(b.x, b.y - 36, 'GOLD BOOST!', '#FFD95B', 16); }
          if (b.human) { beep(700 + b.next * 60, 0.07, 'sine', 0.05); sparks(o.x, o.y - lift(28), 10, ['#FFD95B', '#fff', b.color], 200, 0.4); }
          if (b.next === GATES - 1) { feed(`${b.name} on the last gate!`, b.color); hype(0.5); }
          break;
        }
        const sp = hyp(b.vx, b.vy);
        if (sp > 60 && VRAND() < 0.8) { const v = (a, c) => a + VRAND() * (c - a); flames.push({ x: b.x - b.vx / sp * 14 + v(-3, 3), y: b.y - b.vy / sp * 14 + v(-3, 3), vx: -b.vx * 0.3 + v(-20, 20), vy: -b.vy * 0.3 + v(-20, 20), life: v(0.25, 0.4), t: 0 }); } // visual only
      }
      for (const f of flames) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; }
      flames = flames.filter((f) => f.t < f.life);
    },
    botInput(b, t) {
      const os = opts(b.next), after = opts(b.next + 1)[0];
      // pick a fork option by total distance; shakier pilots shy away from the small gold ring
      let tgt = os[0], bc = 1e9;
      for (const o of os) { const c = hyp(o.x - b.x, o.y - b.y) + hyp(after.x - o.x, after.y - o.y) + (o.gold && os.length > 1 ? (1 - b.skill) * 420 - 60 : 0); if (c < bc) { bc = c; tgt = o; } }
      const k = 0.45 * b.skill + 0.1;
      let dx = tgt.x - b.x - b.vx * k, dy = tgt.y - b.y - b.vy * k;
      const L0 = hyp(dx, dy) || 1; dx /= L0; dy /= L0;
      // steer around asteroids (and the well's core) that sit in front of us
      const avoid = (cx, cy, rad, w) => {
        const ox = cx - b.x, oy = cy - b.y, d = hyp(ox, oy);
        if (d > rad + 90 || d < 1 || (ox * dx + oy * dy) / d < 0.3) return;
        let px = -dy, py = dx; if (px * ox + py * oy > 0) { px = -px; py = -py; } // perpendicular, away from it
        const s = w * b.skill * Math.max(0, 1 - (d - rad) / 90); dx += px * s; dy += py * s;
      };
      for (const r of rocks) avoid(r.x, r.y, r.r, 0.9);
      if (well) avoid(well.x, well.y, well.core + 20, 1.2);
      const d = norm(dx, dy);
      return { x: d.x, y: d.y, jump: false, dive: false };
    },
    draw(t) {
      const me = beans.find((b) => b.human) || [...beans].sort((a, b) => b.next - a.next)[0];
      // launch deck: a raised dark-glass platform with a neon grid and glowing rim
      platformRect(X0, Y0w, X1 - X0, Y1 - Y0w, '#0d1036', '#060820', 18, 22);
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = mat('neon'); roundRect(X0, Y0w, X1 - X0, Y1 - Y0w, 22); ctx.fill(); ctx.restore();
      const vg = ctx.createRadialGradient(480, 300, 60, 480, 300, 560); vg.addColorStop(0, 'rgba(143,117,255,.18)'); vg.addColorStop(1, 'rgba(0,0,10,.45)');
      ctx.fillStyle = vg; roundRect(X0, Y0w, X1 - X0, Y1 - Y0w, 22); ctx.fill();
      glow('#8F75FF', 16, () => { ctx.strokeStyle = 'rgba(160,140,255,.85)'; ctx.lineWidth = 3; roundRect(X0 + 3, Y0w + 3, X1 - X0 - 6, Y1 - Y0w - 6, 20); ctx.stroke(); });
      // gravity well: swirling disc on the deck
      if (well) {
        const k = Math.min(1, well.t / 1.5);
        const g = ctx.createRadialGradient(well.x, well.y, 4, well.x, well.y, well.reach * 0.6);
        g.addColorStop(0, `rgba(10,0,30,${0.95 * k})`); g.addColorStop(0.15, `rgba(120,70,230,${0.5 * k})`); g.addColorStop(1, 'rgba(120,70,230,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(well.x, well.y, well.reach * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(200,170,255,${0.5 * k})`; ctx.lineWidth = 2;
        for (let j = 0; j < 4; j++) { ctx.beginPath(); for (let s = 0; s < 40; s++) { const a = j * Math.PI / 2 - t * 2 + s * 0.16, rr = well.core + s * 4.2; ctx.lineTo(well.x + Math.cos(a) * rr, well.y + Math.sin(a) * rr); } ctx.stroke(); }
        glow('#B98CFF', 18, () => { ctx.fillStyle = '#05010f'; ctx.beginPath(); ctx.arc(well.x, well.y, well.core, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#d7c2ff'; ctx.lineWidth = 2; ctx.stroke(); });
      }
      // flight path for the bean you follow (through the first option of each gate)
      ctx.setLineDash([6, 10]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(me.x, me.y); for (let i = me.next; i < GATES; i++) ctx.lineTo(gates[i][0].x, gates[i][0].y); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      // floor markers under each ring (the actual pass zone)
      gates.forEach((os, i) => os.forEach((r) => {
        const mine = i === me.next, done = i < me.next;
        const col = done ? '#7EE2B8' : r.gold && os.length > 1 ? '#FFD95B' : mine ? '#FFD95B' : '#37D8E9';
        if (!done) lightPool(r.x, r.y, mine ? 90 : 60, mine ? 'rgba(255,217,91,1)' : 'rgba(55,216,233,1)', mine ? 0.45 : 0.25);
        ctx.strokeStyle = hexA(col, done ? 0.25 : 0.7); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, passR(r), 0, Math.PI * 2); ctx.stroke();
        if (mine) { const k = (t * 1.6) % 1; ctx.strokeStyle = hexA(col, 1 - k); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, passR(r) + k * 30, 0, Math.PI * 2); ctx.stroke(); }
        if (r === os[0]) { let n = 0; for (const b of beans) if (b.next === i) { ctx.fillStyle = b.color; ctx.strokeStyle = '#0b0f28'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r.x - 22 + n * 9, r.y + 36, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); n++; } }
      }));
      // forks: a dashed link and an OR tag between the two choices
      gates.forEach((os, i) => { if (os.length < 2 || i < me.next) return; const [a, c] = os; ctx.setLineDash([4, 8]); ctx.strokeStyle = 'rgba(255,217,91,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]); const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2; ctx.fillStyle = 'rgba(10,13,36,.85)'; roundRect(mx - 16, my - 10, 32, 20, 8); ctx.fill(); bigLabel('OR', mx, my + 1, '#FFD95B', 12); });
      // exhaust flames (additive)
      additive(() => { for (const f of flames) { const k = f.t / f.life; ctx.fillStyle = `rgba(255,${Math.round(200 - k * 140)},${Math.round(80 - k * 60)},${0.8 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x, f.y - lift(6), 3 + k * 6, 0, Math.PI * 2); ctx.fill(); } });
      // upright rings + asteroids + rocket sleds
      const ups = [];
      gates.forEach((os, i) => os.forEach((r) => ups.push({ y: r.y, draw: () => billboard(r.x, r.y, 0, () => {
        const mine = i === me.next, done = i < me.next, fork = os.length > 1;
        const col = done ? '#7EE2B8' : fork && r.gold ? '#FFD95B' : mine ? '#FFD95B' : '#37D8E9';
        const bob = Math.sin(t * 2 + i) * 2, cy = -34 + bob, base = r.gold && fork ? 19 : 26, rr = mine ? base + 2 + Math.sin(t * 8) * 1.5 : base;
        ctx.globalAlpha = done ? 0.35 : 1;
        ctx.fillStyle = '#20264f'; ctx.fillRect(-2, cy + rr, 4, -cy - rr);
        ctx.strokeStyle = shade(col, 0.5); ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(0, cy + 2, rr, rr * 1.05, 0, 0, Math.PI * 2); ctx.stroke();
        glow(col, mine ? 20 : 10, () => { ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, cy, rr, rr * 1.05, 0, 0, Math.PI * 2); ctx.stroke(); });
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, cy, rr, rr * 1.05, 0, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
        ctx.fillStyle = '#0b0f28'; ctx.beginPath(); ctx.arc(0, cy - rr - 12, fork ? 13 : 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col; ctx.font = '12px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(fork ? (r.gold ? `${i + 1}★` : `${i + 1}`) : String(i + 1), 0, cy - rr - 11);
        ctx.globalAlpha = 1;
      }) })));
      for (const r of rocks) { contactShadow(r.x, r.y + 6, r.r * 1.1, r.r * 0.5, 0.45); ups.push({ y: r.y, draw: () => billboard(r.x, r.y, 10, () => {
        ctx.save(); ctx.rotate(r.a); ctx.beginPath(); r.shape.forEach((s, j) => { const a = j / r.shape.length * Math.PI * 2; ctx.lineTo(Math.cos(a) * r.r * s, Math.sin(a) * r.r * s); }); ctx.closePath();
        const g = ctx.createRadialGradient(-r.r * 0.3, -r.r * 0.4, 2, 0, 0, r.r * 1.2); g.addColorStop(0, '#b9a58c'); g.addColorStop(1, '#4e4236');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#2a221c'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(30,22,16,.5)'; ctx.beginPath(); ctx.arc(r.r * 0.25, r.r * 0.1, r.r * 0.22, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-r.r * 0.35, r.r * 0.3, r.r * 0.14, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }) }); }
      for (const b of beans) ups.push({ y: b.y - 0.5, draw: () => billboard(b.x, b.y, 0, () => {
        const sp = hyp(b.vx, b.vy), dir = sp > 5 ? Math.sign(b.vx || 1) : 1;
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 4, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.scale(dir, 1);
        ctx.fillStyle = '#d9dcf5'; roundRect(-22, -6, 40, 11, 5); ctx.fill();
        ctx.fillStyle = b.color; ctx.beginPath(); ctx.moveTo(18, -6); ctx.quadraticCurveTo(30, -1, 18, 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FF557D'; ctx.beginPath(); ctx.moveTo(-22, -6); ctx.lineTo(-28, -12); ctx.lineTo(-16, -6); ctx.closePath(); ctx.fill();
        if (sp > 60) glow('#FFB547', 12, () => { ctx.fillStyle = '#FFE68F'; ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(-32 - VRAND() * 8, 0); ctx.lineTo(-22, 3); ctx.closePath(); ctx.fill(); });
        ctx.restore();
      }) });
      drawAll(beans, ups);
      tally(beans, (b) => `${b.next}/${GATES}`, (b) => b.next / GATES);
    },
    winner(t, to) { return scoreWinner(beans, to, (b) => b.next, GATES, (b) => { const os = opts(b.next); return -Math.min(...os.map((r) => hyp(b.x - r.x, b.y - r.y))); }); },
  };
})();
