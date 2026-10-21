// 44 · Rocket Rodeo — fly through 8 rings in order on a twitchy toy rocket. Everyone chases the same rings.
// Anti-exploit: rings are scattered 230–520 px apart in a random chain, so no fixed direction or spot scores.
ARENAS.rodeo = (() => {
  let rings, beans, flames;
  const X0 = 14, Y0w = 14, X1 = 946, Y1 = 586;
  return {
    key: 'rodeo', name: 'Rocket Rodeo', genre: 'Vehicle skill', theme: 'space', timeout: ROUND_SECONDS, maxSpeed: 265,
    objective: 'Your rocket drifts, so steer early. Fly through rings 1 to 8 in order. First through all eight wins.',
    init(bs) {
      beans = bs; rings = []; flames = [];
      let p = { x: 480, y: 300 };
      while (rings.length < 8) {
        const c = { x: rnd(90, 870), y: rnd(90, 500) };
        if (hyp(c.x - p.x, c.y - p.y) > 230 && hyp(c.x - p.x, c.y - p.y) < 520) { rings.push(c); p = c; }
      }
      placeRing(beans, 480, 300, 60, 60);
      beans.forEach((b) => { b.next = 0; });
    },
    mods() { return { traction: 0.24, slow: 1 }; },
    update(dt, t) {
      for (const b of beans) {
        if (b.x < 20 || b.x > 940) { b.vx *= -0.6; b.x = clamp(b.x, 20, 940); sparks(b.x, b.y - 10, 4, ['#fff', '#8F75FF'], 120, 0.25); }
        if (b.y < 20 || b.y > 580) { b.vy *= -0.6; b.y = clamp(b.y, 20, 580); sparks(b.x, b.y - 10, 4, ['#fff', '#8F75FF'], 120, 0.25); }
        const r = rings[b.next];
        if (r && hyp(b.x - r.x, b.y - r.y) < 25) {
          b.next++; b.happyT = 0.5;
          ring(r.x, r.y, b.color, 12, 70, 0.4, 4);
          if (b.human) { beep(700 + b.next * 60, 0.07, 'sine', 0.05); sparks(r.x, r.y - lift(28), 10, ['#FFD95B', '#fff', b.color], 200, 0.4); }
          if (b.next === 7) { feed(`${b.name} on the last ring!`, b.color); hype(0.5); }
        }
        const sp = hyp(b.vx, b.vy);
        if (sp > 60 && VRAND() < 0.8) { const v = (a, b) => a + VRAND() * (b - a); flames.push({ x: b.x - b.vx / sp * 14 + v(-3, 3), y: b.y - b.vy / sp * 14 + v(-3, 3), vx: -b.vx * 0.3 + v(-20, 20), vy: -b.vy * 0.3 + v(-20, 20), life: v(0.25, 0.4), t: 0 }); } // visual only
      }
      for (const f of flames) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; }
      flames = flames.filter((f) => f.t < f.life);
    },
    botInput(b, t) {
      const r = rings[Math.min(b.next, 7)];
      const k = 0.45 * b.skill + 0.1;
      const d = norm(r.x - b.x - b.vx * k, r.y - b.y - b.vy * k);
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
      // flight path for the bean you follow
      ctx.setLineDash([6, 10]); ctx.lineDashOffset = -t * 30; ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(me.x, me.y); for (let i = me.next; i < 8; i++) ctx.lineTo(rings[i].x, rings[i].y); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      // floor markers under each ring (the actual pass zone)
      rings.forEach((r, i) => {
        const mine = i === me.next, done = i < me.next;
        const col = done ? '#7EE2B8' : mine ? '#FFD95B' : '#37D8E9';
        if (!done) lightPool(r.x, r.y, mine ? 90 : 60, mine ? 'rgba(255,217,91,1)' : 'rgba(55,216,233,1)', mine ? 0.45 : 0.25);
        ctx.strokeStyle = hexA(col, done ? 0.25 : 0.7); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, 25, 0, Math.PI * 2); ctx.stroke();
        if (mine) { const k = (t * 1.6) % 1; ctx.strokeStyle = hexA(col, 1 - k); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, 25 + k * 30, 0, Math.PI * 2); ctx.stroke(); }
        let n = 0; for (const b of beans) if (b.next === i) { ctx.fillStyle = b.color; ctx.strokeStyle = '#0b0f28'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r.x - 22 + n * 9, r.y + 36, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); n++; }
      });
      // exhaust flames (additive)
      additive(() => { for (const f of flames) { const k = f.t / f.life; ctx.fillStyle = `rgba(255,${Math.round(200 - k * 140)},${Math.round(80 - k * 60)},${0.8 * (1 - k)})`; ctx.beginPath(); ctx.arc(f.x, f.y - lift(6), 3 + k * 6, 0, Math.PI * 2); ctx.fill(); } });
      // upright rings + rocket sleds
      const ups = rings.map((r, i) => ({ y: r.y, draw: () => billboard(r.x, r.y, 0, () => {
        const mine = i === me.next, done = i < me.next;
        const col = done ? '#7EE2B8' : mine ? '#FFD95B' : '#37D8E9';
        const bob = Math.sin(t * 2 + i) * 2, cy = -34 + bob, rr = mine ? 28 + Math.sin(t * 8) * 1.5 : 26;
        ctx.globalAlpha = done ? 0.35 : 1;
        ctx.fillStyle = '#20264f'; ctx.fillRect(-2, cy + rr, 4, -cy - rr);
        ctx.strokeStyle = shade(col, 0.5); ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(0, cy + 2, rr, rr * 1.05, 0, 0, Math.PI * 2); ctx.stroke();
        glow(col, mine ? 20 : 10, () => { ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, cy, rr, rr * 1.05, 0, 0, Math.PI * 2); ctx.stroke(); });
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, cy, rr, rr * 1.05, 0, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
        ctx.fillStyle = '#0b0f28'; ctx.beginPath(); ctx.arc(0, cy - rr - 12, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col; ctx.font = '12px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), 0, cy - rr - 11);
        ctx.globalAlpha = 1;
      }) }));
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
      tally(beans, (b) => `${b.next}/8`, (b) => b.next / 8);
    },
    winner(t, to) { return scoreWinner(beans, to, (b) => b.next, 8, (b) => { const r = rings[Math.min(b.next, 7)]; return -hyp(b.x - r.x, b.y - r.y); }); },
  };
})();
