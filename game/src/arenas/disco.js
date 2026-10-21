// 30 · Disco Disaster — a colour + shape is called (big panel + hologram); every other tile drops into
// the void. Calls get faster and safe tiles fewer. Anyone not on a matching tile when it drops is out.
// Readability: called tiles pulse brighter, the rest dim and flicker in the last 0.6 s; the caller shows
// the shape, its name and a countdown bar. No safe spots: the grid reshuffles every call.
ARENAS.disco = (() => {
  const COLS = 8, ROWS = 5, TW = 100, TH = 90, OX = 80, OY = 70, THICK = 9;
  const NAMES = ['PINK CIRCLE', 'BLUE TRIANGLE', 'YELLOW SQUARE', 'GREEN STAR'];
  let tiles, beans, phase, pt, ptMax, call, cycle;
  function shuffle() {
    const safeCount = Math.max(3, 10 - cycle * 1.4);
    call = (Math.random() * 4) | 0;
    const idx = shuffleWith(RNG, [...tiles.keys()]);
    tiles.forEach((tl) => { tl.c = (call + 1 + ((Math.random() * 3) | 0)) % 4; tl.rise = 0.25; });
    for (let k = 0; k < safeCount; k++) tiles[idx[k]].c = call;
  }
  const tileAt = (x, y) => { const c = Math.floor((x - OX) / TW), r = Math.floor((y - OY) / TH); return c >= 0 && c < COLS && r >= 0 && r < ROWS ? tiles[r * COLS + c] : null; };
  return {
    key: 'disco', name: 'Disco Disaster', genre: 'Survival', theme: 'neon', timeout: ROUND_SECONDS, maxSpeed: 215,
    objective: 'A colour and shape is called. Get on a matching tile before the others drop. Calls get faster.',
    init(bs) {
      beans = bs; cycle = 0; tiles = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) tiles.push({ x: OX + c * TW + TW / 2, y: OY + r * TH + TH / 2, c: 0, rise: 0 });
      shuffle(); phase = 'show'; pt = ptMax = 2.4;
      placeRing(beans, 480, 295, 200, 120, rnd(0, 6.3));
      beans.forEach((b) => { b.zoff = 0; });
    },
    update(dt, t) {
      pt -= dt;
      for (const tl of tiles) tl.rise = Math.max(0, tl.rise - dt);
      if (pt <= 0) {
        if (phase === 'show') {
          phase = 'drop'; pt = ptMax = 1.0;
          for (const b of beans) { if (!b.alive || b.z > 0.5) continue; const tl = tileAt(b.x, b.y); if (!tl || tl.c !== call) kill(b, t); }
          if (beans.some((b) => b.human)) beep(120, 0.2, 'square', 0.04);
          hype(0.1);
        } else {
          cycle++; shuffle(); phase = 'show'; pt = ptMax = Math.max(1.05, 2.4 - cycle * 0.27);
          if (cycle === 3) announce('FASTER!', '#E85BD9'); else if (cycle === 6) announce('FASTER!!', '#FF557D');
        }
      }
      for (const b of beans) {
        if (!b.alive) continue;
        b.x = clamp(b.x, OX + R, OX + COLS * TW - R); b.y = clamp(b.y, OY + R, OY + ROWS * TH - R);
        if (phase === 'show' && pt < 0.6) { const tl = tileAt(b.x, b.y); if (!tl || tl.c !== call) b.scaredT = 0.2; }
        if (phase === 'drop' && b.z <= 0.5) { const tl = tileAt(b.x, b.y); if (!tl || tl.c !== call) kill(b, t); }
      }
    },
    botInput(b, t) {
      if (phase === 'show') {
        if (b.seen !== cycle) { b.seen = cycle; b.react = rnd(0.12, 0.45) / (0.5 + b.skill); b.wrong = Math.random() < (1 - b.skill) * 0.22; }
        b.react -= 1 / 60;
        if (b.react > 0) return { x: 0, y: 0, jump: false, dive: false };
        const want = b.wrong ? (call + 1) % 4 : call;
        let best = null, bd = 1e9;
        for (const tl of tiles) if (tl.c === want) { const crowd = beans.filter((o) => o !== b && o.alive && hyp(o.x - tl.x, o.y - tl.y) < 30).length; const d = hyp(tl.x - b.x, tl.y - b.y) + crowd * 40; if (d < bd) { bd = d; best = tl; } }
        if (best) { const dist = hyp(best.x - b.x, best.y - b.y); const d = seek(b, best.x, best.y); const s = clamp(dist / 30, 0, 1); const far = dist > 220 && pt < 0.6; return { x: d.x * s, y: d.y * s, jump: false, dive: far && Math.random() < 0.05 }; }
      }
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
      for (const tl of tiles) {
        const [col, sh] = PALETTE4[tl.c];
        const match = tl.c === call;
        let z = 0, alpha = 1;
        if (phase === 'drop' && !match) { const k = 1 - pt / ptMax; z = -k * k * 220; alpha = 1 - k; }
        if (tl.rise > 0) { z = -tl.rise / 0.25 * 60; alpha = 1 - tl.rise / 0.25 * 0.7; }
        if (alpha <= 0.02) continue;
        const x = tl.x - TW / 2 + 3, y = tl.y - TH / 2 + 3 - lift(z), w = TW - 6, h = TH - 6;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = shade(col, 0.35); roundRect(x, y + lift(THICK) * 0.6, w, h, 9); ctx.fill();
        ctx.fillRect(x, y + h * 0.5, w, h * 0.5 + lift(THICK) * 0.6);
        let bright = 0.62;
        if (phase === 'show') bright = match ? 0.82 + 0.18 * Math.sin(t * 12) : late ? (Math.sin(t * 40) > 0 ? 0.32 : 0.48) : 0.55;
        const g = ctx.createRadialGradient(tl.x, y + h * 0.45, 6, tl.x, y + h * 0.5, w * 0.7);
        g.addColorStop(0, shade(col, Math.min(1.5, bright + 0.55))); g.addColorStop(0.6, shade(col, bright)); g.addColorStop(1, shade(col, bright * 0.6));
        ctx.fillStyle = g; roundRect(x, y, w, h, 9); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.14)'; roundRect(x + 5, y + 4, w - 10, h * 0.28, 6); ctx.fill();
        ctx.strokeStyle = match && phase === 'show' ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.35)'; ctx.lineWidth = match && phase === 'show' ? 3 : 1.5; roundRect(x + 1, y + 1, w - 2, h - 2, 8); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${match && phase === 'show' ? 0.9 : 0.4})`; SHAPES[sh](tl.x, y + h / 2, 15);
        ctx.globalAlpha = 1;
        if (match && phase === 'show') lightPool(tl.x, tl.y, 70, col, 0.18);
      }
      // sweeping coloured spots
      for (let k = 0; k < 3; k++) lightPool(480 + Math.sin(t * (0.7 + k * 0.3) + k * 2) * 330, OY + fh / 2 + Math.cos(t * (0.9 + k * 0.2) + k) * 160, 120, PALETTE4[(k + call) % 4][0], 0.13);
      const [ccol, csh] = PALETTE4[call];
      drawAll(beans);
      // caller panel (screen space): shape, name, countdown
      inScreen(() => {
        const px = W / 2 - 150, py = 122, show = phase === 'show';
        ctx.fillStyle = 'rgba(10,6,28,.88)'; roundRect(px, py, 300, 46, 23); ctx.fill();
        ctx.strokeStyle = ccol; ctx.lineWidth = 2; roundRect(px, py, 300, 46, 23); ctx.stroke();
        glow(ccol, 12, () => { ctx.fillStyle = ccol; SHAPES[csh](px + 28, py + 23, 12); });
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '17px Bungee, sans-serif';
        ctx.fillStyle = show ? ccol : '#fff'; ctx.fillText(show ? NAMES[call] : 'DROP!', px + 50, py + 21);
        if (show) { ctx.fillStyle = 'rgba(255,255,255,.15)'; roundRect(px + 50, py + 33, 230, 5, 2.5); ctx.fill(); ctx.fillStyle = pt < 0.6 ? '#FF557D' : ccol; roundRect(px + 50, py + 33, 230 * clamp(pt / ptMax, 0, 1), 5, 2.5); ctx.fill(); }
        ctx.font = '12px Bungee, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(`${beans.filter((b) => b.alive).length} DANCING`, 48, H - 92);
      });
    },
    winner(t, to) { return survivalWinner(beans, t, to, (b) => { const tl = tileAt(b.x, b.y); return tl ? -hyp(b.x - tl.x, b.y - tl.y) : -999; }); },
  };
})();
