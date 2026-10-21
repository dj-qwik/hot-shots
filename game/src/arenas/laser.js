// 22 · Laser Limbo — survival on a shrinking disc swept by rotating beams. Red beams run low: JUMP them.
// Violet beams run high: DIVE under them. The emitter pylon in the middle is solid and near it the beams
// cover you for longer than a jump lasts, so hugging the centre is a death trap. Partway through, the
// beams reverse direction (telegraphed). Timeout tie-break: most beams cleared.
ARENAS.laser = (() => {
  const C = { x: 480, y: 300 }, O = ovalKit(C, 1.35), HUB_R = 34, LOW_Z = 8, HIGH_Z = 27, SEG = 9;
  let beams, beans, floorR, flip, flipWarn;
  const beamEnd = (bm) => O.pt(bm.a, floorR + 26);
  const COL = { low: ['#ff3d6e', '#ff9db5'], high: ['#9b7bff', '#d8ccff'] };
  // one beam piece, drawn in world space at its height; queued as a sprite so beans in front cover it
  function beamPiece(bm, r0, r1, t) {
    const z = bm.type === 'low' ? LOW_Z : HIGH_Z, dz = lift(z);
    const ca = Math.cos(bm.a), sa = Math.sin(bm.a);
    const x0 = C.x + ca * r0 * O.SX, y0 = C.y + sa * r0, x1 = C.x + ca * r1 * O.SX, y1 = C.y + sa * r1;
    sprite((y0 + y1) / 2, () => {
      const [c, hi] = COL[bm.type];
      ctx.lineCap = 'round';
      if (bm.warm) {
        ctx.globalAlpha = 0.35 + 0.35 * (Math.sin(t * 26) > 0 ? 1 : 0);
        ctx.setLineDash([10, 9]); ctx.strokeStyle = c; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x0, y0 - dz); ctx.lineTo(x1, y1 - dz); ctx.stroke(); ctx.setLineDash([]);
      } else additive(() => {
        const flick = 0.85 + 0.15 * Math.sin(t * 40 + r0);
        ctx.beginPath(); ctx.moveTo(x0, y0 - dz); ctx.lineTo(x1, y1 - dz);
        ctx.globalAlpha = 0.18 * flick; ctx.strokeStyle = c; ctx.lineWidth = 18; ctx.stroke();
        ctx.globalAlpha = 0.55 * flick; ctx.lineWidth = 7; ctx.stroke();
        ctx.globalAlpha = 1; ctx.strokeStyle = hi; ctx.lineWidth = 2.6; ctx.stroke();
      });
      ctx.globalAlpha = 1; ctx.lineCap = 'butt';
    });
  }
  return {
    key: 'laser', name: 'Laser Limbo', genre: 'Survival', theme: 'neon', timeout: ROUND_SECONDS,
    objective: 'Red beams are low: JUMP them. Violet beams are high: DIVE under them. Near the pylon the beams are too wide to clear, so stay out on the floor.',
    maxSpeed: 190,
    diveSpeed: 320, // shorter dive so diving under a beam doesn't carry you off the platform
    init(bs) {
      beans = bs; floorR = 270; flip = rnd(13, 18); flipWarn = false;
      beams = [{ a: rnd(0, Math.PI * 2), w: 0.75, type: 'low', warm: 2.5 }];
      const n = beans.length, a0 = rnd(0, Math.PI * 2);
      beans.forEach((b, i) => { const a = (i / n) * Math.PI * 2 + a0; const q = O.pt(a, 160); b.x = q.x; b.y = q.y; b.clears = 0; b.lb = {}; });
    },
    update(dt, t) {
      floorR = clamp(270 - Math.max(0, t - 4) * 5.2, 145, 270);
      // evenly spaced beams that all turn the same way: a readable rhythm that tightens
      if (t > 5.5 && beams.length === 1) beams.push({ a: beams[0].a + Math.PI, w: beams[0].w, type: 'high', warm: 1.5 });
      if (t > 10.5 && beams.length === 2) beams.push({ a: beams[0].a + Math.PI / 2, w: beams[0].w, type: 'low', warm: 1.5 });
      if (t > 15 && beams.length === 3) beams.push({ a: beams[0].a - Math.PI / 2, w: beams[0].w, type: 'high', warm: 1.5 });
      if (!flipWarn && t > flip - 1.2) { flipWarn = true; announce('REVERSE!', '#E85BD9', 'Beams switch direction'); }
      if (flip && t > flip) { for (const bm of beams) bm.w = -bm.w; flip = 0; hype(0.3); }
      const ramp = 1 + t * 0.034;
      for (const bm of beams) { bm.a += bm.w * ramp * dt; bm.warm = Math.max(0, (bm.warm || 0) - dt); }
      for (const b of beans) {
        if (!b.alive) continue;
        // the pylon is solid
        const dc = hyp(b.x - C.x, b.y - C.y);
        if (dc < HUB_R + R) { const n = dc > 0.1 ? norm(b.x - C.x, b.y - C.y) : { x: 1, y: 0 }; b.x = C.x + n.x * (HUB_R + R); b.y = C.y + n.y * (HUB_R + R); }
        if (O.d(b.x, b.y) > floorR + 4 && b.z < 1) { kill(b, t); continue; }
        for (let k = 0; k < beams.length; k++) {
          const bm = beams[k], e = beamEnd(bm);
          const over = segDist(b.x, b.y, C.x, C.y, e.x, e.y) < R - 2;
          if (over && !bm.warm) {
            const hit = bm.type === 'low' ? b.z < LOW_Z + 1 : b.proneT <= 0;
            if (hit) { b.zapped = true; sparks(b.x, b.y - 20, 12, [COL[bm.type][0], '#fff'], 260, 0.4); kill(b, t, 70); break; }
          }
          if (!over && b.lb[k] && !bm.warm) { b.clears++; if (b.human) popText(b.x, b.y - 44, 'CLEAR', '#7EE2B8', 14); }
          b.lb[k] = over;
        }
      }
    },
    botInput(b, t) {
      const ang = O.ang(b.x, b.y);
      let jump = false, dive = false;
      const ramp = 1 + t * 0.034;
      b.memo ||= {};
      const radNow = Math.max(30, O.d(b.x, b.y));
      let diveDir = null;
      beams.forEach((bm, k) => {
        const w = bm.w * ramp;
        // time until the beam's leading edge reaches us (the beam has width, which is a wide angle near the hub)
        const ahead = angDiff(ang, bm.a) * Math.sign(w) - (R + 2) / radNow;
        const tt = ahead > -0.05 ? Math.max(0, ahead) / Math.abs(w) : 99;
        if (tt > 0.7) b.memo[k] = undefined;
        if (tt < 0.5 && b.memo[k] === undefined) b.memo[k] = Math.random() < 0.8 + b.skill * 0.18; // decide once per pass
        if (b.memo[k]) {
          if (bm.type === 'low' && tt < 0.1) jump = true;
          if (bm.type === 'high' && tt < 0.12 && b.diveCd <= 0) { dive = true; const s = Math.sign(w); diveDir = norm(Math.sin(ang) * s * 0.8 - Math.cos(ang) * 0.6, -Math.cos(ang) * s * 0.8 - Math.sin(ang) * 0.6); }
        }
      });
      // orbit at a comfortable radius, away from crowds
      const rad = O.d(b.x, b.y), want = Math.max(95, floorR * 0.62);
      let dx = ((want - rad) * Math.cos(ang) * 0.03 - Math.sin(ang) * 0.4) * O.SX, dy = (want - rad) * Math.sin(ang) * 0.03 + Math.cos(ang) * 0.4;
      for (const o of beans) if (o !== b && o.alive) { const d = hyp(o.x - b.x, o.y - b.y); if (d < 50) { dx -= (o.x - b.x) / d; dy -= (o.y - b.y) / d; } }
      const n = norm(dx, dy); const s = clamp(Math.abs(want - rad) / 40, 0.25, 1);
      return dive ? { x: diveDir.x, y: diveDir.y, jump: false, dive: true } : { x: n.x * s, y: n.y * s, jump, dive: false };
    },
    draw(t) {
      // ── the disc: extruded metal deck with a neon rim
      O.stretch(() => {
      platformCircle(C.x, C.y, floorR, mat('metal'), '#141a42', 24);
      const sh = ctx.createRadialGradient(C.x, C.y, HUB_R, C.x, C.y, floorR);
      sh.addColorStop(0, 'rgba(30,8,40,.55)'); sh.addColorStop(0.5, 'rgba(20,24,70,.25)'); sh.addColorStop(1, 'rgba(60,40,120,.1)');
      ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(C.x, C.y, floorR, 0, Math.PI * 2); ctx.fill();
      // danger zone near the pylon (beams too wide to clear)
      ctx.fillStyle = `rgba(255,61,110,${0.1 + 0.05 * Math.sin(t * 4)})`; ctx.beginPath(); ctx.arc(C.x, C.y, 78, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,61,110,.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(C.x, C.y, 78, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(55,216,233,.12)'; ctx.lineWidth = 2; for (let rr = 110; rr < floorR; rr += 40) { ctx.beginPath(); ctx.arc(C.x, C.y, rr, 0, Math.PI * 2); ctx.stroke(); }
      for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; ctx.strokeStyle = k % 3 ? 'rgba(55,216,233,.2)' : 'rgba(55,216,233,.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(C.x + Math.cos(a) * (floorR - 16), C.y + Math.sin(a) * (floorR - 16)); ctx.lineTo(C.x + Math.cos(a) * (floorR - 6), C.y + Math.sin(a) * (floorR - 6)); ctx.stroke(); }
      // shrinking edge telegraph: the outer band that drops next
      if (t > 4 && floorR > 151) {
        ctx.save(); ctx.beginPath(); ctx.arc(C.x, C.y, floorR, 0, Math.PI * 2); ctx.arc(C.x, C.y, floorR - 12, 0, Math.PI * 2, true); ctx.clip();
        ctx.fillStyle = 'rgba(255,181,71,.4)'; ctx.fillRect(C.x - floorR, C.y - floorR, floorR * 2, floorR * 2);
        ctx.strokeStyle = 'rgba(20,10,0,.45)'; ctx.lineWidth = 5; const o = (t * 30) % 16;
        for (let x = -floorR * 2; x < floorR * 2; x += 16) { ctx.beginPath(); ctx.moveTo(C.x + x - o, C.y - floorR); ctx.lineTo(C.x + x + floorR - o, C.y + floorR); ctx.stroke(); }
        ctx.restore();
      }
      glow('#37D8E9', 12, () => { ctx.strokeStyle = '#37D8E9'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(C.x, C.y, floorR - 1, 0, Math.PI * 2); ctx.stroke(); });
      });
      // ── beam floor-glow (their footprint) so height reads
      for (const bm of beams) {
        if (bm.warm) continue;
        const e = beamEnd(bm);
        additive(() => { ctx.globalAlpha = 0.22; ctx.strokeStyle = COL[bm.type][0]; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(C.x, C.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.globalAlpha = 1; });
      }
      // ── beams (as depth-sorted pieces), outer emitters, the pylon
      for (const bm of beams) {
        const L = floorR + 26 - HUB_R;
        for (let k = 0; k < SEG; k++) beamPiece(bm, HUB_R + (L * k) / SEG, HUB_R + (L * (k + 1)) / SEG, t);
        const e = beamEnd(bm), z = bm.type === 'low' ? LOW_Z : HIGH_Z;
        sprite(e.y, () => billboard(e.x, e.y, z, () => {
          const [c, hi] = COL[bm.type];
          ctx.fillStyle = '#10142e'; roundRect(-9, -9, 18, 18 + z, 5); ctx.fill();
          glow(c, 10, () => { ctx.fillStyle = bm.warm ? shade(c, 0.5) : c; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); });
          ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(-1.5, -1.5, 2, 0, Math.PI * 2); ctx.fill();
          ctx.font = '11px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,8,24,.9)'; const lab = bm.warm ? 'ARMING' : bm.type === 'low' ? 'JUMP' : 'DIVE';
          ctx.strokeText(lab, 0, -12); ctx.fillStyle = bm.warm ? '#fff' : hi; ctx.fillText(lab, 0, -12);
        }));
      }
      sprite(C.y, () => billboard(C.x, C.y, 0, () => {
        const rx = HUB_R, ry = HUB_R * TILT, h = 46;
        const g = ctx.createLinearGradient(-rx, 0, rx, 0); g.addColorStop(0, '#2b3266'); g.addColorStop(0.45, '#5a64a8'); g.addColorStop(1, '#161a3c');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI); ctx.lineTo(-rx, -h); ctx.ellipse(0, -h, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
        // glowing band that spins with the beams
        for (let k = 0; k < 8; k++) { const a = (beams[0]?.a || 0) + k * Math.PI / 4; if (Math.sin(a) <= 0) continue; ctx.fillStyle = k % 2 ? '#ff3d6e' : '#9b7bff'; ctx.fillRect(Math.cos(a) * rx * 0.9 - 3, -h * 0.55, 6, 8); }
        ctx.fillStyle = '#3b4486'; ctx.beginPath(); ctx.ellipse(0, -h, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        glow('#E85BD9', 16, () => { ctx.fillStyle = '#E85BD9'; ctx.beginPath(); ctx.ellipse(0, -h, rx * 0.5, ry * 0.5, 0, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-rx * 0.15, -h - ry * 0.15, rx * 0.18, ry * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      }));
      drawAll(beans);
      tally(beans, (b) => b.alive ? `${b.clears} cleared` : 'OUT');
    },
    winner(t, timedOut) { return survivalWinner(beans, t, timedOut, (b) => b.clears); },
  };
})();
