// 02 · Bubblegum Boulevard — sprint up a candy boulevard. Gum lanes slow you (and land a jump in gum and
// you're STUCK), ice lanes slide, traffic lanes knock you back. Cars can be hopped; gum trucks cannot.
// Anti-exploit: holding forward gets hit by traffic; bunny-hopping lands you in gum and into trucks.
ARENAS.bubblegum = (() => {
  const LEN = 2900, L = 160, Rt = 800, STEP = 165;
  const CAR_COLS = ['#FFB547', '#8F75FF', '#2EC4B6', '#5ab0ff', '#7EE2B8'];
  let bands, beans, camY, bubbles;
  const bandAt = (y) => bands.find((bd) => Math.abs(y - bd.y) < bd.h / 2);
  return {
    cam() { return camY; },
    key: 'bubblegum', name: 'Bubblegum Boulevard', genre: 'Sprint', theme: 'candy', timeout: ROUND_SECONDS, maxSpeed: 230,
    objective: 'Race to the gate and hop the cars, but tall gum trucks must be dodged. Pink gum is sticky and blue ice is slick, so never land a jump on either.',
    init(bs) {
      beans = bs; bands = []; bubbles = []; let k = 0;
      for (let y = LEN - 290; y > 320; y -= STEP, k++) {
        const type = ['traffic', 'gum', 'traffic', 'ice'][k % 4];
        const band = { y, h: type === 'gum' ? 150 : 118, type, cars: [] };
        if (type === 'traffic') {
          const dir = Math.random() < 0.5 ? 1 : -1, sp = rnd(150, 220) * dir, truckI = (Math.random() * 4) | 0, off = Math.random();
          for (let i = 0; i < 4; i++) {
            const truck = i === truckI;
            band.cars.push({ x: L - 40 + ((i + off + Math.random() * 0.2) % 4) * (Rt - L + 80) / 4, v: sp * (truck ? 0.8 : rnd(1, 1.2)), w: truck ? rnd(150, 170) : rnd(84, 108), truck, c: truck ? '#FF557D' : CAR_COLS[(k + i) % CAR_COLS.length] });
          }
          // keep the lane's vehicles from overlapping (same direction; trucks are slower so give them space)
          band.cars.sort((a, b) => a.x - b.x);
        }
        if (type === 'gum') for (let i = 0; i < 4; i++) bubbles.push({ band, x: rnd(L + 40, Rt - 40), dy: rnd(-50, 50), ph: rnd(0, 3), sp: rnd(0.25, 0.45) });
        bands.push(band);
      }
      beans.forEach((b, i) => { b.x = L + 40 + (i + 0.5) * (Rt - L - 80) / beans.length; b.y = LEN - 90; b.fy = -1; b.fx = 0; b.wasAir = false; b.waitT = 0; });
      camY = LEN - 660;
    },
    mods(b) {
      if (b.z > 0.5) return null;
      const bd = bandAt(b.y);
      if (!bd || bd.type === 'traffic') return null;
      return bd.type === 'gum' ? { slow: 0.42 } : { slow: 1.15, traction: 0.16 };
    },
    update(dt, t) {
      for (const bd of bands) {
        for (const c of bd.cars) { c.x += c.v * dt; if (c.v > 0 && c.x - c.w / 2 > Rt + 20) c.x = L - 20 - c.w / 2; if (c.v < 0 && c.x + c.w / 2 < L - 20) c.x = Rt + 20 + c.w / 2; }
        // trucks are slower: cars behind them brake instead of driving through
        for (const c of bd.cars) if (!c.truck) for (const o of bd.cars) if (o.truck) { const gap = (o.x - c.x) * Math.sign(c.v); if (gap > 0 && gap < (o.w + c.w) / 2 + 14) c.x = o.x - Math.sign(c.v) * ((o.w + c.w) / 2 + 14); }
      }
      for (const bub of bubbles) { bub.ph += dt * bub.sp; if (bub.ph > 1) { if (bub.band.y > camY - 40 && bub.band.y < camY + 700) puff(bub.x, bub.band.y + bub.dy, 4, 'rgba(255,170,215,.8)', 60, 5, 0.35); bub.ph = 0; bub.x = rnd(L + 40, Rt - 40); bub.dy = rnd(-50, 50); } }
      for (const b of beans) {
        b.x = clamp(b.x, L + R, Rt - R); b.y = clamp(b.y, 60, LEN - 40);
        // gum is sticky: you can't jump out of it
        if (b.vz > 300) { const g = bandAt(b.y); if (g && g.type === 'gum' && b.z < 20) { b.vz = 0; b.z = 0; b.sq = 0.2; } }
        const air = b.z > 0.5;
        // sticky gum: landing a jump in gum glues you for a moment
        if (b.wasAir && !air) { const bd = bandAt(b.y); if (bd && bd.type === 'gum') { b.stun = Math.max(b.stun, 0.85); b.vx *= 0.2; b.vy *= 0.2; b.sq = 0.35; puff(b.x, b.y, 5, 'rgba(255,143,194,.9)', 50, 6, 0.4); if (b.human) { popText(b.x, b.y - 34, 'STUCK!', '#FF8FC2', 18); beep(220, 0.12, 'sine', 0.05); } } }
        // landing a jump on ice: you skid and lose your footing
        if (b.wasAir && !air) { const bd = bandAt(b.y); if (bd && bd.type === 'ice') { b.stun = Math.max(b.stun, 0.6); b.sq = 0.25; b.scaredT = 0.4; sparks(b.x, b.y, 5, ['#e8fbff', '#9fe8ff'], 120, 0.3); if (b.human) popText(b.x, b.y - 34, 'SLIP!', '#9fe8ff', 16); } }
        b.wasAir = air;
        if (b.hitCd > 0) continue;
        for (const bd of bands) {
          if (bd.type !== 'traffic' || Math.abs(b.y - bd.y) > 24 + R) continue;
          for (const c of bd.cars) {
            if (b.z > (c.truck ? 90 : 26)) continue;
            if (Math.abs(b.x - c.x) < c.w / 2 + R - 2) {
              b.ky = c.truck ? 560 : 500; b.kx = Math.sign(c.v) * 280; b.stun = c.truck ? 0.8 : 0.7; b.hitCd = 0.8; b.scaredT = 0.8;
              sparks(b.x, b.y - 14, 8, ['#fff', '#FFD95B', c.c], 200, 0.35);
              if (b.human) { beep(130, 0.12, 'sawtooth', 0.05); shake(c.truck ? 5 : 3); popText(b.x, b.y - 36, c.truck ? 'TRUCKED!' : 'BONK!', '#FF557D', 18); }
            }
          }
        }
      }
      camY = followCam(beans, camY, LEN, dt);
    },
    botInput(b, t) {
      // Read the next traffic lane: how long until a vehicle covers a given x? Slide to the widest gap, then cross.
      let tx = b.x, up = -1, jump = false;
      const bd = bands.find((x) => x.type === 'traffic' && x.y < b.y - 20 && b.y - x.y < 150);
      const clearAt = (lane, x, trucksOnly) => {
        let tmin = 9;
        for (const c of lane.cars) {
          if (trucksOnly && !c.truck) continue;
          const half = c.w / 2 + R + 10, dx = x - c.x;
          if (Math.abs(dx) < half) return 0;
          const ahead = dx * Math.sign(c.v);
          if (ahead > 0) tmin = Math.min(tmin, (ahead - half) / Math.abs(c.v));
        }
        return tmin;
      };
      if (bd) {
        const need = (b.y - bd.y + 50) / 220;
        if (clearAt(bd, b.x) < need * (1.4 - b.skill * 0.4) && b.waitT < 1.3 + (clearAt(bd, b.x, true) < need ? 1.5 : 0)) {
          b.waitT += 1 / 60;
          let best = b.x, bs = -1e9;
          for (let x = L + 30; x <= Rt - 30; x += 30) { const sc = Math.min(clearAt(bd, x), 2) - Math.abs(x - b.x) / 260; if (sc > bs) { bs = sc; best = x; } }
          tx = best; up = b.y - bd.y > 85 ? -0.35 : 0.15;
        } else if (b.y - bd.y < 60) b.waitT = 0; // committed: cross (and hop a car if needed)
      }
      const inLane = bands.find((x) => x.type === 'traffic' && Math.abs(b.y - x.y) < 42);
      if (inLane && inLane.cars.some((c) => !c.truck && Math.abs(c.x + c.v * 0.15 - b.x) < c.w / 2 + R + 4) && Math.random() < b.skill) jump = true;
      // never jump into gum
      const land = bandAt(b.y - 150);
      if (jump && land && land.type !== 'traffic' && Math.random() < b.skill) jump = false;
      const d = norm(clamp((tx - b.x) / 40, -1, 1), up);
      return { x: d.x, y: d.y, jump, dive: false };
    },
    draw(t) {
      const y0 = camY - 10, y1 = camY + 700;
      ctx.save(); ctx.beginPath(); ctx.rect(-400, camY - 5, W + 800, 1400); ctx.clip();
      // the boulevard: a raised candy slab with striped sides
      ctx.fillStyle = 'rgba(10,0,20,.4)'; ctx.fillRect(L - 30, y0, Rt - L + 60, y1 - y0);
      ctx.fillStyle = '#7a2d6a'; ctx.fillRect(L - 18, y0, Rt - L + 36, y1 - y0);
      ctx.fillStyle = mat('candy'); ctx.fillRect(L - 18, y0, 16, y1 - y0); ctx.fillRect(Rt + 2, y0, 16, y1 - y0);
      ctx.fillStyle = '#4f3a7c'; ctx.fillRect(L, y0, Rt - L, y1 - y0);
      ctx.fillStyle = mat('plastic'); ctx.globalAlpha = 0.35; ctx.fillRect(L, y0, Rt - L, y1 - y0); ctx.globalAlpha = 1;
      const sideG = ctx.createLinearGradient(L, 0, Rt, 0); sideG.addColorStop(0, 'rgba(255,190,230,.18)'); sideG.addColorStop(0.5, 'rgba(0,0,0,0)'); sideG.addColorStop(1, 'rgba(20,0,40,.25)');
      ctx.fillStyle = sideG; ctx.fillRect(L, y0, Rt - L, y1 - y0);
      for (const bd of bands) {
        if (bd.y < y0 - 100 || bd.y > y1 + 100) continue;
        const top = bd.y - bd.h / 2;
        if (bd.type === 'traffic') {
          ctx.fillStyle = mat('asphalt'); ctx.fillRect(L, top, Rt - L, bd.h);
          ctx.fillStyle = 'rgba(20,10,40,.35)'; ctx.fillRect(L, top, Rt - L, bd.h);
          ctx.fillStyle = '#f4f6ff'; ctx.fillRect(L, top, Rt - L, 3); ctx.fillRect(L, top + bd.h - 3, Rt - L, 3);
          const dir = Math.sign(bd.cars[0].v), off = ((t * 40 * dir) % 50 + 50) % 50;
          ctx.fillStyle = '#FFD95B'; for (let x = L - 50 + off; x < Rt; x += 50) if (x > L) ctx.fillRect(x, bd.y - 2, 26, 4);
          // direction chevrons painted on the lane edge
          ctx.fillStyle = 'rgba(255,255,255,.18)';
          for (let x = L + 40; x < Rt; x += 120) { ctx.beginPath(); ctx.moveTo(x + dir * 10, top + 14); ctx.lineTo(x - dir * 4, top + 8); ctx.lineTo(x - dir * 4, top + 20); ctx.closePath(); ctx.fill(); }
          for (const c of bd.cars) { // headlight pools ahead of each vehicle
            lightPool(c.x + Math.sign(c.v) * (c.w / 2 + 34), bd.y, 46, c.truck ? 'rgba(255,90,120,1)' : 'rgba(255,230,150,1)', 0.35);
            contactShadow(c.x, bd.y + 6, c.w * 0.62, 26, 0.45);
          }
        } else if (bd.type === 'gum') {
          ctx.fillStyle = '#3d1030'; ctx.fillRect(L, top + lift(5), Rt - L, bd.h);
          const gg = ctx.createLinearGradient(0, top, 0, top + bd.h); gg.addColorStop(0, '#ffb3d9'); gg.addColorStop(0.5, '#ff7ab8'); gg.addColorStop(1, '#e8559d');
          ctx.fillStyle = gg; ctx.fillRect(L, top, Rt - L, bd.h);
          ctx.fillStyle = 'rgba(255,255,255,.25)'; for (let x = L + 20; x < Rt; x += 64) { ctx.beginPath(); ctx.ellipse(x + Math.sin(x) * 10, bd.y + Math.cos(x) * 34, 16, 8, 0, 0, Math.PI * 2); ctx.fill(); }
          ctx.strokeStyle = 'rgba(160,30,90,.35)'; ctx.lineWidth = 2; for (let x = L + 50; x < Rt; x += 90) { ctx.beginPath(); ctx.moveTo(x, top + 6); ctx.bezierCurveTo(x + 20, top + 40, x - 20, top + 90, x + 6, top + bd.h - 6); ctx.stroke(); }
          ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(L, top, Rt - L, 3);
          bigLabel('GUM · NO LANDING', 480, bd.y, 'rgba(110,15,70,.55)', 18);
        } else {
          ctx.fillStyle = mat('ice'); ctx.fillRect(L, top, Rt - L, bd.h);
          ctx.fillStyle = 'rgba(190,240,255,.35)'; ctx.fillRect(L, top, Rt - L, bd.h);
          const sh = ((t * 120) % (Rt - L + 300)) - 150;
          const ig = ctx.createLinearGradient(L + sh - 60, 0, L + sh + 60, 0); ig.addColorStop(0, 'rgba(255,255,255,0)'); ig.addColorStop(0.5, 'rgba(255,255,255,.45)'); ig.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = ig; ctx.fillRect(L, top, Rt - L, bd.h);
          ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; for (let x = L + 30; x < Rt; x += 90) { ctx.beginPath(); ctx.moveTo(x, top + 20); ctx.lineTo(x + 40, top + 50); ctx.lineTo(x + 30, top + 80); ctx.stroke(); }
          bigLabel('ICE · SLIDE', 480, bd.y, 'rgba(20,70,110,.5)', 18);
        }
      }
      // start + finish slabs
      if (y1 > LEN - 200) { platformRect(L, LEN - 180, Rt - L, 150, mat('tile'), '#3a2560', 10, 10); bigLabel('START', 480, LEN - 105, 'rgba(255,255,255,.6)', 26); }
      if (y0 < 330) {
        platformRect(L, 40, Rt - L, 160, mat('candy'), '#7a2d6a', 10, 10);
        ctx.fillStyle = 'rgba(40,10,50,.35)'; ctx.fillRect(L, 40, Rt - L, 160);
        lightPool(480, 140, 300, 'rgba(126,226,184,1)', 0.35);
        for (let x = L; x < Rt; x += 20) for (let k = 0; k < 2; k++) { ctx.fillStyle = ((x / 20 + k) | 0) % 2 ? '#f4f6ff' : '#111322'; ctx.fillRect(x, 130 + k * 10, 20, 10); }
      }
      ctx.restore();
      // upright things: vehicles, gum bubbles, candy-cane posts, finish arch
      const ups = [];
      for (const bd of bands) {
        if (bd.y < camY + 70 || bd.y > y1 + 60) continue;
        for (const c of bd.cars) ups.push({ y: bd.y + 4, draw: () => { ctx.save(); ctx.beginPath(); ctx.rect(L - 2, camY - 5, Rt - L + 4, 1400); ctx.clip(); billboard(c.x, bd.y, 0, () => {
          const dir = Math.sign(c.v), h = c.truck ? 64 : 26, body = c.c;
          // wheels
          ctx.fillStyle = '#14152a'; for (const wx of c.truck ? [-0.38, -0.12, 0.3] : [-0.3, 0.3]) { ctx.beginPath(); ctx.ellipse(wx * c.w, 14, 10, 7, 0, 0, Math.PI * 2); ctx.fill(); }
          box(c.w, 44, h, shade(body, 1.18), body, { r: c.truck ? 8 : 12 });
          if (c.truck) {
            // cab + gum tank stripe
            ctx.fillStyle = shade(body, 0.7); roundRect(dir * c.w * 0.32 - 22, -h - 10, 44, h + 22, 8); ctx.fill();
            ctx.fillStyle = 'rgba(200,240,255,.75)'; roundRect(dir * c.w * 0.32 - 14 + dir * 4, -h - 2, 24, 16, 4); ctx.fill();
            ctx.fillStyle = '#ffe0f0'; roundRect(-c.w / 2 + 10 - (dir > 0 ? 0 : -44), -h + 18, c.w - 64, 18, 6); ctx.fill();
            ctx.fillStyle = '#c0306a'; ctx.font = '12px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('GUM CO', -dir * 22, -h + 27);
            glow('#ff3d5a', 10, () => { ctx.fillStyle = Math.sin(t * 10) > 0 ? '#ff3d5a' : '#ffb547'; ctx.beginPath(); ctx.arc(dir * c.w * 0.32, -h - 14, 4, 0, Math.PI * 2); ctx.fill(); });
          } else {
            ctx.fillStyle = 'rgba(200,240,255,.8)'; roundRect(dir * c.w * 0.1 - 18, -h - 14, 32, 14, 5); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(dir * c.w * 0.1 - 14, -h - 12, 6, 10);
          }
          glow('#FFE68F', 12, () => { ctx.fillStyle = '#FFF3C2'; ctx.beginPath(); ctx.arc(dir * (c.w / 2 - 5), -h * 0.45, 4.5, 0, Math.PI * 2); ctx.fill(); });
          ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.arc(-dir * (c.w / 2 - 5), -h * 0.45, 3.5, 0, Math.PI * 2); ctx.fill();
        }); ctx.restore(); } });
      }
      for (const bub of bubbles) {
        const by = bub.band.y + bub.dy;
        if (by < camY + 10 || by > y1) continue;
        const r = 4 + bub.ph * 18;
        ups.push({ y: by, draw: () => billboard(bub.x, by, 0, () => {
          ctx.fillStyle = 'rgba(255,143,194,.55)'; ctx.beginPath(); ctx.arc(0, -r * 0.8, r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 1.1, r * 0.4, Math.PI, Math.PI * 1.6); ctx.stroke();
        }) });
      }
      for (let y = Math.ceil((camY + 20) / 120) * 120; y < y1; y += 120) for (const x of [L - 10, Rt + 10]) {
        ups.push({ y, draw: () => billboard(x, y, 0, () => {
          ctx.fillStyle = '#f4f6ff'; roundRect(-3.5, -46, 7, 46, 3); ctx.fill();
          ctx.strokeStyle = '#ff3d5a'; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-3.5, -8 - k * 11); ctx.lineTo(3.5, -14 - k * 11); ctx.stroke(); }
          ctx.strokeStyle = '#f4f6ff'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x < 480 ? 7 : -7, -46, 7, Math.PI, 0, x > 480); ctx.stroke(); ctx.lineCap = 'butt';
          glow('#FF8FC2', 10, () => { ctx.fillStyle = '#ffe0f0'; ctx.beginPath(); ctx.arc(0, -50, 2.5, 0, Math.PI * 2); ctx.fill(); });
        }) });
      }
      if (camY < 300) ups.push({ y: 146, draw: () => billboard(480, 146, 0, () => {
        for (const s of [-1, 1]) { ctx.fillStyle = '#f4f6ff'; roundRect(s * 316 - 8, -110, 16, 110, 5); ctx.fill(); ctx.strokeStyle = '#ff3d5a'; ctx.lineWidth = 4; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(s * 316 - 8, -10 - k * 13); ctx.lineTo(s * 316 + 8, -18 - k * 13); ctx.stroke(); } }
        glow('#7EE2B8', 18, () => { ctx.fillStyle = '#123a33'; roundRect(-320, -134, 640, 30, 10); ctx.fill(); });
        ctx.fillStyle = '#7EE2B8'; ctx.font = '20px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★ FINISH GATE ★', 0, -118);
      }) });
      drawAll(beans, ups);
      progressStrip(beans, LEN, 140);
    },
    winner(t, to) { const d = beans.filter((b) => b.y < 140).sort((a, b) => a.y - b.y); if (d.length) return d[0]; return to ? [...beans].sort((a, b) => a.y - b.y)[0] : null; },
  };
})();
