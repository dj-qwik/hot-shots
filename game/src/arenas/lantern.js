// 17 · Lantern Larceny — a night courtyard. Grab a lantern from the towers in the middle and carry it to YOUR
// base. Step onto a rival's base to steal one of theirs — unless they're standing on it, which shields it
// (but you can't score while guarding). Carrying slows you; a tackle knocks the lantern loose. Bank 6 to win.
// Ghost lanterns (blue, worth 2) float into the yard now and then — worth the detour? TWIST at 12 s: LIGHTS
// OUT — the courtyard goes dark and guarding no longer shields a base, so every bank is up for grabs.
ARENAS.lantern = (() => {
  const TARGET = 6, C = { x: 480, y: 300 }, O = ovalKit(C, 1.25), YARD = 300, BASE_R = 34, RELIGHT = 2.8;
  const TOWERS = [0, 1, 2].map((k) => ({ x: C.x + Math.cos(-Math.PI / 2 + k * 2.094) * 72, y: C.y + Math.sin(-Math.PI / 2 + k * 2.094) * 72 }));
  let beans, ground, embers, ghost, ghostT, dark;
  const GHOST_LIFE = 7;
  const guarded = (o) => !dark && hyp(o.x - o.base.x, o.y - o.base.y) < BASE_R && o.z < 10;
  // upright lantern (screen px, origin at its base)
  function lanternFig(t, lit = true, seed = 0) {
    const fl = 0.85 + 0.15 * Math.sin(t * 13 + seed) * Math.sin(t * 7.3 + seed * 2);
    if (lit) additive(() => { const g = ctx.createRadialGradient(0, -13, 0, 0, -13, 30); g.addColorStop(0, `rgba(255,190,90,${0.45 * fl})`); g.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = g; ctx.fillRect(-30, -43, 60, 60); });
    ctx.fillStyle = '#3b2a1c'; roundRect(-8, -3, 16, 3, 1); ctx.fill();
    const gg = ctx.createLinearGradient(-7, 0, 7, 0);
    gg.addColorStop(0, lit ? '#ff9a3c' : '#5b4a52'); gg.addColorStop(0.5, lit ? '#ffe9a8' : '#7d6c78'); gg.addColorStop(1, lit ? '#ff8a2a' : '#4b3a42');
    ctx.fillStyle = gg; roundRect(-7, -23, 14, 20, 4); ctx.fill();
    if (lit) { ctx.fillStyle = `rgba(255,255,240,${0.9 * fl})`; ctx.beginPath(); ctx.ellipse(0, -12, 2.6, 4.5 * fl, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#3b2a1c'; ctx.lineWidth = 1.5; for (const x of [-7, 0, 7]) { ctx.beginPath(); ctx.moveTo(x, -23); ctx.lineTo(x, -3); ctx.stroke(); }
    ctx.fillStyle = '#4a3423'; ctx.beginPath(); ctx.moveTo(-9, -23); ctx.lineTo(9, -23); ctx.lineTo(4, -29); ctx.lineTo(-4, -29); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4a3423'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -31, 3, Math.PI, 0); ctx.stroke();
  }
  function ghostFig(t) {
    additive(() => { const g = ctx.createRadialGradient(0, -14, 0, 0, -14, 34); g.addColorStop(0, 'rgba(120,200,255,.6)'); g.addColorStop(1, 'rgba(80,140,255,0)'); ctx.fillStyle = g; ctx.fillRect(-34, -48, 68, 68); });
    const gg = ctx.createLinearGradient(-8, 0, 8, 0); gg.addColorStop(0, '#4aa8ff'); gg.addColorStop(0.5, '#dff4ff'); gg.addColorStop(1, '#3a8cff');
    ctx.fillStyle = gg; roundRect(-8, -26, 16, 23, 5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.ellipse(0, -14, 3, 5 + Math.sin(t * 9), 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b4a7a'; ctx.beginPath(); ctx.moveTo(-10, -26); ctx.lineTo(10, -26); ctx.lineTo(4, -32); ctx.lineTo(-4, -32); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dff4ff'; ctx.font = '9px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('×2', 0, -40);
  }
  return {
    key: 'lantern', name: 'Lantern Larceny', genre: 'Steal-and-score', theme: 'night', timeout: ROUND_SECONDS, maxSpeed: 215,
    objective: 'Carry lanterns to YOUR base (blue ghost lanterns count 2). Step on a rival base to steal — unless its owner guards it. Bank 6.',
    power: { kinds: ['zoom', 'shove', 'bubble'], every: [4.5, 6.5], spot() { const a = rnd(0, Math.PI * 2); return O.pt(a, rnd(110, 200)); } },
    _dbg: { towers: TOWERS },
    init(bs) {
      beans = bs; ground = []; embers = []; ghost = null; ghostT = rnd(4, 6); dark = false;
      TOWERS.forEach((tw) => { tw.has = true; tw.t = 0; });
      const a0 = rnd(0, Math.PI * 2); // bases on a circle: equal distance to the towers for everyone
      beans.forEach((b, i) => { const a = a0 + (i / beans.length) * Math.PI * 2; b.base = { ...O.pt(a, 222), a }; b.x = b.base.x - Math.cos(a) * 46 * O.SX; b.y = b.base.y - Math.sin(a) * 46; b.bank = 0; b.carry = null; b.stealCd = 0; b.guardT = 0; });
    },
    drop(b) { if (!b.carry) return; ground.push({ x: b.x + rnd(-20, 20), y: b.y + rnd(-20, 20), life: 8, kind: b.carry }); b.carry = null; },
    update(dt, t) {
      if (!dark && t >= 12) { dark = true; announce('TWIST: LIGHTS OUT — NO GUARDING!', '#8F75FF'); }
      if (!ghost && (ghostT -= dt) <= 0) { const a = rnd(0, Math.PI * 2); ghost = { ...O.pt(a, rnd(150, 230)), life: GHOST_LIFE }; ghostT = rnd(5.5, 7.5); }
      if (ghost && (ghost.life -= dt) <= 0) { puff(ghost.x, ghost.y, 8, 'rgba(140,200,255,.6)', 40, 6, 0.6); ghost = null; }
      for (const tw of TOWERS) if (!tw.has && (tw.t -= dt) <= 0) { tw.has = true; sparks(tw.x, tw.y - lift(56), 8, ['#ffd27a', '#fff'], 120, 0.4); }
      for (const g of ground) g.life -= dt; ground = ground.filter((g) => g.life > 0 && !g.taken);
      for (const b of beans) {
        // stay inside the courtyard; towers are solid
        O.keepIn(b, YARD - 12);
        for (const tw of TOWERS) { const d = hyp(b.x - tw.x, b.y - tw.y); if (d < 18 + R && d > 0.1) { b.x = tw.x + (b.x - tw.x) / d * (18 + R); b.y = tw.y + (b.y - tw.y) / d * (18 + R); } }
        b.stealCd -= dt;
        b.guardT = guarded(b) ? b.guardT + dt : 0;
        if (!b.carry && b.proneT <= 0 && b.z < 14) {
          for (const tw of TOWERS) if (tw.has && hyp(b.x - tw.x, b.y - tw.y) < 18 + R + 10) { tw.has = false; tw.t = RELIGHT; b.carry = 'L'; puff(tw.x, tw.y - lift(56), 5, 'rgba(120,110,140,.6)', 30, 6, 0.8); if (b.human) beep(760, 0.06, 'sine', 0.05); break; }
          if (ghost && hyp(b.x - ghost.x, b.y - ghost.y) < 26) { b.carry = 'G'; ghost = null; if (b.human) { beep(620, 0.1, 'sine', 0.05); popText(b.x, b.y - 46, 'GHOST LANTERN ×2', '#8fd4ff', 16); } }
          if (!b.carry) for (const g of ground) if (!g.taken && hyp(b.x - g.x, b.y - g.y) < 24) { g.taken = true; b.carry = g.kind || 'L'; break; }
          if (!b.carry && b.stealCd <= 0) for (const o of beans) if (o !== b && o.bank > 0 && hyp(b.x - o.base.x, b.y - o.base.y) < BASE_R) {
            if (guarded(o)) { if (b.human && !b.blockedMsg) { popText(o.base.x, o.base.y - 40, 'GUARDED!', '#37D8E9', 16); b.blockedMsg = true; } continue; }
            o.bank--; b.carry = 'L'; b.stealCd = 1; feed(`${b.human ? 'You' : b.name} stole from ${o.human ? 'you' : o.name}`, b.color);
            sparks(o.base.x, o.base.y, 12, [o.color, '#ffd27a'], 200, 0.5); if (b.human || o.human) beep(o.human ? 160 : 990, 0.1, 'triangle', 0.05); break;
          }
        }
        if (hyp(b.x - b.base.x, b.y - b.base.y) > BASE_R + 30) b.blockedMsg = false;
        if (b.carry && hyp(b.x - b.base.x, b.y - b.base.y) < BASE_R) { b.bank += b.carry === 'G' ? 2 : 1; b.carry = null; ring(b.base.x, b.base.y, '#ffd27a', 10, 60, 0.4, 5); if (b.human) { beep(880, 0.08, 'square', 0.05); setTimeout(() => beep(1175, 0.1, 'square', 0.05), 80); } }
      }
      if (Math.random() < dt * 10) embers.push({ x: rnd(C.x - 260 * O.SX, C.x + 260 * O.SX), y: rnd(C.y - 230, C.y + 230), z: 0, life: rnd(1, 2.4) });
      for (const e of embers) { e.life -= dt; e.z += 30 * dt; } embers = embers.filter((e) => e.life > 0);
    },
    botInput(b, t) {
      let tgt, dive = false;
      if (b.carry) tgt = b.base;
      else {
        // guard: a thief is heading for my base and I have something to lose
        const thief = beans.find((o) => o !== b && !o.carry && hyp(o.x - b.base.x, o.y - b.base.y) < 110 && hyp(o.x - b.base.x, o.y - b.base.y) < hyp(o.x - C.x, o.y - C.y));
        if (thief && !dark && b.bank >= 2 && hyp(b.x - b.base.x, b.y - b.base.y) < 150 && Math.random() < 0.5 + b.skill * 0.5) tgt = b.base;
        else {
          const opts = [];
          for (const tw of TOWERS) { const eta = tw.has ? 0 : tw.t; opts.push({ p: tw, c: hyp(tw.x - b.x, tw.y - b.y) + eta * 180 }); }
          for (const g of ground) opts.push({ p: g, c: hyp(g.x - b.x, g.y - b.y) * (g.kind === 'G' ? 0.55 : 0.8) });
          if (ghost) { const d = hyp(ghost.x - b.x, ghost.y - b.y); if (d / 200 < ghost.life) opts.push({ p: ghost, c: d * (1.05 - b.skill * 0.5) }); }
          for (const o of beans) if (o !== b && o.bank > 0 && !guarded(o)) opts.push({ p: o.base, c: hyp(o.base.x - b.x, o.base.y - b.y) * (1.25 - o.bank * 0.1 - (dark ? 0.2 : 0)) });
          opts.sort((a, c) => a.c - c.c);
          tgt = opts[0]?.p || C;
        }
        for (const o of beans) if (o !== b && o.carry && hyp(o.x - b.x, o.y - b.y) < 75 && b.diveCd <= 0 && Math.random() < 0.05 + b.skill * 0.08) { const d = seek(b, o.x, o.y); return { x: d.x, y: d.y, jump: false, dive: true }; }
      }
      const d = seek(b, tgt.x, tgt.y), dist = hyp(tgt.x - b.x, tgt.y - b.y);
      const sc = tgt === b.base && !b.carry ? clamp(dist / 14, 0, 1) : 1;
      return { x: d.x * sc, y: d.y * sc, jump: false, dive };
    },
    draw(t) {
      // ── stone courtyard: raised disc, mosaic rings, night shading
      O.stretch(() => {
      platformCircle(C.x, C.y, YARD, mat('stone'), '#221c38', 26);
      ctx.save(); ctx.beginPath(); ctx.arc(C.x, C.y, YARD, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = 'rgba(255,220,160,.12)'; ctx.lineWidth = 10; for (const r of [120, 185]) { ctx.beginPath(); ctx.arc(C.x, C.y, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,220,160,.1)'; ctx.lineWidth = 2; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; ctx.beginPath(); ctx.moveTo(C.x + Math.cos(a) * 120, C.y + Math.sin(a) * 120); ctx.lineTo(C.x + Math.cos(a) * 185, C.y + Math.sin(a) * 185); ctx.stroke(); }
      const night = ctx.createRadialGradient(C.x, C.y, 60, C.x, C.y, YARD); night.addColorStop(0, 'rgba(8,6,25,.15)'); night.addColorStop(1, 'rgba(8,6,25,.6)');
      ctx.fillStyle = night; ctx.fillRect(C.x - YARD, C.y - YARD, YARD * 2, YARD * 2);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,210,140,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(C.x, C.y, YARD - 3, 0, Math.PI * 2); ctx.stroke();
      });
      // ── warm light pools from every lit lantern
      for (const tw of TOWERS) if (tw.has) lightPool(tw.x, tw.y, 120, 'rgba(255,160,70,1)', 0.35);
      for (const g of ground) lightPool(g.x, g.y, 60, 'rgba(255,160,70,1)', 0.3);
      for (const b of beans) { if (b.carry) lightPool(b.x, b.y, 80, 'rgba(255,160,70,1)', 0.35); if (b.bank) lightPool(b.base.x, b.base.y, 50 + b.bank * 10, 'rgba(255,160,70,1)', 0.25); }
      // ── bases: coloured pedestals, shield ring when guarded
      for (const b of beans) {
        const g = guarded(b);
        platformCircle(b.base.x, b.base.y, BASE_R, shade(b.color, 0.55), shade(b.color, 0.3), 9);
        ctx.strokeStyle = b.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.base.x, b.base.y, BASE_R - 3, 0, Math.PI * 2); ctx.stroke();
        bigLabel(String(b.i + 1), b.base.x, b.base.y + 16, 'rgba(255,255,255,.5)', 12);
        if (g) glow('#37D8E9', 14, () => { ctx.strokeStyle = `rgba(55,216,233,${0.6 + 0.3 * Math.sin(t * 8)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.base.x, b.base.y, BASE_R + 6, 0, Math.PI * 2); ctx.stroke(); });
      }
      const extras = [];
      for (const b of beans) {
        const g = guarded(b);
        extras.push({ y: b.base.y - 20, draw: () => billboard(b.base.x, b.base.y, 0, () => {
          // banner pole + flag behind the pedestal
          ctx.fillStyle = '#b9b2d8'; ctx.fillRect(18, -62, 3, 56);
          const wave = Math.sin(t * 4 + b.i) * 3;
          ctx.fillStyle = b.color; ctx.beginPath(); ctx.moveTo(21, -62); ctx.quadraticCurveTo(36, -60 + wave, 48, -55 + wave); ctx.lineTo(21, -46); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.font = '800 9px "Baloo 2", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(b.i + 1), 31, -53);
          // banked lanterns
          for (let k = 0; k < b.bank; k++) { ctx.save(); ctx.translate((k - (b.bank - 1) / 2) * 11, -4); ctx.scale(0.62, 0.62); lanternFig(t, true, k + b.i); ctx.restore(); }
          // shield dome
          if (g) { ctx.strokeStyle = 'rgba(55,216,233,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -2, BASE_R + 6, 46, 0, Math.PI, 0); ctx.stroke(); ctx.fillStyle = 'rgba(55,216,233,.08)'; ctx.fill(); }
        }) });
      }
      for (const tw of TOWERS) extras.push({ y: tw.y, draw: () => billboard(tw.x, tw.y, 0, () => {
        ctx.fillStyle = 'rgba(5,5,20,.35)'; ctx.beginPath(); ctx.ellipse(4, 2, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
        const pg = ctx.createLinearGradient(-15, 0, 15, 0); pg.addColorStop(0, '#4d4566'); pg.addColorStop(0.4, '#8c84ad'); pg.addColorStop(1, '#3a3350');
        ctx.fillStyle = pg; ctx.fillRect(-15, -48, 30, 48);
        ctx.strokeStyle = 'rgba(20,15,40,.4)'; ctx.lineWidth = 1.5; for (let y = -40; y < 0; y += 10) { ctx.beginPath(); ctx.moveTo(-15, y); ctx.lineTo(15, y); ctx.stroke(); }
        ctx.fillStyle = '#a49cc6'; ctx.beginPath(); ctx.ellipse(0, -48, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
        if (tw.has) { ctx.save(); ctx.translate(0, -50); lanternFig(t, true, tw.x); ctx.restore(); }
        else {
          const k = 1 - tw.t / RELIGHT;
          ctx.strokeStyle = 'rgba(255,200,120,.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -62, 9, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke();
          ctx.fillStyle = `rgba(150,140,170,${0.3 + 0.2 * Math.sin(t * 5)})`; ctx.beginPath(); ctx.arc(Math.sin(t * 3) * 3, -70 - (t * 20 % 12), 4, 0, Math.PI * 2); ctx.fill();
        }
      }) });
      for (const g of ground) extras.push({ y: g.y, draw: () => billboard(g.x, g.y, 0, () => { ctx.globalAlpha = g.life < 2 && Math.sin(t * 18) > 0 ? 0.4 : 1; if (g.kind === 'G') ghostFig(t); else lanternFig(t, true, g.x); ctx.globalAlpha = 1; }) });
      if (ghost) { lightPool(ghost.x, ghost.y, 80, 'rgba(110,190,255,1)', 0.4); extras.push({ y: ghost.y, draw: () => billboard(ghost.x, ghost.y, 10 + Math.sin(t * 3) * 6, () => { ctx.globalAlpha = ghost.life < 2 && Math.sin(t * 18) > 0 ? 0.45 : 1; ghostFig(t); ctx.globalAlpha = 1; }) }); }
      for (const b of beans) if (b.carry) extras.push({ y: b.y + 0.05, draw: () => billboard(b.x, b.y, b.z + (b.zoff || 0) + 46, () => (b.carry === 'G' ? ghostFig(t) : lanternFig(t, true, b.i))) });
      // lights out: darkness everywhere except around lanterns and carriers
      if (dark) extras.push({ y: 1e6, draw: () => inScreen(() => {
        ctx.save(); ctx.fillStyle = 'rgba(4,3,18,.55)'; ctx.fillRect(0, 0, W, H); ctx.restore();
      }) });
      for (const e of embers) extras.push({ y: e.y, draw: () => billboard(e.x, e.y, e.z, () => { ctx.fillStyle = `rgba(255,180,90,${Math.min(1, e.life) * 0.7})`; ctx.fillRect(-1, -1, 2, 2); }) });
      drawAll(beans, extras);
      if (dark) for (const b of beans) if (b.carry) lightPool(b.x, b.y, 90, 'rgba(255,170,80,1)', 0.25);
      tally(beans, (b) => `${b.bank}/${TARGET}${b.carry ? ' +1' : ''}`, (b) => b.bank / TARGET);
    },
    winner(t, to) { return scoreWinner(beans, to, (b) => b.bank, TARGET, (b) => (b.carry ? 1 : 0) - hyp(b.x - b.base.x, b.y - b.base.y) / 1000); },
  };
})();
