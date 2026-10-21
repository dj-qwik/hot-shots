// 12 · Meteor Market — a night market under a meteor shower. Gold rings mark where a star will land:
// be inside when it lands to catch it, or grab it off the ground before it fades. Red rings are bombs:
// they knock you back, stun you and spill one of your stars. First to 8 stars.
// Anti-exploit: drops are uniform over the plaza (no safe camping spot), catches need you to read the
// telegraph and move, and bombs punish standing in crowds. Star rate scales with player count.
ARENAS.meteor = (() => {
  const TARGET = 8, X1 = 30, X2 = 930, Y1 = 60, Y2 = 560, FALL = 1.4, H0 = 520;
  let drops, ground, beans, spawnT, mp, stalls;
  return {
    key: 'meteor', name: 'Meteor Market', genre: 'Collection', theme: 'space', timeout: ROUND_SECONDS, maxSpeed: 215,
    objective: 'Stand in a gold ring to catch the falling star, or grab it after it lands. Red rings are bombs. First to 8 stars.',
    init(bs) {
      beans = bs; drops = []; ground = []; spawnT = 0.3; mp = new Set();
      placeRing(beans, 480, 300, 150, 100, rnd(0, 6.3)); beans.forEach((b) => { b.stars = 0; b.zoff = 0; });
      stalls = [0, 1, 2, 3, 4].map((k) => ({ x: 110 + k * 185, c: ['#FF557D', '#37D8E9', '#FFB547', '#8F75FF', '#7EE2B8'][k] }));
    },
    update(dt, t) {
      if ((spawnT -= dt) <= 0) { spawnT = 0.5 * 4 / Math.max(4, beans.length); drops.push({ x: rnd(X1 + 70, X2 - 70), y: rnd(Y1 + 35, Y2 - 55), t: FALL, bomb: Math.random() < 0.36, ph: rnd(0, 6) }); }
      for (const d of drops) {
        d.t -= dt;
        if (d.t <= 0) {
          if (d.bomb) {
            sparks(d.x, d.y, 20, ['#ff4d6d', '#ffb347', '#fff'], 320, 0.5); puff(d.x, d.y, 12, 'rgba(70,50,80,.8)', 130, 10, 0.7); ring(d.x, d.y, '#ff4d6d', 10, 70, 0.4, 6);
            let nearHuman = false;
            for (const b of beans) {
              if (b.human && hyp(b.x - d.x, b.y - d.y) < 160) nearHuman = true;
              if (hyp(b.x - d.x, b.y - d.y) < 58 && b.z < 30) {
                const n = norm(b.x - d.x, b.y - d.y); b.kx += n.x * 380; b.ky += n.y * 380; b.stun = 0.9;
                if (b.stars > 0) { b.stars--; ground.push({ x: clamp(b.x + n.x * 40, X1 + 10, X2 - 10), y: clamp(b.y + n.y * 40, Y1 + 10, Y2 - 10), t: 2, ph: rnd(0, 6) }); popText(b.x, b.y - 46, '-1 ★', '#ff4d6d', 16); }
                if (b.human) beep(90, 0.2, 'sawtooth', 0.05);
              }
            }
            if (nearHuman) shake(5);
          } else {
            const catcher = beans.filter((b) => hyp(b.x - d.x, b.y - d.y) < 30).sort((a, c) => hyp(a.x - d.x, a.y - d.y) - hyp(c.x - d.x, c.y - d.y))[0];
            sparks(d.x, d.y - 10, 12, ['#FFD95B', '#fff'], 200, 0.45);
            if (catcher) { catcher.stars++; if (catcher.human) beep(1050, 0.08, 'sine', 0.05); } else ground.push({ x: d.x, y: d.y, t: 2.2, ph: rnd(0, 6) });
          }
        }
      }
      drops = drops.filter((d) => d.t > 0);
      for (const g of ground) { g.t -= dt; for (const b of beans) if (g.t > 0 && b.z < 16 && hyp(b.x - g.x, b.y - g.y) < 24) { b.stars++; g.t = 0; if (b.human) beep(1050, 0.08, 'sine', 0.05); } }
      ground = ground.filter((g) => g.t > 0);
      for (const b of beans) {
        b.x = clamp(b.x, X1, X2); b.y = clamp(b.y, Y1, Y2);
        if (drops.some((d) => d.bomb && d.t < 0.6 && hyp(b.x - d.x, b.y - d.y) < 58)) b.scaredT = 0.2;
        if (b.stars === TARGET - 1 && !mp.has(b)) { mp.add(b); announce(b.human ? 'ONE MORE STAR!' : `${(b.name || 'SOMEONE').toUpperCase()} NEEDS 1!`, '#FFD95B'); }
      }
    },
    botInput(b, t) {
      let best = null, bs = -1e9;
      const sp = 215 * b.speedMul;
      for (const d of drops) if (!d.bomb) { const dist = hyp(d.x - b.x, d.y - b.y); const eta = dist / sp; const s = (eta < d.t + 2 ? 1 : 0) * 100 - dist * 0.25 - beans.filter((o) => o !== b && hyp(o.x - d.x, o.y - d.y) < dist).length * 25; if (s > bs) { bs = s; best = d; } }
      for (const g of ground) { const dist = hyp(g.x - b.x, g.y - b.y); const s = 110 - dist * 0.25; if (s > bs) { bs = s; best = g; } }
      let x = 0, y = 0;
      if (best) { const n = seek(b, best.x, best.y); const k = clamp(hyp(best.x - b.x, best.y - b.y) / 20, 0, 1); x = n.x * k; y = n.y * k; }
      for (const d of drops) if (d.bomb && d.t < 0.9) { const dist = hyp(b.x - d.x, b.y - d.y); if (dist < 75) { const n = dist > 1 ? norm(b.x - d.x, b.y - d.y) : { x: 1, y: 0 }; x += n.x * 2 * b.skill; y += n.y * 2 * b.skill; } }
      const n = hyp(x, y) > 1 ? norm(x, y) : { x, y };
      return { x: n.x, y: n.y, jump: false, dive: false };
    },
    draw(t) {
      // market stalls along the back with string lights
      for (const s of stalls) sprite(Y1 - 40, () => billboard(s.x, Y1 - 40, 0, () => {
        box(150, 46, 34, '#5a3a2a', '#3d2619', { r: 4 });
        ctx.fillStyle = '#2a1a12'; ctx.fillRect(-68, -96, 5, 62); ctx.fillRect(63, -96, 5, 62);
        ctx.save(); ctx.beginPath(); ctx.moveTo(-80, -100); ctx.lineTo(80, -100); ctx.lineTo(86, -78); ctx.lineTo(-86, -78); ctx.closePath(); ctx.clip();
        for (let k = -90; k < 90; k += 20) { ctx.fillStyle = (k / 20) % 2 ? s.c : '#fff3d6'; ctx.fillRect(k, -100, 20, 24); }
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let k = -86; k < 86; k += 20) { ctx.beginPath(); ctx.arc(k + 10, -78, 10, 0, Math.PI); ctx.fill(); }
        for (let k = -86; k < 86; k += 20) { ctx.fillStyle = (k / 20) % 2 ? s.c : '#fff3d6'; ctx.beginPath(); ctx.arc(k + 10, -78, 10, 0, Math.PI); ctx.fill(); }
        for (let k = -40; k <= 40; k += 40) { glow('#FFD95B', 12, () => { ctx.fillStyle = '#FFD95B'; ctx.beginPath(); ctx.arc(k, -46, 4, 0, Math.PI * 2); ctx.fill(); }); }
        ctx.fillStyle = 'rgba(255,240,200,.8)'; ctx.font = '700 9px "Baloo 2", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★ STARS ★', 0, -56);
      }));
      // plaza
      platformRect(X1 - 14, Y1 - 14, X2 - X1 + 28, Y2 - Y1 + 28, mat('tile'), '#151a3e', 14, 16);
      ctx.fillStyle = 'rgba(40,20,70,.4)'; roundRect(X1 - 14, Y1 - 14, X2 - X1 + 28, Y2 - Y1 + 28, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(255,217,91,.25)'; ctx.lineWidth = 2; roundRect(X1 - 6, Y1 - 6, X2 - X1 + 12, Y2 - Y1 + 12, 12); ctx.stroke();
      grain(X1 - 14, Y1 - 14, X2 - X1 + 28, Y2 - Y1 + 28, 0.05);
      for (const s of stalls) lightPool(s.x, Y1 + 10, 130, '#FFB547', 0.16);
      // telegraphs
      for (const d of drops) {
        const p = 1 - d.t / FALL, late = d.t < 0.3 && Math.sin(t * 50) > 0, r = d.bomb ? 58 : 30;
        const c = d.bomb ? [255, 70, 90] : [255, 217, 91];
        ctx.fillStyle = `rgba(${c},${0.1 + p * 0.3})`; ctx.beginPath(); ctx.arc(d.x, d.y, r * (d.bomb ? p : 0.4 + p * 0.6), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = late ? '#fff' : `rgb(${c})`; ctx.lineWidth = d.bomb ? 3 : 2.5; ctx.setLineDash(d.bomb ? [9, 6] : []); ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        if (d.bomb) { ctx.fillStyle = `rgba(255,90,110,${0.5 + p * 0.5})`; ctx.font = '18px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', d.x, d.y); }
        const hgt = (d.t / FALL) * H0, dx = (d.t / FALL) * 110;
        sprite(d.y + 0.5, () => billboard(d.x - dx, d.y, hgt, () => {
          additive(() => {
            const g = ctx.createLinearGradient(0, 0, -70, -150); g.addColorStop(0, d.bomb ? 'rgba(255,90,90,.75)' : 'rgba(255,230,140,.9)'); g.addColorStop(1, 'rgba(255,120,60,0)');
            ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = d.bomb ? 10 : 14; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-55, -125); ctx.stroke(); ctx.lineCap = 'butt';
          });
          if (d.bomb) { sphere(11, '#2a2238', { hi: '#8a7aa8' }); ctx.strokeStyle = '#c9a36a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -9); ctx.quadraticCurveTo(9, -16, 7, -20); ctx.stroke(); glow('#ff7a3d', 10, () => { ctx.fillStyle = Math.sin(t * 30) > 0 ? '#ffd27a' : '#ff4d6d'; ctx.beginPath(); ctx.arc(7, -21, 3, 0, Math.PI * 2); ctx.fill(); }); }
          else { ctx.rotate(t * 4 + d.ph); glow('#FFD95B', 16, () => { ctx.fillStyle = '#FFD95B'; SHAPES['✦'](0, 0, 14); }); ctx.fillStyle = '#fff'; SHAPES['✦'](0, 0, 6); }
        }));
      }
      // landed stars: spinning, glowing, blinking before they fade
      for (const g of ground) {
        lightPool(g.x, g.y, 46, '#FFD95B', 0.3);
        if (g.t < 0.6 && Math.sin(t * 30) < 0) continue;
        sprite(g.y, () => billboard(g.x, g.y, 14 + Math.sin(t * 5 + g.ph) * 3, () => { ctx.scale(Math.cos(t * 3 + g.ph), 1); glow('#FFD95B', 14, () => { ctx.fillStyle = '#FFD95B'; SHAPES['✦'](0, 0, 13); }); ctx.fillStyle = '#fff6c8'; SHAPES['✦'](0, 0, 5); }));
      }
      drawAll(beans);
      tally(beans, (b) => `★ ${b.stars}/${TARGET}`, (b) => b.stars / TARGET);
    },
    winner(t, to) { return scoreWinner(beans, to, (b) => b.stars, TARGET); },
  };
})();
