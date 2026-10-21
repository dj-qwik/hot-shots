// 27 · Bumper Bash — shove rivals out of a shrinking padded ring. Dives are the shove. Three pop bumpers
// orbit the middle, and the THUMPER pad in the very centre charges up (amber ring) and then blasts
// everyone on it outward — so camping the middle gets you launched. Timeout tie-break: most shoves landed.
ARENAS.bumper = (() => {
  const C = { x: 480, y: 300 }, THUMP_R = 112, PAD_R = 58, O = ovalKit(C, 1.35), R0 = 268, RMIN = 110;
  let ringR, beans, posts, thump, waves;
  return {
    key: 'bumper', name: 'Bumper Bash', genre: 'Survival', theme: 'candy', timeout: ROUND_SECONDS, maxSpeed: 200, tackle: 430,
    objective: 'Dive into rivals to shove them out of the ring. The centre pad charges up, then blasts everyone on it. Last one inside wins.',
    init(bs) {
      beans = bs; ringR = R0; waves = [];
      const p0 = rnd(0, Math.PI * 2);
      posts = [0, 1, 2].map((i) => { const a = p0 + (i * Math.PI * 2) / 3; return { a, flash: 0, ...O.pt(a, 112) }; });
      thump = { next: rnd(3, 4), charge: 0, cool: 0 };
      placeRing(beans, C.x, C.y, 180 * O.SX, 180, rnd(0, Math.PI * 2));
      beans.forEach((b) => { b.diveCd = 2.5; b.shoves = 0; });
    },
    onTackle(vic, att) { att.shoves = (att.shoves || 0) + 1; vic.scaredT = 0.6; },
    update(dt, t) {
      ringR = clamp(R0 - Math.max(0, t - 3) * 8.2 * (1 + Math.max(0, beans.length - 4) * 0.1), RMIN, R0);
      for (const p of posts) { p.a += 0.6 * dt; const q = O.pt(p.a, 112); p.x = q.x; p.y = q.y; p.flash = Math.max(0, p.flash - dt); }
      // thumper cycle: idle → charge (1.1 s, telegraphed) → blast
      if (thump.charge > 0) {
        thump.charge -= dt;
        if (thump.charge <= 0) {
          thump.next = t + rnd(2.6, 3.8);
          waves.push({ r: PAD_R, t: 0.45 }); ring(C.x, C.y, '#FFD95B', 20, THUMP_R + 40, 0.35, 8); sparks(C.x, C.y - 10, 20, ['#FFD95B', '#fff', '#FF8FC2'], 320, 0.5);
          let hitHuman = false;
          for (const b of beans) {
            if (!b.alive || b.z > 20) continue;
            const d = O.d(b.x, b.y);
            if (d < THUMP_R) { const n = d > 1 ? norm(b.x - C.x, b.y - C.y) : norm(rnd(-1, 1), rnd(-1, 1)); const f = 420 + 820 * (1 - d / THUMP_R); b.kx += n.x * f * (Math.abs(n.x) > 0.5 ? 1.15 : 1); b.ky += n.y * f; b.stun = 0.45; b.scaredT = 0.8; if (b.human) hitHuman = true; }
          }
          shake(hitHuman ? 8 : 3); hype(0.25);
        }
      } else if (t > thump.next) thump.charge = 1.1;
      for (const w of waves) { w.t -= dt; w.r += 520 * dt; } waves = waves.filter((w) => w.t > 0);
      for (const b of beans) {
        if (!b.alive) continue;
        for (const p of posts) { const d = hyp(b.x - p.x, b.y - p.y); if (d < 26 + R) { const n = norm(b.x - p.x, b.y - p.y); b.x = p.x + n.x * (26 + R); b.y = p.y + n.y * (26 + R); b.kx += n.x * 300; b.ky += n.y * 300; p.flash = 0.2; sparks(p.x + n.x * 26, p.y + n.y * 26 - 16, 6, ['#FFD95B', '#fff'], 180, 0.3); if (b.human) beep(500, 0.05, 'square', 0.04); } }
        if (b.z <= 0.5 && O.d(b.x, b.y) > ringR) kill(b, t);
      }
    },
    botInput(b, t) {
      const myR = O.d(b.x, b.y);
      // get off the thumper while it charges (better bots react sooner)
      if (thump.charge > 0 && myR < THUMP_R + 20 && thump.charge < 0.5 + b.skill * 0.6) { const d = norm(b.x - C.x || 1, b.y - C.y); return { x: d.x, y: d.y, jump: false, dive: false }; }
      let target = null, bd = 1e9;
      for (const o of beans) if (o !== b && o.alive) { const d = hyp(o.x - b.x, o.y - b.y); if (d < bd) { bd = d; target = o; } }
      if (!target) return { x: 0, y: 0, jump: false, dive: false };
      const tR = O.d(target.x, target.y);
      if (myR > ringR * 0.62) { const d = seek(b, C.x, C.y); return { x: d.x, y: d.y, jump: false, dive: false }; }
      if (bd < 90 && b.diveCd <= 0 && t > 3 && tR > myR - 20 && Math.random() < 0.02 + b.skill * 0.03) { const d = seek(b, target.x, target.y); return { x: d.x, y: d.y, jump: false, dive: true }; }
      // get between the target and the centre, then push outward — but never park on the pad
      const n = norm(target.x - C.x, target.y - C.y);
      let px = target.x - n.x * 50, py = target.y - n.y * 50;
      const pr = O.d(px, py); if (pr < PAD_R + 20) { const m = pr > 1 ? norm(px - C.x, py - C.y) : n; px = C.x + m.x * (PAD_R + 24) * O.SX; py = C.y + m.y * (PAD_R + 24); }
      const d = seek(b, px, py);
      return { x: d.x, y: d.y, jump: Math.random() < 0.004, dive: false };
    },
    draw(t) {
      // ── padded ring: pink cushion rail around a rubber mat (drawn as a circle, stretched into the oval stage)
      const ch = thump.charge > 0 ? 1 - thump.charge / 1.1 : 0;
      O.stretch(() => {
      platformCircle(C.x, C.y, ringR + 18, '#ff6f98', '#a8355a', 24);
      const rail = ctx.createRadialGradient(C.x, C.y, ringR, C.x, C.y, ringR + 18);
      rail.addColorStop(0, '#c9476f'); rail.addColorStop(0.5, '#ff8fb0'); rail.addColorStop(1, '#e05583');
      ctx.fillStyle = rail; ctx.beginPath(); ctx.arc(C.x, C.y, ringR + 18, 0, Math.PI * 2); ctx.arc(C.x, C.y, ringR, 0, Math.PI * 2, true); ctx.fill();
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; ctx.strokeStyle = 'rgba(120,20,60,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(C.x + Math.cos(a) * ringR, C.y + Math.sin(a) * ringR); ctx.lineTo(C.x + Math.cos(a) * (ringR + 18), C.y + Math.sin(a) * (ringR + 18)); ctx.stroke(); }
      ctx.fillStyle = mat('rubber'); ctx.beginPath(); ctx.arc(C.x, C.y, ringR, 0, Math.PI * 2); ctx.fill();
      const mg = ctx.createRadialGradient(C.x, C.y, 40, C.x, C.y, ringR); mg.addColorStop(0, 'rgba(255,255,255,.08)'); mg.addColorStop(1, 'rgba(10,6,30,.4)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(C.x, C.y, ringR, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 14; for (let r = PAD_R + 30; r < ringR; r += 44) { ctx.beginPath(); ctx.arc(C.x, C.y, r, 0, Math.PI * 2); ctx.stroke(); }
      // ── thumper pad: idle (dim) → charging (amber fill + spinning ticks) → blast waves
      ctx.fillStyle = '#20264f'; ctx.beginPath(); ctx.arc(C.x, C.y, PAD_R + 6, 0, Math.PI * 2); ctx.fill();
      const pg = ctx.createRadialGradient(C.x, C.y, 4, C.x, C.y, PAD_R);
      pg.addColorStop(0, ch ? `rgba(255,${230 - ch * 110},${120 - ch * 100},1)` : '#5966b8'); pg.addColorStop(1, ch ? '#b8561e' : '#2b3470');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(C.x, C.y, PAD_R, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + t * (ch ? 6 : 0.5); ctx.strokeStyle = ch ? 'rgba(255,240,200,.85)' : 'rgba(255,255,255,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(C.x + Math.cos(a) * (PAD_R - 14), C.y + Math.sin(a) * (PAD_R - 14)); ctx.lineTo(C.x + Math.cos(a) * (PAD_R - 4), C.y + Math.sin(a) * (PAD_R - 4)); ctx.stroke(); }
      if (ch) {
        lightPool(C.x, C.y, THUMP_R + 30, '#ffb347', 0.25 + ch * 0.4);
        ctx.strokeStyle = Math.sin(t * 30) > 0 ? '#FFD95B' : '#ff6a3d'; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -t * 60;
        ctx.beginPath(); ctx.arc(C.x, C.y, THUMP_R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
        ctx.fillStyle = `rgba(255,181,71,${0.12 + ch * 0.18})`; ctx.beginPath(); ctx.arc(C.x, C.y, THUMP_R * ch, 0, Math.PI * 2); ctx.fill();
      } else { ctx.strokeStyle = 'rgba(255,217,91,.25)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(C.x, C.y, THUMP_R, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      for (const w of waves) { ctx.strokeStyle = `rgba(255,217,91,${w.t * 2})`; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(C.x, C.y, w.r, 0, Math.PI * 2); ctx.stroke(); }
      });
      bigLabel(ch ? 'GET OFF!' : 'THUMPER', C.x, C.y, ch ? '#2a0e00' : 'rgba(255,255,255,.45)', ch ? 16 : 12);
      // ── pop bumpers (upright, flash when hit)
      for (const p of posts) sprite(p.y, () => {
        contactShadow(p.x + 4, p.y + 6, 34, 24, 0.4);
        billboard(p.x, p.y, 0, () => {
          const rx = 26, ry = 26 * TILT, h = 22, f = p.flash > 0;
          ctx.fillStyle = '#7a1f3f'; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI); ctx.lineTo(-rx, -h); ctx.ellipse(0, -h, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
          const sg = ctx.createLinearGradient(-rx, 0, rx, 0); sg.addColorStop(0, '#c23a66'); sg.addColorStop(0.4, '#ff7aa2'); sg.addColorStop(1, '#8c2148');
          ctx.fillStyle = sg; ctx.fillRect(-rx, -h * 0.75, rx * 2, h * 0.5);
          ctx.fillStyle = f ? '#fff' : '#FFD95B'; ctx.beginPath(); ctx.ellipse(0, -h, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#a57e00'; ctx.lineWidth = 2; ctx.stroke();
          glow('#FF557D', f ? 20 : 8, () => { ctx.fillStyle = f ? '#fff' : '#FF557D'; ctx.beginPath(); ctx.ellipse(0, -h - 3, rx * 0.42, ry * 0.42, 0, 0, Math.PI * 2); ctx.fill(); });
          ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-rx * 0.35, -h - ry * 0.35, rx * 0.18, ry * 0.15, 0, 0, Math.PI * 2); ctx.fill();
        });
      });
      drawAll(beans);
      tally(beans, (b) => b.alive ? `${b.shoves} shove${b.shoves === 1 ? '' : 's'}` : 'OUT');
    },
    winner(t, to) { return survivalWinner(beans, t, to, (b) => (b.shoves || 0) * 1000 - O.d(b.x, b.y)); },
  };
})();
