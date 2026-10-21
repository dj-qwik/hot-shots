// 14 · Jelly Jackpot — fill your recipe card (5 jellies, shown over your head), then dunk them in the
// cauldron. Gumball dispensers take turns lobbing jellies across the counter: you can only grab one once
// it lands (watch the landing rings). Every jelly you carry slows you a little; a tackle knocks two loose.
ARENAS.jelly = (() => {
  const X1 = 60, X2 = 900, Y1 = 55, Y2 = 545, POT = { x: 480, y: 300, r: 40, dunk: 62 }, CARD = 5;
  const DISP = [{ x: 118, y: 108 }, { x: 842, y: 108 }, { x: 118, y: 492 }, { x: 842, y: 492 }];
  let cubes, beans, fireT, turn, bubbles;
  const needs = (b, c) => b.recipe.filter((x) => x === c).length > b.got.filter((x) => x === c).length;
  const landed = (c) => c.flight <= 0;
  function landingSpot() {
    for (let k = 0; k < 30; k++) {
      const p = { x: rnd(X1 + 40, X2 - 40), y: rnd(Y1 + 40, Y2 - 40) };
      if (hyp(p.x - POT.x, p.y - POT.y) > POT.dunk + 30 && DISP.every((d) => hyp(p.x - d.x, p.y - d.y) > 110)) return p;
    }
    return { x: 300, y: 300 };
  }
  function lob(from, color, to, dur = 0.95, peak = 120) {
    cubes.push({ sx: from.x, sy: from.y, x: from.x, y: from.y, tx: to.x, ty: to.y, z: 40, c: color, flight: dur, dur, peak, life: 7, wob: 0 });
  }
  function drawJelly(c, t, scale = 1) {
    const [col, shp] = PALETTE4[c.c];
    const blink = c.life < 2 && Math.sin(t * 20) > 0 ? 0.45 : 1;
    const w = Math.sin(t * 12 + c.sx) * (0.06 + c.wob * 0.25);
    ctx.globalAlpha = blink;
    ctx.scale(scale * (1 + w), scale * (1 - w));
    const g = ctx.createLinearGradient(-11, -22, 11, 0);
    g.addColorStop(0, shade(col, 1.35)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, 0.62));
    ctx.fillStyle = g; roundRect(-11, -21, 22, 20, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; roundRect(-7, -17, 14, 12, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)'; roundRect(-8, -19, 6, 3, 1.5); ctx.fill();
    ctx.strokeStyle = shade(col, 0.5); ctx.lineWidth = 1.2; roundRect(-11, -21, 22, 20, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; SHAPES[shp](0, -11, 4);
    ctx.globalAlpha = 1;
  }
  return {
    key: 'jelly', name: 'Jelly Jackpot', genre: 'Collection', theme: 'candy', timeout: ROUND_SECONDS, maxSpeed: 215,
    objective: 'Collect the 5 jellies on your card (shown over your head). Grab them where they land. Then dunk them in the cauldron.',
    _dbg: { disp: DISP },
    init(bs) {
      beans = bs; cubes = []; fireT = 0.4; turn = (Math.random() * 4) | 0; bubbles = [];
      placeRing(beans, POT.x, POT.y, 190, 140, rnd(0, Math.PI * 2));
      beans.forEach((b) => { b.recipe = Array.from({ length: CARD }, () => (Math.random() * 4) | 0); b.got = []; b.done = false; });
      // an opening volley: one jelly per dispenser
      for (const d of DISP) lob(d, (Math.random() * 4) | 0, landingSpot(), rnd(0.7, 1.1));
    },
    mods(b) { return { slow: 1 - 0.045 * b.got.length }; },
    onTackle(vic) {
      for (let k = 0; k < 2 && vic.got.length; k++) {
        const c = vic.got.splice((Math.random() * vic.got.length) | 0, 1)[0];
        const a = rnd(0, Math.PI * 2), d = rnd(70, 130);
        lob(vic, c, { x: clamp(vic.x + Math.cos(a) * d, X1 + 20, X2 - 20), y: clamp(vic.y + Math.sin(a) * d, Y1 + 20, Y2 - 20) }, 0.5, 60);
      }
      vic.done = false;
    },
    update(dt, t) {
      // dispensers take turns; colour is biased toward what someone still needs
      if ((fireT -= dt) <= 0 && cubes.length < 10) {
        fireT = 0.95;
        const d = DISP[turn++ % 4];
        let c = (Math.random() * 4) | 0;
        const needy = beans.filter((b) => b.got.length < CARD);
        if (needy.length && Math.random() < 0.6) { const b = needy[(Math.random() * needy.length) | 0]; const miss = b.recipe.filter((x) => needs(b, x)); if (miss.length) c = miss[(Math.random() * miss.length) | 0]; }
        lob(d, c, landingSpot());
        puff(d.x, d.y - lift(60), 4, 'rgba(255,255,255,.7)', 50, 5, 0.4);
      }
      for (const c of cubes) {
        if (c.flight > 0) {
          c.flight -= dt; const k = 1 - Math.max(0, c.flight) / c.dur;
          c.x = c.sx + (c.tx - c.sx) * k; c.y = c.sy + (c.ty - c.sy) * k; c.z = 40 * (1 - k) + Math.sin(k * Math.PI) * c.peak;
          if (c.flight <= 0) { c.z = 0; c.wob = 1; puff(c.x, c.y, 4, hexA(PALETTE4[c.c][0], 0.6), 60, 5, 0.35); }
        } else { c.life -= dt; c.wob = Math.max(0, c.wob - dt * 2); if (c.life <= 0) c.dead = true; }
      }
      for (const b of beans) {
        b.x = clamp(b.x, X1 + 12, X2 - 12); b.y = clamp(b.y, Y1 + 10, Y2 - 10);
        // dispensers and the cauldron are solid
        for (const o of [...DISP.map((d) => ({ x: d.x, y: d.y, r: 34 })), { x: POT.x, y: POT.y, r: POT.r }]) {
          const dd = hyp(b.x - o.x, b.y - o.y); if (dd < o.r + R && dd > 0.1) { b.x = o.x + (b.x - o.x) / dd * (o.r + R); b.y = o.y + (b.y - o.y) / dd * (o.r + R); }
        }
        if (b.got.length < CARD && b.proneT <= 0 && b.z < 14) for (const c of cubes) {
          if (!c.dead && landed(c) && hyp(c.x - b.x, c.y - b.y) < 24 && needs(b, c.c)) { b.got.push(c.c); c.dead = true; if (b.human) beep(820 + b.got.length * 120, 0.07, 'sine', 0.05); break; }
        }
        if (b.got.length === CARD && !b.done && hyp(b.x - POT.x, b.y - POT.y) < POT.dunk) {
          b.done = true; sparks(POT.x, POT.y - lift(50), 24, ['#ff8fc2', '#fff', b.color], 260, 0.7); ring(POT.x, POT.y, b.color, 20, 120, 0.5, 6); hype(0.6);
        }
      }
      cubes = cubes.filter((c) => !c.dead);
      if (Math.random() < dt * 6) bubbles.push({ x: rnd(-22, 22), y: rnd(-6, 6), life: rnd(0.4, 0.9), r: rnd(2, 5) });
      for (const bb of bubbles) bb.life -= dt; bubbles = bubbles.filter((bb) => bb.life > 0);
    },
    botInput(b, t) {
      let tgt = POT, dive = false;
      if (b.got.length < CARD) {
        let best = null, bs = 1e9;
        for (const c of cubes) if (needs(b, c.c)) {
          const d = hyp(c.tx ?? c.x, (c.ty ?? c.y)) && hyp((c.flight > 0 ? c.tx : c.x) - b.x, (c.flight > 0 ? c.ty : c.y) - b.y);
          let rivals = 0; for (const o of beans) if (o !== b && needs(o, c.c) && hyp((c.flight > 0 ? c.tx : c.x) - o.x, (c.flight > 0 ? c.ty : c.y) - o.y) < d * 0.8) rivals++;
          const s = d + rivals * 90 * b.skill + (c.life < 1.5 ? 120 : 0);
          if (s < bs) { bs = s; best = { x: c.flight > 0 ? c.tx : c.x, y: c.flight > 0 ? c.ty : c.y }; }
        }
        tgt = best || { x: POT.x + Math.cos(t + b.i) * 160, y: POT.y + Math.sin(t + b.i) * 120 };
      }
      // knock jellies out of anyone close to finishing
      for (const o of beans) if (o !== b && o.got.length >= 3 && !o.done && hyp(o.x - b.x, o.y - b.y) < 70 && b.diveCd <= 0 && Math.random() < 0.04 + b.skill * 0.06) { const d = seek(b, o.x, o.y); return { x: d.x, y: d.y, jump: false, dive: true }; }
      const d = seek(b, tgt.x, tgt.y);
      return { x: d.x, y: d.y, jump: false, dive };
    },
    draw(t) {
      // ── candy counter: raised slab, striped trim, pastel checker top
      const dep = lift(22);
      ctx.fillStyle = 'rgba(40,5,40,.35)'; roundRect(X1 - 22, Y1 - 12 + dep + 14, X2 - X1 + 52, Y2 - Y1 + 36, 26); ctx.fill();
      ctx.fillStyle = '#b8467f'; roundRect(X1 - 28, Y1 - 28 + dep, X2 - X1 + 56, Y2 - Y1 + 56, 26); ctx.fill();
      ctx.fillStyle = mat('candy'); roundRect(X1 - 28, Y1 - 28, X2 - X1 + 56, Y2 - Y1 + 56, 26); ctx.fill();
      ctx.save(); roundRect(X1 - 6, Y1 - 6, X2 - X1 + 12, Y2 - Y1 + 12, 16); ctx.clip();
      for (let y = Y1 - 6, r = 0; y < Y2 + 6; y += 60, r++) for (let x = X1 - 6, c = 0; x < X2 + 6; x += 60, c++) { ctx.fillStyle = (r + c) % 2 ? '#fff4fa' : '#ffe0ef'; ctx.fillRect(x, y, 60, 60); }
      const gl = ctx.createLinearGradient(0, Y1, 0, Y2); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(160,60,110,.12)');
      ctx.fillStyle = gl; ctx.fillRect(X1 - 6, Y1 - 6, X2 - X1 + 12, Y2 - Y1 + 12);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; roundRect(X1 - 6, Y1 - 6, X2 - X1 + 12, Y2 - Y1 + 12, 16); ctx.stroke();
      // ── cauldron glow on the counter
      lightPool(POT.x, POT.y, 150, 'rgba(255,120,200,.9)', 0.3);
      ctx.strokeStyle = 'rgba(180,60,130,.35)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]); ctx.lineDashOffset = t * 20; ctx.beginPath(); ctx.arc(POT.x, POT.y, POT.dunk, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      // ── landing rings for jellies in the air (where to stand), shadows for all
      for (const c of cubes) {
        const px = c.flight > 0 ? c.tx : c.x, py = c.flight > 0 ? c.ty : c.y;
        if (c.flight > 0) {
          const k = 1 - c.flight / c.dur;
          ctx.strokeStyle = hexA(PALETTE4[c.c][0], 0.5 + 0.4 * k); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, py, 24 - k * 10, 0, Math.PI * 2); ctx.stroke();
          contactShadow(px, py, 8 + k * 8, 5 + k * 4, 0.12 + k * 0.2);
        } else { contactShadow(c.x, c.y + 1, 14, 7, 0.3); lightPool(c.x, c.y, 26, hexA(PALETTE4[c.c][0], 1), 0.25); }
      }
      // ── upright things: dispensers, cauldron, jellies, beans, recipe cards
      const extras = [];
      DISP.forEach((d, i) => {
        const next = (turn % 4) === i;
        extras.push({ y: d.y, draw: () => billboard(d.x, d.y, 0, () => {
          // base
          const bg = ctx.createLinearGradient(-26, 0, 26, 0); bg.addColorStop(0, '#9b1c3c'); bg.addColorStop(0.45, '#ff4f78'); bg.addColorStop(1, '#7a1530');
          ctx.fillStyle = 'rgba(30,0,20,.3)'; ctx.beginPath(); ctx.ellipse(4, 2, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(24, 0); ctx.lineTo(19, -40); ctx.lineTo(-19, -40); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#d8dbe8'; roundRect(-8, -26, 16, 12, 3); ctx.fill(); ctx.fillStyle = '#5a5f80'; roundRect(-5, -22, 10, 6, 2); ctx.fill();
          const lamp = next && fireT < 0.45 ? (Math.sin(t * 30) > 0 ? '#FFD95B' : '#ff8a3d') : '#5a2030';
          glow(lamp, next ? 12 : 0, () => { ctx.fillStyle = lamp; ctx.beginPath(); ctx.arc(0, -33, 3.5, 0, Math.PI * 2); ctx.fill(); });
          // glass globe full of jellies
          ctx.fillStyle = 'rgba(200,230,255,.25)'; ctx.beginPath(); ctx.arc(0, -66, 28, 0, Math.PI * 2); ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.arc(0, -66, 26, 0, Math.PI * 2); ctx.clip();
          for (let k = 0; k < 18; k++) { const a = k * 2.4, rr = (k % 6) * 4.2; ctx.fillStyle = PALETTE4[k % 4][0]; roundRect(Math.cos(a) * rr - 4, -58 + Math.sin(a) * rr * 0.6 + (k > 12 ? 8 : 0) - 4, 8, 8, 2); ctx.fill(); }
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -66, 27, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(-10, -80, 5, 3, -0.6, 0, Math.PI * 2); ctx.fill();
          const cg = ctx.createLinearGradient(-12, 0, 12, 0); cg.addColorStop(0, '#9aa0bf'); cg.addColorStop(0.5, '#f4f6ff'); cg.addColorStop(1, '#7c82a3');
          ctx.fillStyle = cg; roundRect(-12, -98, 24, 8, 3); ctx.fill(); ctx.beginPath(); ctx.arc(0, -98, 5, Math.PI, 0); ctx.fill();
        }) });
      });
      extras.push({ y: POT.y, draw: () => billboard(POT.x, POT.y, 0, () => {
        // iron cauldron with bubbling goo
        ctx.fillStyle = '#20223a'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 24, -6); ctx.lineTo(s * 30, 4); ctx.lineTo(s * 18, 4); ctx.closePath(); ctx.fill(); }
        const pg = ctx.createRadialGradient(-14, -34, 4, 0, -24, 50); pg.addColorStop(0, '#5d6282'); pg.addColorStop(0.6, '#2a2d48'); pg.addColorStop(1, '#14152a');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(0, -26, 44, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -26, 40, 26, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
        ctx.fillStyle = '#3a3e5e'; ctx.beginPath(); ctx.ellipse(0, -50, 42, 13, 0, 0, Math.PI * 2); ctx.fill();
        const gg = ctx.createRadialGradient(0, -52, 2, 0, -50, 36); gg.addColorStop(0, '#ffd6ec'); gg.addColorStop(0.5, '#ff7fc0'); gg.addColorStop(1, '#c23d86');
        glow('#ff7fc0', 16, () => { ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(0, -50, 36, 10, 0, 0, Math.PI * 2); ctx.fill(); });
        for (const bb of bubbles) { ctx.strokeStyle = `rgba(255,230,245,${bb.life})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bb.x, -52 + bb.y - (0.9 - bb.life) * 14, bb.r, 0, Math.PI * 2); ctx.stroke(); }
        ctx.font = '11px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#2a0a20'; ctx.strokeText('DUNK HERE', 0, -72); ctx.fillStyle = '#ffd6ec'; ctx.fillText('DUNK HERE', 0, -72);
      }) });
      for (const c of cubes) extras.push({ y: c.flight > 0 ? Math.min(c.y, c.ty) : c.y, draw: () => billboard(c.x, c.y, c.z, () => drawJelly(c, t, 1.2)) });
      for (const b of beans) {
        extras.push({ y: b.y + 0.05, draw: () => billboard(b.x, b.y, b.z + (b.human ? 92 : 78), () => {
          const n = b.recipe.length, sz = b.human ? 13 : 10, gap = sz + 2, x0 = -((n - 1) * gap) / 2;
          ctx.fillStyle = 'rgba(14,10,30,.75)'; roundRect(x0 - sz / 2 - 4, -sz / 2 - 4, (n - 1) * gap + sz + 8, sz + 8, 6); ctx.fill();
          if (b.done) { ctx.strokeStyle = '#7EE2B8'; ctx.lineWidth = 2; roundRect(x0 - sz / 2 - 4, -sz / 2 - 4, (n - 1) * gap + sz + 8, sz + 8, 6); ctx.stroke(); }
          const used = [];
          b.recipe.forEach((c, i) => {
            const x = x0 + i * gap, has = b.got.filter((g) => g === c).length > used.filter((u) => u === c).length; used.push(c);
            ctx.fillStyle = has ? PALETTE4[c][0] : 'rgba(255,255,255,.12)'; roundRect(x - sz / 2, -sz / 2, sz, sz, 3); ctx.fill();
            ctx.strokeStyle = PALETTE4[c][0]; ctx.lineWidth = 1.5; roundRect(x - sz / 2, -sz / 2, sz, sz, 3); ctx.stroke();
            ctx.fillStyle = has ? '#fff' : PALETTE4[c][0]; SHAPES[PALETTE4[c][1]](x, 0, sz * 0.3);
          });
        }) });
      }
      drawAll(beans, extras);
      tally(beans, (b) => (b.done ? 'DUNKED!' : `${b.got.length}/${CARD}${b.got.length === CARD ? ' → pot' : ''}`), (b) => (b.done ? 1 : b.got.length / CARD));
    },
    winner(t, to) { return scoreWinner(beans, to, (b) => (b.done ? CARD + 1 : b.got.length), CARD + 1, (b) => -hyp(b.x - POT.x, b.y - POT.y)); },
  };
})();
