// 12 · Meteor Market — a night market under a meteor shower. Gold rings mark where a star will land:
// be inside when it lands to catch it, or grab it off the ground before it fades. Red rings are bombs:
// they knock you back, stun you and spill one of your stars. First to 8 stars.
// Anti-exploit: drops are uniform over the plaza (no safe camping spot), catches need you to read the
// telegraph and move, and bombs punish standing in crowds. Star rate scales with player count.
// Combos: three sky catches in a row (no bomb hit in between) earn a bonus star. A dive tackle knocks a
// star loose from a rival. TWIST at 12 s: a GOLDEN COMET (worth 3) is telegraphed for 3 s — fight for the spot.
ARENAS.meteor = (() => {
  const TARGET = 8, X1 = 30, X2 = 930, Y1 = 60, Y2 = 560, FALL = 1.4, H0 = 520;
  let drops, ground, beans, spawnT, mp, stalls, comet, twisted;
  const COMET_T = 3, COMET_R = 52;
  const loose = (b, n) => { if (b.stars <= 0) return; b.stars--; ground.push({ x: clamp(b.x + n.x * 46, X1 + 10, X2 - 10), y: clamp(b.y + n.y * 46, Y1 + 10, Y2 - 10), t: 2, ph: rnd(0, 6) }); popText(b.x, b.y - 46, '-1 ★', '#ff4d6d', 16); };
  return {
    key: 'meteor', name: 'Meteor Market', genre: 'Collection', theme: 'space', timeout: ROUND_SECONDS, maxSpeed: 215,
    objective: 'Catch falling stars in the gold rings (3 sky catches in a row = bonus star). Red rings are bombs; tackle rivals to knock stars loose. First to 8.',
    power: { kinds: ['zoom', 'shove', 'bubble'], every: [4, 6], spot() { return { x: rnd(X1 + 60, X2 - 60), y: rnd(Y1 + 40, Y2 - 40) }; } },
    onTackle(vic, att) { loose(vic, norm(vic.x - att.x || 1, vic.y - att.y)); vic.combo = 0; },
    init(bs) {
      beans = bs; drops = []; ground = []; spawnT = 0.3; mp = new Set();
      placeRing(beans, 480, 300, 150, 100, rnd(0, 6.3)); beans.forEach((b) => { b.stars = 0; b.zoff = 0; b.combo = 0; });
      comet = null; twisted = false;
      stalls = [0, 1, 2, 3, 4].map((k) => ({ x: 110 + k * 185, c: ['#FF557D', '#37D8E9', '#FFB547', '#8F75FF', '#7EE2B8'][k] }));
    },
    update(dt, t) {
      if (!twisted && t >= 12) {
        twisted = true; announce('TWIST: GOLDEN COMET — WORTH 3!', '#FFD95B');
        comet = { x: rnd(X1 + 140, X2 - 140), y: rnd(Y1 + 100, Y2 - 100), t: COMET_T };
      }
      if (comet && (comet.t -= dt) <= 0) {
        const c = comet; comet = null;
        sparks(c.x, c.y - 10, 30, ['#FFD95B', '#fff', '#FFB547'], 340, 0.6); ring(c.x, c.y, '#FFD95B', 14, 110, 0.5, 8); shake(4);
        const w = beans.filter((b) => b.z < 40 && hyp(b.x - c.x, b.y - c.y) < COMET_R).sort((a, o) => hyp(a.x - c.x, a.y - c.y) - hyp(o.x - c.x, o.y - c.y))[0];
        if (w) { w.stars += 3; popText(w.x, w.y - 50, '+3 ★ COMET!', '#FFD95B', 20); if (w.human) beep(1300, 0.15, 'sine', 0.05); }
        else for (let k = 0; k < 3; k++) ground.push({ x: clamp(c.x + rnd(-60, 60), X1 + 10, X2 - 10), y: clamp(c.y + rnd(-40, 40), Y1 + 10, Y2 - 10), t: 2.5, ph: rnd(0, 6) });
      }
      if ((spawnT -= dt) <= 0) { spawnT = (t >= 12 ? 0.42 : 0.5) * 4 / Math.max(4, beans.length); drops.push({ x: rnd(X1 + 70, X2 - 70), y: rnd(Y1 + 35, Y2 - 55), t: FALL, bomb: Math.random() < 0.36, ph: rnd(0, 6) }); }
      for (const d of drops) {
        d.t -= dt;
        if (d.t <= 0) {
          if (d.bomb) {
            sparks(d.x, d.y, 20, ['#ff4d6d', '#ffb347', '#fff'], 320, 0.5); puff(d.x, d.y, 12, 'rgba(70,50,80,.8)', 130, 10, 0.7); ring(d.x, d.y, '#ff4d6d', 10, 70, 0.4, 6);
            let nearHuman = false;
            for (const b of beans) {
              if (b.human && hyp(b.x - d.x, b.y - d.y) < 160) nearHuman = true;
              if (hyp(b.x - d.x, b.y - d.y) < 58 && b.z < 30) {
                if (shielded(b)) continue;
                const n = norm(b.x - d.x, b.y - d.y); b.kx += n.x * 380; b.ky += n.y * 380; b.stun = 0.9; b.combo = 0;
                loose(b, n);
                if (b.human) beep(90, 0.2, 'sawtooth', 0.05);
              }
            }
            if (nearHuman) shake(5);
          } else {
            const catcher = beans.filter((b) => hyp(b.x - d.x, b.y - d.y) < 30).sort((a, c) => hyp(a.x - d.x, a.y - d.y) - hyp(c.x - d.x, c.y - d.y))[0];
            sparks(d.x, d.y - 10, 12, ['#FFD95B', '#fff'], 200, 0.45);
            if (catcher) {
              catcher.stars++; catcher.combo = (catcher.combo || 0) + 1;
              if (catcher.combo >= 3) { catcher.combo = 0; catcher.stars++; popText(catcher.x, catcher.y - 50, 'COMBO +1 ★', '#FFD95B', 18); ring(catcher.x, catcher.y, '#FFD95B', 10, 60, 0.4, 5); }
              if (catcher.human) beep(1050 + catcher.combo * 150, 0.08, 'sine', 0.05);
            } else ground.push({ x: d.x, y: d.y, t: 2.2, ph: rnd(0, 6) });
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
      // the golden comet beats everything if we can get there in time
      if (comet && hyp(comet.x - b.x, comet.y - b.y) / sp < comet.t + 0.4 * b.skill) best = comet;
      // tackle a star-rich rival who's right next to us
      if (b.diveCd <= 0) for (const o of beans) if (o !== b && o.stars >= 2 && o.hitCd <= 0 && hyp(o.x - b.x, o.y - b.y) < 70 && Math.random() < 0.03 + b.skill * 0.05) { const d = seek(b, o.x, o.y); return { x: d.x, y: d.y, jump: false, dive: true }; }
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
      if (comet) {
        const p = 1 - comet.t / COMET_T, late = comet.t < 0.5 && Math.sin(t * 40) > 0;
        lightPool(comet.x, comet.y, 120, '#FFD95B', 0.25 + p * 0.3);
        ctx.fillStyle = `rgba(255,217,91,${0.15 + p * 0.35})`; ctx.beginPath(); ctx.arc(comet.x, comet.y, COMET_R * (0.3 + p * 0.7), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = late ? '#fff' : '#FFD95B'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(comet.x, comet.y, COMET_R, 0, Math.PI * 2); ctx.stroke();
        bigLabel('×3', comet.x, comet.y, 'rgba(120,70,0,.8)', 22);
        const hgt = (comet.t / COMET_T) * H0 * 1.4, dx = (comet.t / COMET_T) * 160;
        sprite(comet.y + 0.5, () => billboard(comet.x - dx, comet.y, hgt, () => {
          additive(() => { const g = ctx.createLinearGradient(0, 0, -100, -200); g.addColorStop(0, 'rgba(255,230,140,1)'); g.addColorStop(1, 'rgba(255,120,60,0)'); ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-80, -180); ctx.stroke(); ctx.lineCap = 'butt'; });
          ctx.rotate(t * 3); glow('#FFD95B', 24, () => { ctx.fillStyle = '#FFD95B'; SHAPES['✦'](0, 0, 26); }); ctx.fillStyle = '#fff'; SHAPES['✦'](0, 0, 11);
        }));
      }
      // combo pips over each catcher's head
      for (const b of beans) if (b.combo > 0) sprite(b.y + 0.03, () => billboard(b.x, b.y, b.z + 84, () => { for (let k = 0; k < 3; k++) { ctx.fillStyle = k < b.combo ? '#FFD95B' : 'rgba(255,255,255,.25)'; SHAPES['✦'](-12 + k * 12, 0, 5); } }));
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
