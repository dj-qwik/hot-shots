// 11 · Crown Conveyor — collection on a factory floor. Crowns drop from overhead chutes onto two
// conveyor belts (shadow telegraph shows where) and ride along them. Grab one, carry it (slower) to the
// vault in the middle and bank it. First to bank 3. A dive tackle knocks a carried crown flying ~80 px.
// Anti-exploit: drop points are random along the belts (no spawn-point camping); a fumbled crown lands
// well away from the carrier, so tackling is a real play, but a missed dive costs the get-up time.
// The vault has four doors and only two (side by side) are open at a time, rotating every 3 s: carriers
// must route to an open door. Golden crowns (rarer, gold drop ring) bank 2. TWIST at 15 s: the belts
// reverse and speed up.
ARENAS.crown = (() => {
  const V = { x: 480, y: 300, r: 58 }, BELTS = [{ y: 112, h: 74, v: 165 }, { y: 488, h: 74, v: -165 }];
  const X1 = 20, X2 = 940, Y1 = 22, Y2 = 578, TARGET = 3, DOOR_T = 3, DOOR_WARN = 0.8;
  let crowns, beans, spawn, flashes, mp, beltMul, twisted, clock, spawnN;
  // doors: 0 = east, 1 = south, 2 = west, 3 = north (canvas angles). Two neighbours are open at a time.
  const doorK = (ahead = 0) => Math.floor((clock + ahead) / DOOR_T);
  const doorOpen = (d, ahead = 0) => { const k = doorK(ahead) % 4; return d === k || d === (k + 1) % 4; };
  const doorOf = (x, y) => { const a = Math.atan2(y - V.y, x - V.x); return ((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4; };
  const doorPt = (d, r) => ({ x: V.x + Math.cos(d * Math.PI / 2) * r, y: V.y + Math.sin(d * Math.PI / 2) * r });
  const onBelt = (y) => BELTS.findIndex((bt) => Math.abs(y - bt.y) < bt.h / 2);
  return {
    key: 'crown', name: 'Crown Conveyor', genre: 'Collection', theme: 'sunset', timeout: ROUND_SECONDS, maxSpeed: 210,
    objective: 'Carry crowns from the belts to the vault through an OPEN door (green). Gold crowns count 2. Dive at carriers to knock crowns loose. First to 3.',
    power: {
      kinds: ['zoom', 'shove', 'bubble'], every: [4, 6],
      spot() { for (let k = 0; k < 8; k++) { const x = rnd(80, 880), y = rnd(170, 430); if (hyp(x - V.x, y - V.y) > V.r + 60) return { x, y }; } return null; },
    },
    init(bs) {
      beans = bs; crowns = []; spawn = 0; flashes = []; mp = new Set(); beltMul = 1; twisted = false; clock = rnd(0, DOOR_T * 4); spawnN = 0;
      const n = beans.length, a0 = rnd(0, 6.3);
      beans.forEach((b, i) => { const a = a0 + (i / n) * Math.PI * 2; b.x = 480 + Math.cos(a) * 160; b.y = 300 + Math.sin(a) * 110; b.bank = 0; b.carry = null; b.zoff = 0; });
      for (let k = 0; k < 3; k++) crowns.push({ x: 150 + k * 220 + rnd(-40, 40), y: BELTS[k % 2].y + rnd(-14, 14), belt: k % 2, held: null, z: 0, vz: 0, fall: 0, ph: rnd(0, 6) });
    },
    drop(b) { this.onTackle(b, null); },
    onTackle(vic, att) {
      const c = vic.carry; if (!c || typeof c !== 'object') return;
      const d = att ? norm(vic.x - att.x, vic.y - att.y) : norm(rnd(-1, 1), rnd(-1, 1));
      c.held = null; c.belt = null; c.x = clamp(vic.x + d.x * rnd(70, 95), X1 + 20, X2 - 20); c.y = clamp(vic.y + d.y * rnd(70, 95), Y1 + 20, Y2 - 20);
      c.z = 30; c.vz = 260; c.fall = 0; vic.carry = null;
      sparks(vic.x, vic.y - 20, 10, ['#FFD95B', '#fff'], 220, 0.4); popText(vic.x, vic.y - 46, 'FUMBLE!', '#FFD95B', 16);
    },
    update(dt, t) {
      clock += dt;
      if (!twisted && t >= 15) { twisted = true; beltMul = -1.5; announce('TWIST: BELTS REVERSE!', '#FFB547'); }
      if ((spawn -= dt) <= 0 && crowns.length < 5) {
        spawn = 1.7; const k = Math.random() < 0.5 ? 0 : 1, bt = BELTS[k];
        const gold = ++spawnN % 4 === 0 || Math.random() < 0.08;
        crowns.push({ x: rnd(120, 840), y: bt.y + rnd(-18, 18), belt: k, held: null, z: 240, vz: 0, fall: gold ? 1.1 : 0.7, fall0: gold ? 1.1 : 0.7, gold, ph: rnd(0, 6) });
      }
      for (const c of crowns) {
        if (c.held) continue;
        if (c.fall > 0) { c.fall -= dt; c.z = Math.max(0, 240 * (c.fall / (c.fall0 || 0.7))); if (c.fall <= 0) { c.z = 0; puff(c.x, c.y, 5, 'rgba(255,230,160,.7)', 60, 5, 0.35); } continue; }
        if (c.z > 0 || c.vz > 0) { c.vz -= 900 * dt; c.z = Math.max(0, c.z + c.vz * dt); if (c.z === 0) { c.vz = 0; c.belt = onBelt(c.y) >= 0 ? onBelt(c.y) : null; } }
        if (c.belt !== null && c.z === 0) c.x += BELTS[c.belt].v * beltMul * dt;
      }
      crowns = crowns.filter((c) => c.held || (c.x > X1 - 30 && c.x < X2 + 30));
      for (const b of beans) {
        b.x = clamp(b.x, X1, X2); b.y = clamp(b.y, Y1, Y2);
        if (b.z <= 0.5) { const k = onBelt(b.y); if (k >= 0) b.x += BELTS[k].v * beltMul * dt; }
        // vault wall: you can only get in through an open door
        const dv = hyp(b.x - V.x, b.y - V.y);
        if (!b.inV && dv < V.r + R && dv > 0.01 && !doorOpen(doorOf(b.x, b.y))) { const n = norm(b.x - V.x, b.y - V.y); b.x = V.x + n.x * (V.r + R); b.y = V.y + n.y * (V.r + R); }
        b.inV = hyp(b.x - V.x, b.y - V.y) < V.r - 4;
        if (!b.carry && b.proneT <= 0) {
          for (const c of crowns) if (!c.held && c.fall <= 0 && c.z < 12 && hyp(c.x - b.x, c.y - b.y) < 24 && b.z < 16) { c.held = b; b.carry = c; if (b.human) beep(760, 0.06, 'sine', 0.05); break; }
        }
        if (b.carry && hyp(b.x - V.x, b.y - V.y) < V.r) {
          const gold = b.carry.gold; crowns = crowns.filter((c) => c !== b.carry); b.carry = null; b.bank += gold ? 2 : 1; flashes.push({ t: 0.6, c: b.color });
          if (gold && b.human) popText(V.x, V.y - 60, '+2 GOLD!', '#FFD95B', 20);
          sparks(V.x, V.y - 20, 16, ['#FFD95B', '#fff', b.color], 260, 0.6); ring(V.x, V.y, '#FFD95B', V.r * 0.6, V.r * 1.8, 0.5, 6);
          if (b.human) { beep(880, 0.08, 'square', 0.05); setTimeout(() => beep(1175, 0.1, 'square', 0.05), 80); }
          if (b.bank >= TARGET - 2 && b.bank < TARGET && !mp.has(b)) { mp.add(b); announce(b.human ? 'ALMOST THERE!' : `${(b.name || 'SOMEONE').toUpperCase()} IS CLOSE!`, b.color); }
        }
      }
      for (const f of flashes) f.t -= dt; flashes = flashes.filter((f) => f.t > 0);
    },
    botInput(b, t) {
      let tgt, dive = false;
      if (b.carry) {
        // route to a door that will still be open when we get there (weaker bots sometimes just bee-line)
        const here = doorOf(b.x, b.y), dv = hyp(b.x - V.x, b.y - V.y);
        if (doorOpen(here) && dv < V.r + 45) tgt = V;
        else if (Math.random() > 0.3 + b.skill * 0.7) tgt = V;
        else {
          let best = null, bd = 1e9;
          for (let d = 0; d < 4; d++) { const p = doorPt(d, V.r + 30), eta = hyp(p.x - b.x, p.y - b.y) / 160; if (!doorOpen(d, eta) || !doorOpen(d, eta + 0.5)) continue; const q = hyp(p.x - b.x, p.y - b.y); if (q < bd) { bd = q; best = p; } }
          tgt = best || doorPt((doorK() + 1) % 4, V.r + 50);
        }
      } else {
        let best = null, bd = 1e9;
        for (const c of crowns) { if (c.held || c.fall > 0.35) continue; const px = c.belt !== null ? c.x + BELTS[c.belt].v * beltMul * 0.4 : c.x; const d = hyp(px - b.x, c.y - b.y) / (c.gold ? 1 + b.skill : 1); if (d < bd) { bd = d; best = { x: px, y: c.y }; } }
        for (const o of beans) if (o !== b && o.carry) { const d = hyp(o.x - b.x, o.y - b.y); if (d < bd * 0.8) { bd = d; best = o; } if (d < 80 && b.diveCd <= 0 && Math.random() < b.skill * 0.14) dive = true; }
        tgt = best || V;
      }
      const d = norm(tgt.x - b.x + Math.sin(t * 2 + b.i) * 10, tgt.y - b.y);
      return { x: d.x, y: d.y, jump: Math.random() < 0.003, dive };
    },
    draw(t) {
      // factory floor slab
      platformRect(X1 - 10, Y1 - 10, X2 - X1 + 20, Y2 - Y1 + 20, mat('metal'), '#2c2a44', 16, 14);
      ctx.fillStyle = 'rgba(30,20,40,.35)'; roundRect(X1 - 10, Y1 - 10, X2 - X1 + 20, Y2 - Y1 + 20, 14); ctx.fill();
      grain(X1 - 10, Y1 - 10, X2 - X1 + 20, Y2 - Y1 + 20, 0.06);
      // safety lines around the vault
      ctx.strokeStyle = 'rgba(255,217,91,.35)'; ctx.lineWidth = 3; ctx.setLineDash([16, 10]); ctx.beginPath(); ctx.arc(V.x, V.y, V.r + 34, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      // conveyor belts: rails, moving slats, rollers, chevrons
      for (const bt of BELTS) {
        const top = bt.y - bt.h / 2;
        ctx.fillStyle = '#16141f'; ctx.fillRect(X1 - 10, top + lift(10), X2 - X1 + 20, bt.h);
        ctx.save(); ctx.beginPath(); ctx.rect(X1 - 10, top, X2 - X1 + 20, bt.h); ctx.clip();
        ctx.fillStyle = '#2b2a3a'; ctx.fillRect(X1 - 10, top, X2 - X1 + 20, bt.h);
        const bv = bt.v * beltMul, off = ((clock * bv) % 26 + 26) % 26;
        for (let x = X1 - 36 + off; x < X2 + 20; x += 26) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x, top, 3, bt.h); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x + 3, top, 2, bt.h); }
        const cof = ((clock * bv * 0.5) % 90 + 90) % 90, dir = Math.sign(bv);
        glow('#FFB547', 8, () => { ctx.strokeStyle = 'rgba(255,181,71,.55)'; ctx.lineWidth = 4; for (let x = X1 - 90 + cof; x < X2 + 90; x += 90) { ctx.beginPath(); ctx.moveTo(x - 7 * dir, bt.y - 12); ctx.lineTo(x + 7 * dir, bt.y); ctx.lineTo(x - 7 * dir, bt.y + 12); ctx.stroke(); } });
        const sh = ctx.createLinearGradient(0, top, 0, top + bt.h); sh.addColorStop(0, 'rgba(255,255,255,.1)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.25)');
        ctx.fillStyle = sh; ctx.fillRect(X1 - 10, top, X2 - X1 + 20, bt.h);
        ctx.restore();
        // hazard-striped rails
        for (const ry of [top - 7, top + bt.h]) {
          ctx.save(); ctx.beginPath(); ctx.rect(X1 - 10, ry, X2 - X1 + 20, 7); ctx.clip();
          ctx.fillStyle = '#FFD95B'; ctx.fillRect(X1 - 10, ry, X2 - X1 + 20, 7);
          ctx.fillStyle = '#1b1a26'; for (let x = X1 - 20; x < X2 + 20; x += 18) { ctx.beginPath(); ctx.moveTo(x, ry + 7); ctx.lineTo(x + 9, ry); ctx.lineTo(x + 15, ry); ctx.lineTo(x + 6, ry + 7); ctx.fill(); }
          ctx.restore();
        }
        for (const ex of [X1 - 10, X2 + 10]) { ctx.fillStyle = '#4b4a62'; ctx.beginPath(); ctx.ellipse(ex, bt.y, 9, bt.h / 2 + 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7d7c98'; ctx.beginPath(); ctx.ellipse(ex, bt.y, 4, bt.h / 2 - 4, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      // vault: raised golden pad with a spinning light ring and a hologram crown
      platformCircle(V.x, V.y, V.r, mat('metal'), '#3a3010', 14);
      const vg = ctx.createRadialGradient(V.x, V.y, 4, V.x, V.y, V.r); vg.addColorStop(0, 'rgba(255,217,91,.45)'); vg.addColorStop(1, 'rgba(255,170,60,.12)');
      ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(V.x, V.y, V.r, 0, Math.PI * 2); ctx.fill();
      glow('#FFD95B', 12, () => { ctx.strokeStyle = '#FFD95B'; ctx.lineWidth = 4; ctx.setLineDash([14, 9]); ctx.lineDashOffset = -t * 40; ctx.beginPath(); ctx.arc(V.x, V.y, V.r - 5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0; });
      bigLabel('VAULT', V.x, V.y + 26, 'rgba(255,240,200,.9)', 14);
      // doors: open = green glowing gap, closed = red shutter; a door about to close flashes amber
      for (let d = 0; d < 4; d++) {
        const a0 = d * Math.PI / 2 - Math.PI / 4 + 0.06, a1 = d * Math.PI / 2 + Math.PI / 4 - 0.06, open = doorOpen(d), closing = open && !doorOpen(d, DOOR_WARN);
        if (open) glow(closing ? '#FFB547' : '#7EE2B8', 14, () => { ctx.strokeStyle = closing && Math.sin(t * 28) > 0 ? '#FFB547' : '#7EE2B8'; ctx.lineWidth = 5; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.arc(V.x, V.y, V.r + 4, a0, a1); ctx.stroke(); ctx.setLineDash([]); });
        else {
          ctx.strokeStyle = '#5a1726'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(V.x, V.y + lift(4), V.r + 5, a0, a1); ctx.stroke();
          ctx.strokeStyle = doorOpen(d, DOOR_WARN) && Math.sin(t * 28) > 0 ? '#7EE2B8' : '#ff3d5a'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(V.x, V.y - lift(10), V.r + 5, a0, a1); ctx.stroke();
        }
      }
      for (const f of flashes) { ctx.strokeStyle = f.c; ctx.globalAlpha = f.t * 1.6; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(V.x, V.y, V.r + (0.6 - f.t) * 90, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
      lightPool(V.x, V.y, 110, '#FFB547', 0.25);
      sprite(V.y - 1, () => billboard(V.x, V.y, 46 + Math.sin(t * 2.4) * 5, () => {
        additive(() => { ctx.globalAlpha = 0.5; const g = ctx.createLinearGradient(0, 0, 0, 46); g.addColorStop(0, 'rgba(255,217,91,.6)'); g.addColorStop(1, 'rgba(255,217,91,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(14, 6); ctx.lineTo(34, 46); ctx.lineTo(-34, 46); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; });
        ctx.globalAlpha = 0.75; ctx.scale(Math.cos(t * 2) * 0.35 + 0.95, 1); glow('#FFD95B', 14, () => drawCrown(0, 0, 1.5)); ctx.globalAlpha = 1;
      }));
      // drop telegraphs + crowns (upright, depth sorted)
      for (const c of crowns) {
        if (c.held) continue;
        if (c.fall > 0) { const p = 1 - c.fall / (c.fall0 || 0.7); if (c.gold) { ctx.strokeStyle = `rgba(255,255,255,${0.5 + p * 0.5})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.x, c.y, 32 - p * 12, 0, Math.PI * 2); ctx.stroke(); } ctx.strokeStyle = `rgba(255,217,91,${0.4 + p * 0.5})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(c.x, c.y, 22 - p * 8, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = `rgba(255,217,91,${p * 0.25})`; ctx.fill(); }
        else contactShadow(c.x, c.y + 2, 14, 7, 0.4);
        sprite(c.y, () => billboard(c.x, c.y, c.z + 14 + Math.sin(t * 4 + c.ph) * 2.5, () => {
          lightPoolScreen();
          if (c.gold) { additive(() => { ctx.fillStyle = 'rgba(255,240,150,.5)'; ctx.beginPath(); ctx.arc(0, -6, 22 + Math.sin(t * 6) * 3, 0, Math.PI * 2); ctx.fill(); }); glow('#fff6b0', 20, () => drawCrown(0, 0, 1.9)); bigLabel('×2', 0, -34, '#fff6b0', 12); }
          else glow('#FFD95B', 10, () => drawCrown(0, 0, 1.45));
          const sh = (t * 1.3 + c.ph) % 2.2; if (sh < 0.35) { additive(() => { ctx.strokeStyle = `rgba(255,255,255,${1 - sh / 0.35})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10 + sh * 50, -8); ctx.lineTo(-4 + sh * 50, 8); ctx.stroke(); }); }
        }));
      }
      drawAll(beans);
      tally(beans, (b) => `${b.bank}/${TARGET}${b.carry ? (b.carry.gold ? ' ♛×2' : ' ♛') : ''}`, (b) => b.bank / TARGET);
      function lightPoolScreen() { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22); g.addColorStop(0, 'rgba(255,217,91,.35)'); g.addColorStop(1, 'rgba(255,217,91,0)'); ctx.fillStyle = g; ctx.fillRect(-22, -22, 44, 44); }
    },
    winner(t, timedOut) {
      const w = beans.find((b) => b.bank >= TARGET); if (w) return w;
      if (timedOut) return [...beans].sort((a, b) => (b.bank - a.bank) || ((b.carry ? 1 : 0) - (a.carry ? 1 : 0)) || (hyp(a.x - V.x, a.y - V.y) - hyp(b.x - V.x, b.y - V.y)))[0];
      return null;
    },
  };
})();
