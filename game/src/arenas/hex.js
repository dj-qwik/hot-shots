// 21 · Hex Hop — survival on two stacked floors. A tile cracks the first time you step on it and drops
// if you step back on it or linger. Fall through the top floor and you land in the basement; fall through
// the basement and you're out. Jumping crosses tiles without touching them.
// STOMP: when a dive ends, the tiles around you crack (your own tile is spared) — break the floor under
// rivals, at the cost of lying flat for a moment. TWIST at 15 s: the top floor turns to ICE.
// REFERENCE ARENA for the 2.5D renderer: extruded tiles, a lower level drawn under the upper one,
// per-level depth sorting (basement beans before top tiles), telegraphed hazards, theme + lighting.
ARENAS.hex = (() => {
  const r = 27, w = Math.sqrt(3) * r, BASE_Z = -86, THICK = 11;
  let tiles, beans, storm, debris, icy, stomps;
  const grounded = (b) => b.z <= 0.5 || b.touch;
  function stomp(b) {
    const own = tileUnder(b); let n = 0;
    for (const tl of tiles) {
      if (tl === own || tl.layer !== b.layer || hyp(tl.x - b.x, tl.y - b.y) > r * 2.3) continue;
      if (tl.state === 0) { tl.state = 3; n++; } else if (tl.state === 3) { tl.state = 1; tl.t = 0.8; n++; }
    }
    stomps.push({ x: b.x, y: b.y, layer: b.layer, t: 0.5 });
    ring(b.x, b.y - lift(layerZ(b.layer)), b.layer ? '#8f7bff' : '#5ff0ff', 12, 70, 0.35, 5);
    if (b.human && n) { popText(b.x, b.y - 40, 'STOMP!', '#5ff0ff', 18); shake(3); beep(160, 0.1, 'square', 0.05); }
  }
  function tileUnder(b) { let best = null, bd = r * 1.04; for (const tl of tiles) { if (tl.layer !== b.layer || tl.state === 2) continue; const d = hyp(tl.x - b.x, tl.y - b.y); if (d < bd) { bd = d; best = tl; } } return best; }
  const layerZ = (layer) => (layer ? BASE_Z : 0);
  // one extruded hex tile in world space at height z
  function drawTile(tl, z, t) {
    const dz = lift(z), y = tl.y - dz;
    let drop = 0, alpha = 1;
    if (tl.state === 1) { const k = 1 - clamp(tl.t / 0.8, 0, 1); drop = k * k * 26; alpha = 1 - k * 0.6; }
    const yy = y + lift(drop);
    const top = tl.layer ? ['#8f7bff', '#6a52e6'] : ['#5ff0ff', '#22b6cc'];
    const side = tl.layer ? '#3a2a8f' : '#127684';
    ctx.globalAlpha = alpha;
    hexPath(tl.x, yy + lift(THICK), r - 1.5); ctx.fillStyle = side; ctx.fill();
    ctx.fillRect(tl.x - (r - 1.5) * 0.866, yy, (r - 1.5) * 1.732, lift(THICK));
    hexPath(tl.x, yy, r - 1.5);
    const warn = tl.state === 1;
    const g = ctx.createLinearGradient(tl.x - r, yy - r, tl.x + r, yy + r);
    if (warn) { const on = Math.sin(t * 38) > 0; g.addColorStop(0, on ? '#ffe78f' : '#ffb347'); g.addColorStop(1, on ? '#ffb347' : '#e8862c'); }
    else { g.addColorStop(0, tl.state === 3 ? shade(top[0], 0.8) : top[0]); g.addColorStop(1, tl.state === 3 ? shade(top[1], 0.75) : top[1]); }
    ctx.fillStyle = g; ctx.fill();
    // bevel highlight + rim
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.6; hexPath(tl.x, yy, r - 4.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(5,10,40,.4)'; ctx.lineWidth = 1.2; hexPath(tl.x, yy, r - 1.5); ctx.stroke();
    if (tl.state === 3 || warn) {
      ctx.strokeStyle = warn ? 'rgba(90,40,0,.7)' : 'rgba(5,30,50,.65)'; ctx.lineWidth = 1.8; ctx.beginPath();
      ctx.moveTo(tl.x - 13, yy - 8); ctx.lineTo(tl.x - 3, yy - 1); ctx.lineTo(tl.x - 7, yy + 9); ctx.moveTo(tl.x - 3, yy - 1); ctx.lineTo(tl.x + 10, yy + 3); ctx.lineTo(tl.x + 14, yy - 6); ctx.moveTo(tl.x + 10, yy + 3); ctx.lineTo(tl.x + 6, yy + 13);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  return {
    key: 'hex', name: 'Hex Hop', genre: 'Survival', theme: 'neon', timeout: ROUND_SECONDS, maxSpeed: 165,
    objective: 'Tiles crack when you step on them and drop if you return or linger. Dive to STOMP the tiles around rivals. Fall through both floors and you are out.',
    power: {
      kinds: ['bubble', 'shove', 'zoom'], every: [4, 6.5], botGrab: 80,
      spot() {
        const c = tiles.filter((tl) => tl.layer === 0 && tl.state === 0);
        if (beans.filter((b) => b.alive && b.layer === 0).length < 2 || !c.length) return null;
        const tl = c[(Math.random() * c.length) | 0]; return { x: tl.x, y: tl.y };
      },
      // a bubble catches you as you fall out of the basement: you land on a solid tile instead
      rescue(b) {
        const c = tiles.filter((tl) => tl.layer === 1 && tl.state === 0 && beans.every((o) => o === b || !o.alive || hyp(o.x - tl.x, o.y - tl.y) > 60));
        if (!c.length) return false;
        const tl = c[(Math.random() * c.length) | 0]; b.x = tl.x; b.y = tl.y; b.cur = null; b.stand = 0; return true;
      },
    },
    mods(b) { return icy && b.layer === 0 && b.z <= 0.5 ? { traction: 0.16, slow: 1.1 } : null; },
    init(bs) {
      beans = bs; tiles = []; storm = 0; debris = []; icy = false; stomps = [];
      for (const layer of [0, 1]) {
        let row = 0;
        for (let y = 78; y < 540; y += r * 1.5, row++) for (let x = 110 + (row % 2) * w / 2; x < 860; x += w) tiles.push({ x, y, layer, state: 0, t: 0 });
      }
      const n = beans.length, a0 = rnd(0, Math.PI * 2);
      beans.forEach((b, i) => { const a = a0 + (i / n) * Math.PI * 2; b.x = 480 + Math.cos(a) * 220; b.y = 300 + Math.sin(a) * 170; b.layer = 0; b.zoff = 0; b.broken = 0; b.wasDive = false; });
    },
    update(dt, t) {
      if (!icy && t >= 15) { icy = true; announce('TWIST: ICE FLOOR!', '#9fe8ff'); }
      for (const s2 of stomps) s2.t -= dt; stomps = stomps.filter((s2) => s2.t > 0);
      for (const tl of tiles) if (tl.state === 1 && (tl.t -= dt) <= 0) { tl.state = 2; puff(tl.x, tl.y - lift(layerZ(tl.layer)), 4, tl.layer ? 'rgba(143,123,255,.6)' : 'rgba(95,240,255,.6)', 50, 6, 0.4); }
      // after 8 s a storm cracks random tiles so rounds stay short
      if (t > 8 && (storm -= dt) <= 0) { storm = Math.max(0.15, 0.7 - (t - 8) * 0.03); for (let k = 0; k < 5; k++) { const c = tiles.filter((x) => x.state === 0 || x.state === 3); if (c.length) { const tl = c[(Math.random() * c.length) | 0]; tl.state = 1; tl.t = 0.8; } } }
      for (const b of beans) {
        if (!b.alive) continue;
        b.x = clamp(b.x, 70, 890); b.y = clamp(b.y, 50, 560);
        // falling between levels: zoff eases down to the basement height
        if (b.layer === 1 && b.zoff > BASE_Z) { b.zoff = Math.max(BASE_Z, b.zoff - 420 * dt); if (b.zoff === BASE_Z) { fxLand(b); shake(b.human ? 4 : 0); } continue; }
        const diving = b.diveT > 0;
        if (b.wasDive && !diving) stomp(b);
        b.wasDive = diving;
        if (!grounded(b)) continue;
        const tl = tileUnder(b);
        if (!tl) {
          if (b.layer === 0) { b.layer = 1; b.scaredT = 0.8; if (b.human) { beep(300, 0.15, 'sine', 0.05); popText(b.x, b.y - 40, 'BASEMENT!', '#8f7bff', 18); } }
          else kill(b, t);
          continue;
        }
        // intact → cracked on first step; re-entering a cracked tile, or lingering, drops it
        if (tl !== b.cur) { b.cur = tl; b.stand = 0; if (tl.state === 0) tl.state = 3; else if (tl.state === 3) { tl.state = 1; tl.t = 0.8; b.broken++; } }
        else if ((b.stand += dt) > 1.0 && tl.state !== 1) { tl.state = 1; tl.t = 0.8; b.broken++; }
      }
    },
    botInput(b, t) {
      if ((b.think -= 1 / 60) <= 0) {
        b.think = rnd(0.25, 0.45);
        let best = null, bs = -1e9;
        for (const tl of tiles) {
          if (tl.layer !== b.layer || (tl.state !== 0 && tl.state !== 3)) continue;
          const d = hyp(tl.x - b.x, tl.y - b.y); if (d < 25 || d > 190) continue;
          const risky = tl.state === 3 ? 25 : 0;
          let nb = 0; for (const o of tiles) if (o.layer === tl.layer && o.state !== 2 && o.state !== 1 && hyp(o.x - tl.x, o.y - tl.y) < 2.2 * r) nb += o.state === 0 ? 1 : 0.4;
          let crowd = 0; for (const o of beans) if (o !== b && o.alive && o.layer === b.layer && hyp(o.x - tl.x, o.y - tl.y) < 60) crowd++;
          const s = nb * 10 - d * 0.06 - crowd * 18 - risky * b.skill + Math.random() * 8 * (1.2 - b.skill);
          if (s > bs) { bs = s; best = tl; }
        }
        b.plan = best;
      }
      const tgt = b.plan || { x: 480, y: 300 };
      const d = norm(tgt.x - b.x, tgt.y - b.y);
      let jump = false;
      const probe = { x: b.x + d.x * 30, y: b.y + d.y * 30, layer: b.layer };
      if (!tileUnder(probe) && Math.random() < b.skill) jump = true;
      if (Math.random() < 0.06 * b.skill) jump = true;
      // stomp: dive at a nearby rival standing on our floor (only from solid footing)
      let dive = false, dx = d.x, dy = d.y;
      const own = tileUnder(b);
      if (b.diveCd <= 0 && own && own.state === 0 && Math.random() < 0.02 + b.skill * 0.04) {
        const foe = beans.find((o) => o !== b && o.alive && o.layer === b.layer && hyp(o.x - b.x, o.y - b.y) < 75);
        if (foe) { const f = norm(foe.x - b.x, foe.y - b.y); dx = f.x; dy = f.y; dive = true; jump = false; }
      }
      return { x: dx, y: dy, jump, dive };
    },
    draw(t) {
      // abyss under the basement
      const ab = ctx.createRadialGradient(480, 330 + lift(-BASE_Z), 40, 480, 330 + lift(-BASE_Z), 560);
      ab.addColorStop(0, 'rgba(120,60,255,.35)'); ab.addColorStop(1, 'rgba(10,4,30,0)');
      ctx.fillStyle = 'rgba(4,2,14,.85)'; ctx.fillRect(60, 40, 840, 560 + lift(-BASE_Z));
      ctx.fillStyle = ab; ctx.fillRect(40, 20, 880, 640 + lift(-BASE_Z));
      // basement level, then the beans standing on it, then the top level over them
      for (const tl of tiles) if (tl.layer === 1 && tl.state !== 2) drawTile(tl, BASE_Z, t);
      drawAll(beans.filter((b) => b.layer === 1 && b.zoff <= BASE_Z + 1));
      ctx.fillStyle = 'rgba(8,4,30,.28)'; ctx.fillRect(60, 40, 840, 540); // depth haze between floors
      for (const tl of tiles) if (tl.layer === 0 && tl.state !== 2) drawTile(tl, 0, t);
      if (icy) { ctx.save(); ctx.globalAlpha = 0.38; for (const tl of tiles) if (tl.layer === 0 && (tl.state === 0 || tl.state === 3)) { hexPath(tl.x, tl.y, r - 3); ctx.fillStyle = mat('ice'); ctx.fill(); } ctx.restore(); }
      for (const s2 of stomps) { const k = 1 - s2.t / 0.5, yy = s2.y - lift(layerZ(s2.layer)); ctx.strokeStyle = `rgba(255,255,255,${s2.t * 1.6})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(s2.x, yy, 12 + k * r * 2.3, (12 + k * r * 2.3) * 0.75, 0, 0, Math.PI * 2); ctx.stroke(); }
      drawAll(beans.filter((b) => b.layer === 0 || b.zoff > BASE_Z + 1));
      const alive = beans.filter((b) => b.alive).length, me = beans.find((b) => b.human);
      inScreen(() => {
        ctx.font = '12px Bungee, sans-serif'; ctx.textBaseline = 'middle';
        ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,.75)';
        if (me && me.alive) ctx.fillText(me.layer === 0 ? 'TOP FLOOR' : 'BASEMENT · LAST FLOOR', 16, H - 92);
        ctx.textAlign = 'right'; ctx.fillText(`${alive} STANDING`, W - 16, H - 92);
      });
    },
    winner(t, timedOut) {
      const alive = beans.filter((b) => b.alive);
      if (alive.length === 1 && beans.length > 1) return alive[0];
      if (alive.length === 0) return [...beans].sort((a, b) => (b.outAt - a.outAt) || (b.broken - a.broken))[0];
      if (timedOut) return [...alive].sort((a, b) => (a.layer - b.layer) || (b.broken - a.broken))[0];
      return null;
    },
  };
})();
