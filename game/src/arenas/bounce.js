// 45 · Bounce House Brawl — king of the hill on an inflatable. Of everyone standing on the glowing pad, the
// bean closest to its centre banks time — at full rate alone, half rate while someone else is on it.
// The pad shrinks over its life and hops to a new spot (shown in advance). Airborne beans don't score.
// Trampolines fling you forward along your run direction — a skill shortcut to the next pad.
ARENAS.bounce = (() => {
  const TARGET = 6, X1 = 70, X2 = 890, Y1 = 60, Y2 = 545;
  let pad, nextPad, padT, padLife, tramps, beans;
  const randSpot = () => ({ x: rnd(X1 + 110, X2 - 110), y: rnd(Y1 + 95, Y2 - 95) });
  const padR = () => 46 + 28 * clamp(padT / padLife, 0, 1); // 74 → 46 as the pad ages
  function newPad(from) {
    let p, tries = 0;
    do { p = randSpot(); tries++; } while (tries < 40 && (hyp(p.x - from.x, p.y - from.y) < 260 || tramps.some((s) => hyp(s.x - p.x, s.y - p.y) < 125)));
    return p;
  }
  return {
    key: 'bounce', name: 'Bounce House Brawl', genre: 'Arena control', theme: 'candy', timeout: ROUND_SECONDS, maxSpeed: 210, tackle: 520,
    objective: 'Stand closest to the centre of the glowing pad to bank time. Alone banks double. Shove rivals off — first to 6 seconds.',
    _dbg: { pad: () => pad },
    init(bs) {
      beans = bs; padLife = 6; padT = padLife;
      tramps = [];
      const spots = [[200, 150], [480, 120], [760, 150], [200, 460], [480, 490], [760, 460]];
      for (const [x, y] of spots) tramps.push({ x: x + rnd(-25, 25), y: y + rnd(-15, 15), cd: 0, dip: 0 });
      pad = { ...newPad({ x: -999, y: -999 }) }; nextPad = null;
      placeRing(beans, 480, 305, 300, 175, rnd(0, Math.PI * 2));
      beans.forEach((b) => { b.cap = 0; b.kingT = 0; });
    },
    update(dt, t) {
      padLife = t > 18 ? 4.5 : t > 10 ? 5.2 : 6;
      padT -= dt;
      if (padT < 1.6 && !nextPad) nextPad = newPad(pad);
      if (padT <= 0) { pad = nextPad; nextPad = null; padT = padLife; ring(pad.x, pad.y, '#7EE2B8', 10, 90, 0.5, 6); }
      const r = padR();
      // king of the hill: grounded beans on the pad, closest to centre banks
      const on = beans.filter((b) => b.alive && b.z < 4 && hyp(b.x - pad.x, b.y - pad.y) < r).sort((a, c) => hyp(a.x - pad.x, a.y - pad.y) - hyp(c.x - pad.x, c.y - pad.y));
      pad.contested = on.length > 1; pad.king = on[0] || null;
      if (pad.king) {
        const k = pad.king, rate = pad.contested ? 0.5 : 1;
        const before = k.cap; k.cap += dt * rate; k.kingT += dt;
        if (k.human && Math.floor(k.cap * 2) !== Math.floor(before * 2)) beep(700 + k.cap * 50, 0.04, 'sine', 0.03);
        if (Math.random() < dt * 8) part({ x: k.x + rnd(-10, 10), y: k.y, vy: -40, size: 2.5, life: 0.6, color: '#FFD95B', kind: 'dot', drag: 1, g: -30 });
      }
      for (const b of beans) if (b !== pad.king) b.kingT = 0;
      // trampolines: launch along your run direction (predictable, so they're a skill shortcut)
      for (const s of tramps) {
        s.cd -= dt; s.dip = Math.max(0, s.dip - dt * 4);
        for (const b of beans) if (s.cd <= 0 && b.z <= 0.5 && b.proneT <= 0 && hyp(b.x - s.x, b.y - s.y) < 30) {
          const sp = hyp(b.vx, b.vy), d = sp > 40 ? { x: b.vx / sp, y: b.vy / sp } : { x: b.fx, y: b.fy };
          b.vz = 600; b.kx += d.x * 300; b.ky += d.y * 300; s.cd = 0.5; s.dip = 1;
          ring(s.x, s.y, '#37D8E9', 8, 44, 0.3, 4);
          if (b.human) beep(440, 0.1, 'triangle', 0.05);
        }
      }
      for (const b of beans) {
        // inflatable walls are springy: bounce back in
        if (b.x < X1 + 14) { b.x = X1 + 14; b.kx = Math.abs(b.kx) * 0.6 + 60; }
        if (b.x > X2 - 14) { b.x = X2 - 14; b.kx = -Math.abs(b.kx) * 0.6 - 60; }
        if (b.y < Y1 + 12) { b.y = Y1 + 12; b.ky = Math.abs(b.ky) * 0.6 + 60; }
        if (b.y > Y2 - 12) { b.y = Y2 - 12; b.ky = -Math.abs(b.ky) * 0.6 - 60; }
      }
    },
    botInput(b, t) {
      const goNext = nextPad && padT < 0.6 + 1.0 * b.skill;
      const tgt = goNext ? nextPad : pad;
      const r = padR();
      const inPad = hyp(b.x - pad.x, b.y - pad.y) < r;
      // not the king? go after the king when close enough to land a shove
      if (b.diveCd <= 0 && pad.king && pad.king !== b && hyp(pad.king.x - b.x, pad.king.y - b.y) < 75 && Math.random() < 0.08 + b.skill * 0.1) {
        const d = seek(b, pad.king.x, pad.king.y); return { x: d.x, y: d.y, jump: false, dive: true };
      }
      if (inPad && b.diveCd <= 0) {
        // shove whoever is on the pad right next to us
        for (const o of beans) if (o !== b && hyp(o.x - pad.x, o.y - pad.y) < r + 12 && hyp(o.x - b.x, o.y - b.y) < 60 && Math.random() < 0.05 + b.skill * 0.07) {
          const d = seek(b, o.x, o.y); return { x: d.x, y: d.y, jump: false, dive: true };
        }
      }
      // skilled bots use a trampoline when it's roughly on the way to a far target
      let aim = tgt;
      const far = hyp(tgt.x - b.x, tgt.y - b.y);
      if (far > 280 && b.skill > 0.8) for (const s of tramps) { const ds = hyp(s.x - b.x, s.y - b.y), d2 = hyp(tgt.x - s.x, tgt.y - s.y); if (ds < 120 && d2 < far - 60) { aim = s; break; } }
      const dist = hyp(aim.x - b.x, aim.y - b.y); const d = seek(b, aim.x, aim.y);
      const sc = aim === tgt ? clamp(dist / 10, 0.15, 1) : 1;
      return { x: d.x * sc, y: d.y * sc, jump: false, dive: false };
    },
    draw(t) {
      const r = padR();
      // ── inflatable floor: puffy stripes with a raised rim
      const dd = lift(20);
      ctx.fillStyle = 'rgba(30,5,30,.35)'; roundRect(X1 - 20, Y1 - 6 + dd + 12, X2 - X1 + 46, Y2 - Y1 + 30, 34); ctx.fill();
      ctx.fillStyle = '#b02f63'; roundRect(X1 - 26, Y1 - 26 + dd, X2 - X1 + 52, Y2 - Y1 + 52, 34); ctx.fill();
      ctx.save(); roundRect(X1 - 26, Y1 - 26, X2 - X1 + 52, Y2 - Y1 + 52, 34); ctx.clip();
      const sw = 64;
      for (let x = X1 - 26, k = 0; x < X2 + 26; x += sw, k++) {
        const g = ctx.createLinearGradient(x, 0, x + sw, 0);
        const c = k % 2 ? '#ffb3d1' : '#ffe1ee';
        g.addColorStop(0, shade(c, 0.86)); g.addColorStop(0.5, c); g.addColorStop(1, shade(c, 0.86));
        ctx.fillStyle = g; ctx.fillRect(x, Y1 - 26, sw, Y2 - Y1 + 52);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + sw * 0.3, Y1 - 26, sw * 0.12, Y2 - Y1 + 52);
      }
      // quilted seams + soft top-light
      ctx.strokeStyle = 'rgba(160,40,90,.18)'; ctx.lineWidth = 2;
      for (let y = Y1 + 20; y < Y2; y += 64) { ctx.beginPath(); ctx.moveTo(X1 - 26, y); ctx.lineTo(X2 + 26, y); ctx.stroke(); }
      const sh = ctx.createLinearGradient(0, Y1, 0, Y2); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(1, 'rgba(120,20,70,.12)');
      ctx.fillStyle = sh; ctx.fillRect(X1 - 26, Y1 - 26, X2 - X1 + 52, Y2 - Y1 + 52);
      ctx.restore();
      // ── puffy perimeter tube (a cylinder: dark lower edge, bright upper lip)
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#c2386f'; ctx.lineWidth = 26; roundRect(X1 - 13, Y1 - 13 + lift(4), X2 - X1 + 26, Y2 - Y1 + 26, 30); ctx.stroke();
      ctx.strokeStyle = '#ff5f95'; ctx.lineWidth = 22; roundRect(X1 - 13, Y1 - 13 - lift(6), X2 - X1 + 26, Y2 - Y1 + 26, 30); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5; roundRect(X1 - 16, Y1 - 16 - lift(10), X2 - X1 + 32, Y2 - Y1 + 32, 32); ctx.stroke();
      ctx.strokeStyle = 'rgba(150,20,70,.35)'; ctx.lineWidth = 2;
      for (let x = X1 + 40; x < X2; x += 80) for (const y of [Y1 - 13, Y2 + 13]) { ctx.beginPath(); ctx.moveTo(x, y - lift(16)); ctx.lineTo(x, y + lift(6)); ctx.stroke(); }
      // printed star emblem in the middle of the floor
      ctx.save(); ctx.translate(480, 305); ctx.rotate(t * 0.05); ctx.fillStyle = 'rgba(255,255,255,.22)';
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? 46 : 110; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.restore();
      // ── trampolines (padded rim, springy mat that dips when used)
      for (const s of tramps) {
        const dip = s.dip * 6, my = s.y - lift(6) + dip;
        contactShadow(s.x + 4, s.y + 10, 40, 22, 0.25);
        ctx.fillStyle = '#123a52'; ctx.beginPath(); ctx.ellipse(s.x, s.y - lift(2), 30, 30, 0, 0, Math.PI * 2); ctx.fill();
        const mg = ctx.createRadialGradient(s.x - 6, my - 6, 2, s.x, my, 30);
        mg.addColorStop(0, s.cd > 0 ? '#3a6f8a' : '#24506c'); mg.addColorStop(1, '#0c2233');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(s.x, my, 27, 27 - dip * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(55,216,233,.35)'; ctx.lineWidth = 1.2; for (let k = 8; k < 27; k += 6) { ctx.beginPath(); ctx.ellipse(s.x, my, k, k, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.strokeStyle = '#1a8fb0'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(s.x, s.y - lift(4), 31, 31, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#5fe4ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(s.x, s.y - lift(8), 31, 31, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, s.y - lift(10), 31, 31, 0, Math.PI * 1.05, Math.PI * 1.85); ctx.stroke();
      }
      // ── next pad: dashed ring, path from the current pad
      if (nextPad) {
        const blink = 0.55 + 0.45 * Math.sin(t * 14);
        ctx.strokeStyle = `rgba(46,170,125,${blink})`; ctx.lineWidth = 5; ctx.setLineDash([12, 9]); ctx.lineDashOffset = -t * 40;
        ctx.beginPath(); ctx.arc(nextPad.x, nextPad.y, 74, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        const dx = nextPad.x - pad.x, dy = nextPad.y - pad.y, L = hyp(dx, dy) || 1, ux = dx / L, uy = dy / L;
        ctx.strokeStyle = 'rgba(46,160,120,.55)'; ctx.lineWidth = 5; ctx.setLineDash([4, 12]); ctx.beginPath(); ctx.moveTo(pad.x + ux * (r + 10), pad.y + uy * (r + 10)); ctx.lineTo(nextPad.x - ux * 84, nextPad.y - uy * 84); ctx.stroke(); ctx.setLineDash([]);
        bigLabel('NEXT', nextPad.x, nextPad.y, 'rgba(30,110,80,.85)', 16);
      }
      // ── the pad: emissive disc, pulsing rings, life arc, contested flash
      const hot = pad.contested ? (Math.sin(t * 22) > 0 ? '#FFB547' : '#ff8a3d') : '#4fd6a2';
      lightPool(pad.x, pad.y, r * 2.2, pad.contested ? 'rgba(255,181,71,.9)' : 'rgba(126,226,184,.9)', 0.3);
      ctx.fillStyle = 'rgba(20,60,50,.3)'; ctx.beginPath(); ctx.arc(pad.x, pad.y + lift(-5), r + 4, 0, Math.PI * 2); ctx.fill();
      const pg = ctx.createRadialGradient(pad.x, pad.y, 4, pad.x, pad.y, r);
      pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.18, hexA(hot, 0.95)); pg.addColorStop(1, hexA(hot, 0.6));
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(pad.x, pad.y, r, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 3; k++) { const ph = (t * 0.9 + k / 3) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(pad.x, pad.y, r * ph, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pad.x, pad.y, 8, 0, Math.PI * 2); ctx.stroke();
      glow(hot, 16, () => { ctx.strokeStyle = hot; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(pad.x, pad.y, r, 0, Math.PI * 2); ctx.stroke(); });
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(pad.x, pad.y, r + 11, -Math.PI / 2, -Math.PI / 2 + clamp(padT / padLife, 0, 1) * Math.PI * 2); ctx.stroke(); ctx.lineCap = 'butt';
      // ── beans + a crown on whoever is king
      const extras = [];
      if (pad.king) {
        const k = pad.king;
        extras.push({ y: k.y + 0.02, draw: () => billboard(k.x, k.y, k.z + (k.zoff || 0) + 74, () => {
          const bob = Math.sin(t * 6) * 2;
          glow('#FFD95B', 14, () => drawCrown(0, bob, 1.25));
          if (pad.contested) { ctx.font = '10px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#3a1a00'; ctx.strokeText('×½', 0, bob - 16); ctx.fillStyle = '#FFB547'; ctx.fillText('×½', 0, bob - 16); }
        }) });
      }
      // inflatable corner pillars (upright, depth-sorted with the beans)
      for (const [cx, cy, c] of [[X1 - 13, Y1 - 13, '#37D8E9'], [X2 + 13, Y1 - 13, '#FFD95B'], [X1 - 13, Y2 + 13, '#FFD95B'], [X2 + 13, Y2 + 13, '#37D8E9']]) {
        extras.push({ y: cy, draw: () => billboard(cx, cy, 0, () => {
          const g = ctx.createLinearGradient(-15, 0, 15, 0); g.addColorStop(0, shade(c, 0.75)); g.addColorStop(0.4, shade(c, 1.2)); g.addColorStop(1, shade(c, 0.6));
          ctx.fillStyle = g; roundRect(-15, -62, 30, 66, 14); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 2; for (const yy of [-44, -24]) { ctx.beginPath(); ctx.moveTo(-14, yy); ctx.quadraticCurveTo(0, yy + 4, 14, yy); ctx.stroke(); }
          ctx.save(); ctx.translate(0, -66); sphere(16, '#ff5f95'); ctx.restore();
        }) });
      }
      drawAll(beans, extras);
      tally(beans, (b) => `${b.cap.toFixed(1)} / ${TARGET}s`, (b) => b.cap / TARGET);
    },
    winner(t, to) { return scoreWinner(beans, to, (b) => b.cap, TARGET); },
  };
})();
