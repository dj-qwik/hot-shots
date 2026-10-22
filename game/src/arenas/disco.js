// 30 · Disco Disaster — a call lights up the floor; every tile that doesn't match drops into the void. Colours and
// shapes are independent, so calls come in three kinds: "PINK + CIRCLE" (both must match — decoy tiles share one
// half), "ANY PINK" or "ANY CIRCLE". Calls get faster and safe tiles fewer; the grid reshuffles every call.
// Some calls also light a GOLD tile: always safe, and whoever is on it when the floor drops earns a bubble.
// TWIST at 15 s: the conveyor kicks in — rows slide sideways (alternating directions) and carry you along.
ARENAS.disco = (() => {
  const COLS = 8, ROWS = 5, TW = 100, TH = 90, OX = 80, OY = 70, THICK = 9, FW = COLS * TW;
  const CNAME = ['PINK', 'BLUE', 'YELLOW', 'GREEN'], SNAME = ['CIRCLE', 'TRIANGLE', 'SQUARE', 'STAR'];
  let tiles, beans, phase, pt, ptMax, call, cycle, rowOff, rowV, conveyor;
  const grounded = (b) => b.z <= 0.5 || b.touch;
  const matches = (tl) => tl.gold || (call.type === 'both' ? tl.c === call.c && tl.s === call.s : call.type === 'colour' ? tl.c === call.c : tl.s === call.s);
  const callText = () => (call.type === 'both' ? `${CNAME[call.c]} + ${SNAME[call.s]}` : call.type === 'colour' ? `ANY ${CNAME[call.c]}` : `ANY ${SNAME[call.s]}`);
  const wrapX = (x) => ((x % FW) + FW) % FW;
  // where a tile is right now (rows slide during the conveyor twist)
  const tileX = (tl) => OX + wrapX(tl.col * TW + TW / 2 + rowOff[tl.row]);
  function shuffle() {
    const safeCount = Math.max(cycle >= 7 ? 2 : 3, Math.round(10 - cycle * 1.4));
    const r = Math.random(), type = cycle === 0 ? (r < 0.5 ? 'colour' : 'shape') : r < 0.42 ? 'both' : r < 0.71 ? 'colour' : 'shape';
    call = { type, c: (Math.random() * 4) | 0, s: (Math.random() * 4) | 0 };
    const other = (v) => (v + 1 + ((Math.random() * 3) | 0)) % 4;
    for (const tl of tiles) {
      tl.gold = false; tl.rise = 0.25;
      tl.c = (Math.random() * 4) | 0; tl.s = (Math.random() * 4) | 0;
      if (type === 'colour' && tl.c === call.c) tl.c = other(call.c);
      if (type === 'shape' && tl.s === call.s) tl.s = other(call.s);
      if (type === 'both' && tl.c === call.c && tl.s === call.s) { if (Math.random() < 0.5) tl.c = other(call.c); else tl.s = other(call.s); }
    }
    const idx = shuffleWith(RNG, [...tiles.keys()]);
    for (let k = 0; k < safeCount; k++) { const tl = tiles[idx[k]]; if (type !== 'shape') tl.c = call.c; if (type !== 'colour') tl.s = call.s; }
    if (cycle >= 1 && cycle < 7 && Math.random() < 0.5) tiles[idx[safeCount + ((Math.random() * (tiles.length - safeCount)) | 0)]].gold = true;
  }
  const tileAt = (x, y) => {
    const r = Math.floor((y - OY) / TH); if (r < 0 || r >= ROWS || x < OX || x > OX + FW) return null;
    const c = Math.floor(wrapX(x - OX - rowOff[r]) / TW); return tiles[r * COLS + c];
  };
  function nearestSafe(b) {
    let best = null, bd = 1e9;
    for (const tl of tiles) if (matches(tl)) { const d = hyp(tileX(tl) - b.x, tl.y - b.y); if (d < bd) { bd = d; best = tl; } }
    return best;
  }
  return {
    key: 'disco', name: 'Disco Disaster', genre: 'Survival', theme: 'neon', timeout: ROUND_SECONDS, maxSpeed: 215,
    objective: 'Get on a tile that matches the call before the rest drop. Gold tiles are always safe!',
    power: {
      kinds: ['zoom', 'bubble'], every: [4.5, 6.5],
      spot() { const tl = tiles[(Math.random() * tiles.length) | 0]; return { x: tileX(tl), y: tl.y }; },
      rescue(b) { const tl = nearestSafe(b); if (!tl) return false; b.x = tileX(tl); b.y = tl.y; b.vx = b.vy = b.kx = b.ky = 0; return true; },
      botGrab: 70,
    },
    init(bs) {
      beans = bs; cycle = 0; tiles = []; rowOff = Array(ROWS).fill(0); rowV = Array.from({ length: ROWS }, (_, r) => (r % 2 ? 1 : -1) * 46); conveyor = false;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) tiles.push({ col: c, row: r, x: OX + c * TW + TW / 2, y: OY + r * TH + TH / 2, c: 0, s: 0, rise: 0, gold: false });
      shuffle(); phase = 'show'; pt = ptMax = 2.4;
      placeRing(beans, 480, 295, 200, 120, rnd(0, 6.3));
      beans.forEach((b) => { b.zoff = 0; });
    },
    update(dt, t) {
      pt -= dt;
      if (!conveyor && t >= 15) { conveyor = true; announce('TWIST: CONVEYOR FLOOR!', '#37D8E9', 'the rows slide'); }
      if (conveyor) for (let r = 0; r < ROWS; r++) rowOff[r] = wrapX(rowOff[r] + rowV[r] * dt);
      for (const tl of tiles) tl.rise = Math.max(0, tl.rise - dt);
      if (pt <= 0) {
        if (phase === 'show') {
          phase = 'drop'; pt = ptMax = 1.0;
          for (const b of beans) {
            if (!b.alive) continue;
            const tl = tileAt(b.x, b.y);
            if (tl && tl.gold && !b.pow) { b.pow = 'bubble'; ring(b.x, b.y, '#FFD95B', 10, 70, 0.4, 5); if (b.human) { popText(b.x, b.y - 40, 'GOLD! BUBBLE', '#FFD95B', 18); beep(1200, 0.1, 'triangle', 0.05); } }
            if (b.z > 0.5) continue;
            if (!tl || !matches(tl)) kill(b, t);
          }
          if (beans.some((b) => b.human)) beep(120, 0.2, 'square', 0.04);
          hype(0.1);
        } else {
          cycle++; shuffle(); phase = 'show'; pt = ptMax = Math.max(cycle >= 8 ? 1.0 : 1.15, 2.4 - cycle * 0.25);
          if (cycle === 3) announce('FASTER!', '#E85BD9'); else if (cycle === 6) announce('FASTER!!', '#FF557D');
        }
      }
      for (const b of beans) {
        if (!b.alive) continue;
        if (conveyor && grounded(b)) { const r = Math.floor((b.y - OY) / TH); if (r >= 0 && r < ROWS) b.x += rowV[r] * dt; }
        b.x = clamp(b.x, OX + R, OX + FW - R); b.y = clamp(b.y, OY + R, OY + ROWS * TH - R);
        if (phase === 'show' && pt < 0.6) { const tl = tileAt(b.x, b.y); if (!tl || !matches(tl)) b.scaredT = 0.2; }
        if (phase === 'drop' && grounded(b)) { const tl = tileAt(b.x, b.y); if (!tl || !matches(tl)) kill(b, t); }
      }
    },
    botInput(b, t) {
      if (phase === 'show') {
        if (b.seen !== cycle) { b.seen = cycle; b.react = rnd(0.12, 0.45) / (0.5 + b.skill) + (call.type === 'both' ? 0.12 : 0); b.wrong = Math.random() < (1 - b.skill) * (call.type === 'both' ? 0.3 : 0.18); }
        b.react -= 1 / 60;
        if (b.react > 0) return { x: 0, y: 0, jump: false, dive: false };
        // a misread "both" call settles for half a match; any other misread grabs the wrong colour
        const ok = (tl) => (b.wrong ? (call.type === 'both' ? tl.c === call.c || tl.s === call.s : tl.c === (call.c + 1) % 4) : matches(tl));
        let best = null, bd = 1e9;
        for (const tl of tiles) if (ok(tl)) {
          const tx = tileX(tl), crowd = beans.filter((o) => o !== b && o.alive && hyp(o.x - tx, o.y - tl.y) < 30).length;
          // lead a sliding tile; gold is worth a detour for good dancers
          const lead = conveyor ? rowV[tl.row] * 0.5 : 0, edge = conveyor && (tx + lead < OX + 30 || tx + lead > OX + FW - 30) ? 120 : 0;
          const d = hyp(tx + lead - b.x, tl.y - b.y) + crowd * 40 + edge - (tl.gold && !b.pow ? 90 * b.skill : 0);
          if (d < bd) { bd = d; best = tl; }
        }
        if (best) { const tx = tileX(best) + (conveyor ? rowV[best.row] * 0.25 : 0), dist = hyp(tx - b.x, best.y - b.y); const d = seek(b, tx, best.y); const s = clamp(dist / 30, 0, 1); const far = dist > 220 && pt < 0.6; return { x: d.x * s, y: d.y * s, jump: false, dive: far && Math.random() < 0.05 }; }
      }
      // during the drop on a sliding row: walk against the slide to stay on the tile
      if (conveyor) { const r = Math.floor((b.y - OY) / TH); if (r >= 0 && r < ROWS) return { x: -Math.sign(rowV[r]) * 0.2, y: 0, jump: false, dive: false }; }
      return { x: 0, y: 0, jump: false, dive: false };
    },
    draw(t) {
      const fw = COLS * TW, fh = ROWS * TH;
      // chrome frame + the void under the floor
      ctx.fillStyle = 'rgba(3,2,10,.6)'; roundRect(OX - 22, OY - 18 + lift(-6), fw + 44, fh + 40, 18); ctx.fill();
      ctx.fillStyle = mat('metal'); roundRect(OX - 18, OY - 16, fw + 36, fh + 34 + lift(16), 16); ctx.fill();
      ctx.fillStyle = 'rgba(20,10,40,.35)'; roundRect(OX - 18, OY - 16, fw + 36, fh + 34 + lift(16), 16); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; roundRect(OX - 17, OY - 15, fw + 34, fh + 32, 15); ctx.stroke();
      const vg = ctx.createRadialGradient(480, OY + fh / 2, 20, 480, OY + fh / 2, 520); vg.addColorStop(0, '#2a0c4a'); vg.addColorStop(1, '#05020c');
      ctx.fillStyle = vg; ctx.fillRect(OX - 4, OY - 4, fw + 8, fh + 8);
      ctx.strokeStyle = 'rgba(232,91,217,.18)'; ctx.lineWidth = 1.5;
      for (let x = OX; x <= OX + fw; x += 25) { ctx.beginPath(); ctx.moveTo(x, OY); ctx.lineTo(x + (x - 480) * 0.15, OY + fh); ctx.stroke(); }
      // neon chase lights around the frame
      for (let i = 0; i < 44; i++) {
        const u = i / 44, per = 2 * (fw + fh), d = u * per;
        const x = d < fw ? OX + d : d < fw + fh ? OX + fw : d < 2 * fw + fh ? OX + fw - (d - fw - fh) : OX, y = d < fw ? OY - 10 : d < fw + fh ? OY + (d - fw) : d < 2 * fw + fh ? OY + fh + 10 : OY + fh - (d - 2 * fw - fh);
        const on = ((i + Math.floor(t * 10)) % 4) === 0;
        ctx.fillStyle = on ? PALETTE4[(i >> 2) % 4][0] : 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(x, y, on ? 3.2 : 2.2, 0, Math.PI * 2); ctx.fill();
      }
      const late = phase === 'show' && pt < 0.6;
      ctx.save(); ctx.beginPath(); ctx.rect(OX - 2, OY - 60, fw + 4, fh + 80); ctx.clip();
      for (const tl of tiles) {
        const col = tl.gold ? '#FFD95B' : PALETTE4[tl.c][0], sh = PALETTE4[tl.s][1];
        const match = matches(tl);
        let z = 0, alpha = 1;
        if (phase === 'drop' && !match) { const k = 1 - pt / ptMax; z = -k * k * 220; alpha = 1 - k; }
        if (tl.rise > 0) { z = -tl.rise / 0.25 * 60; alpha = 1 - tl.rise / 0.25 * 0.7; }
        if (alpha <= 0.02) continue;
        const cx0 = tileX(tl);
        for (const cx of [cx0, cx0 - FW, cx0 + FW]) {
          if (cx < OX - TW / 2 || cx > OX + FW + TW / 2) continue;
          const x = cx - TW / 2 + 3, y = tl.y - TH / 2 + 3 - lift(z), w = TW - 6, h = TH - 6;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = shade(col, 0.35); roundRect(x, y + lift(THICK) * 0.6, w, h, 9); ctx.fill();
          ctx.fillRect(x, y + h * 0.5, w, h * 0.5 + lift(THICK) * 0.6);
          let bright = 0.62;
          if (phase === 'show') bright = match ? 0.82 + 0.18 * Math.sin(t * 12) : late ? (Math.sin(t * 40) > 0 ? 0.32 : 0.48) : 0.55;
          const g = ctx.createRadialGradient(cx, y + h * 0.45, 6, cx, y + h * 0.5, w * 0.7);
          g.addColorStop(0, shade(col, Math.min(1.5, bright + 0.55))); g.addColorStop(0.6, shade(col, bright)); g.addColorStop(1, shade(col, bright * 0.6));
          ctx.fillStyle = g; roundRect(x, y, w, h, 9); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.14)'; roundRect(x + 5, y + 4, w - 10, h * 0.28, 6); ctx.fill();
          ctx.strokeStyle = match && phase === 'show' ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.35)'; ctx.lineWidth = match && phase === 'show' ? 3 : 1.5; roundRect(x + 1, y + 1, w - 2, h - 2, 8); ctx.stroke();
          if (tl.gold) {
            glow('#FFD95B', 16, () => { ctx.fillStyle = '#fff6d0'; SHAPES['✦'](cx, y + h / 2, 20); });
            ctx.fillStyle = '#7a4a00'; ctx.font = '10px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GOLD', cx, y + h - 12);
          } else { ctx.fillStyle = `rgba(255,255,255,${match && phase === 'show' ? 0.95 : 0.45})`; SHAPES[sh](cx, y + h / 2, 15); }
          ctx.globalAlpha = 1;
          if (match && phase === 'show') lightPool(cx, tl.y, 70, col, tl.gold ? 0.3 : 0.18);
        }
      }
      ctx.restore();
      if (conveyor) for (let r = 0; r < ROWS; r++) { // slide arrows on the frame edge
        const y = OY + r * TH + TH / 2, dir = Math.sign(rowV[r]), ph = (t * 1.5) % 1;
        for (const ex of [OX - 10, OX + fw + 10]) { ctx.fillStyle = `rgba(55,216,233,${0.4 + 0.4 * Math.sin(t * 6 + r)})`; ctx.save(); ctx.translate(ex + dir * ph * 4, y); ctx.scale(dir, 1); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -8); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill(); ctx.restore(); }
      }
      // sweeping coloured spots
      for (let k = 0; k < 3; k++) lightPool(480 + Math.sin(t * (0.7 + k * 0.3) + k * 2) * 330, OY + fh / 2 + Math.cos(t * (0.9 + k * 0.2) + k) * 160, 120, PALETTE4[(k + call.c) % 4][0], 0.13);
      const ccol = call.type === 'shape' ? '#ffffff' : PALETTE4[call.c][0], csh = call.type === 'colour' ? '●' : PALETTE4[call.s][1];
      drawAll(beans);
      // caller panel (screen space): shape, name, countdown
      inScreen(() => {
        const px = W / 2 - 170, py = 122, show = phase === 'show';
        ctx.fillStyle = 'rgba(10,6,28,.88)'; roundRect(px, py, 340, 46, 23); ctx.fill();
        ctx.strokeStyle = ccol; ctx.lineWidth = 2; roundRect(px, py, 340, 46, 23); ctx.stroke();
        glow(ccol, 12, () => { ctx.fillStyle = ccol; SHAPES[csh](px + 28, py + 23, 12); });
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '17px Bungee, sans-serif';
        ctx.fillStyle = show ? ccol : '#fff'; ctx.fillText(show ? callText() : 'DROP!', px + 50, py + 21);
        if (show) { ctx.fillStyle = 'rgba(255,255,255,.15)'; roundRect(px + 50, py + 33, 270, 5, 2.5); ctx.fill(); ctx.fillStyle = pt < 0.6 ? '#FF557D' : ccol; roundRect(px + 50, py + 33, 270 * clamp(pt / ptMax, 0, 1), 5, 2.5); ctx.fill(); }
        ctx.font = '12px Bungee, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(`${beans.filter((b) => b.alive).length} DANCING`, 48, H - 92);
      });
    },
    winner(t, to) { return survivalWinner(beans, t, to, (b) => { const tl = tileAt(b.x, b.y); return tl ? -hyp(b.x - tileX(tl), b.y - tl.y) : -999; }); },
  };
})();
