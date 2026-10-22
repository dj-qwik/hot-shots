// 46 · Fuse Frenzy — hot-potato bomb tag in a boiler room. One player holds a lit bomb (two in big lobbies).
// Touch a rival to pass it on (no instant tag-backs). Holding it makes you a little faster, and DIVE throws it:
// a hit tags whoever it strikes; a miss lands on the floor where anyone who touches it picks it up, and it
// boomerangs back to the thrower if nobody does. When a fuse burns out, whoever has it is OUT (a bomb lying
// loose counts as its thrower's). Steel pillars are for juking. Last one standing wins.
// TWIST at 15 s: OVERHEAT — fuses burn faster and the floor shrinks.
// Timeout tie-break: least total time spent holding a bomb.
// Anti-exploit: standing still gets you tagged; running only works if you read the holder (they're faster);
// spamming dive as the holder throws the bomb away from you only for it to come back; walls are padded.
ARENAS.fuse = (() => {
  const C = { x: 480, y: 300 }, O = ovalKit(C, 1.35), R0 = 250, PILLAR_R = 24, THROW_SP = 430, THROW_T = 0.5;
  let beans, bombs, pillars, ringR, hot, nextBomb, booms;
  const alive = () => beans.filter((b) => b.alive);
  const fuseLen = () => { const n = alive().length; return clamp(18 / Math.max(1, n - 1), 3.2, 11) * rnd(0.9, 1.1); };
  const holderOf = (b) => bombs.find((k) => k.state === 'held' && k.holder === b);
  const canTag = (from, to, t) => to.alive && to !== from && !holderOf(to) && !(to.tagFrom === from && t - to.tagAt < 1.1);
  function give(bomb, to, from, t) {
    if (from && shielded(to)) { // bubble: the bomb bounces off
      if (from.alive) { const n = norm(from.x - to.x || 1, from.y - to.y); from.kx += n.x * 260; from.ky += n.y * 260; }
      return false;
    }
    bomb.state = 'held'; bomb.holder = to; to.tagFrom = from; to.tagAt = t; to.throwCd = 0.8; to.scaredT = 0.6;
    ring(to.x, to.y - 20, '#FF557D', 10, 60, 0.35, 5); sparks(to.x, to.y - 30, 8, ['#FFD95B', '#FF557D', '#fff'], 200, 0.35);
    if (to.human) { popText(to.x, to.y - 52, 'YOU HAVE THE BOMB!', '#FF557D', 18); beep(220, 0.12, 'square', 0.05); }
    else if (from && from.human) popText(from.x, from.y - 46, 'PASSED!', '#7EE2B8', 16);
    return true;
  }
  function newBomb(t) {
    const pool = alive().filter((b) => !holderOf(b));
    if (!pool.length) return;
    const b = pool[(Math.random() * pool.length) | 0];
    const bomb = { state: 'held', holder: null, fuse: fuseLen(), max: 0, x: b.x, y: b.y, z: 0, vx: 0, vy: 0, fly: 0, thrower: null, ground: 0 };
    bomb.max = bomb.fuse; bombs.push(bomb); give(bomb, b, null, t);
  }
  function explode(bomb, t) {
    const victim = bomb.state === 'held' ? bomb.holder : bomb.thrower;
    const x = bomb.state === 'held' ? victim.x : bomb.x, y = bomb.state === 'held' ? victim.y : bomb.y;
    booms.push({ x, y, t: 0.7 });
    ring(x, y, '#FFB547', 16, 150, 0.5, 10); ring(x, y, '#FF557D', 10, 100, 0.4, 6);
    puff(x, y - 10, 22, 'rgba(70,60,80,.9)', 200, 14, 0.9); sparks(x, y - 20, 26, ['#FFD95B', '#FF557D', '#fff', '#FFB547'], 380, 0.6);
    if (beans.some((b) => b.human)) shake(8);
    if (victim && victim.alive) { kill(victim, t, 70); feed(`${victim.name} went BOOM`, '#FF557D'); if (victim.human) popText(victim.x, victim.y - 50, 'BOOM!', '#FFB547', 26); }
    for (const b of beans) { if (!b.alive || b === victim) continue; const d = hyp(b.x - x, b.y - y); if (d < 120) { const n = norm(b.x - x || 1, b.y - y); b.kx += n.x * 520 * (1 - d / 140); b.ky += n.y * 520 * (1 - d / 140); b.stun = Math.max(b.stun, 0.35); b.scaredT = 0.8; } }
    bombs.splice(bombs.indexOf(bomb), 1);
    if (alive().length > 1) nextBomb.push(t + 1.2);
  }
  function solid(b) {
    for (const p of pillars) { const dx = b.x - p.x, dy = b.y - p.y, d = hyp(dx, dy), m = PILLAR_R + R; if (d < m && d > 0.01) { b.x = p.x + dx / d * m; b.y = p.y + dy / d * m; } }
    O.keepIn(b, ringR - R * 0.6);
  }

  return {
    key: 'fuse', name: 'Fuse Frenzy', genre: 'Tag', theme: 'fire', timeout: ROUND_SECONDS, maxSpeed: 215, tackle: 360,
    objective: 'Hot potato! Touch a rival to pass the bomb, or DIVE to throw it. Whoever holds it when the fuse runs out is out. The walls are hot.',
    power: {
      kinds: ['zoom', 'bubble', 'shove'], every: [4, 6],
      spot() { for (let k = 0; k < 8; k++) { const q = O.pt(rnd(0, Math.PI * 2), rnd(40, ringR - 40)); if (pillars.every((p) => hyp(q.x - p.x, q.y - p.y) > PILLAR_R + 30)) return q; } return null; },
      botGrab: 90,
    },
    init(bs) {
      beans = bs; bombs = []; booms = []; ringR = R0; hot = false;
      const a0 = rnd(0, Math.PI * 2), n = rnd(0, 1) < 0.5 ? 4 : 3;
      pillars = Array.from({ length: n }, (_, k) => O.pt(a0 + (k / n) * Math.PI * 2, rnd(105, 135)));
      placeRing(beans, C.x, C.y, 200 * O.SX, 200, rnd(0, Math.PI * 2));
      beans.forEach((b) => { b.held = 0; b.tagFrom = null; b.tagAt = -9; b.throwCd = 0; b.prevDive = 0; });
      // bombs light up after a short grace period; big lobbies get two
      nextBomb = beans.length >= 6 ? [2, 2.6] : [2];
    },
    mods(b) { return holderOf(b) ? { slow: 1.1 } : null; },
    update(dt, t) {
      if (!hot && t >= 15) { hot = true; announce('TWIST: OVERHEAT!', '#FFB547', 'fuses burn faster and the floor shrinks'); }
      if (hot) ringR = Math.max(R0 * 0.72, ringR - 9 * dt);
      for (let i = nextBomb.length - 1; i >= 0; i--) if (t >= nextBomb[i]) { nextBomb.splice(i, 1); if (alive().length > 1) newBomb(t); }
      for (const b of beans) {
        if (!b.alive) continue;
        solid(b);
        b.throwCd -= dt;
        // the rim is a hot boiler wall: lean on it for more than a moment and it singes you back into the open
        if (O.d(b.x, b.y) > ringR - R - 16 && b.z < 10) b.rimT = (b.rimT || 0) + dt; else b.rimT = Math.max(0, (b.rimT || 0) - dt * 2);
        if (b.rimT > 1.1) {
          b.rimT = 0; const n = norm(C.x - b.x, C.y - b.y); b.kx += n.x * 420; b.ky += n.y * 420; b.stun = Math.max(b.stun, 0.4); b.scaredT = 0.6;
          sparks(b.x, b.y - 10, 8, ['#FFB547', '#FF557D', '#fff'], 180, 0.35); puff(b.x, b.y - 6, 5, 'rgba(255,160,90,.7)', 60, 6, 0.4);
          if (b.human) { popText(b.x, b.y - 40, 'HOT WALL!', '#FFB547', 16); beep(300, 0.1, 'sawtooth', 0.04); }
        }
        // DIVE as the holder = throw the bomb (instead of a lunge)
        const bomb = holderOf(b);
        if (bomb) b.held += dt;
        if (bomb && b.diveT > b.prevDive + 0.001 && b.throwCd <= 0) {
          b.diveT = 0.1; b.proneT = 0.15; b.fatigue = Math.max(0, b.fatigue - 1);
          const d = hyp(b.fx, b.fy) > 0.1 ? norm(b.fx, b.fy) : { x: 1, y: 0 };
          Object.assign(bomb, { state: 'fly', holder: null, thrower: b, x: b.x + d.x * 20, y: b.y + d.y * 20, z: 34, vx: d.x * THROW_SP, vy: d.y * THROW_SP, fly: THROW_T });
          if (b.human) beep(600, 0.08, 'triangle', 0.05);
        }
        b.prevDive = b.diveT;
      }
      // passing by touch (height doesn't matter: jumping won't save you)
      for (const bomb of bombs) {
        if (bomb.state !== 'held') continue;
        const h = bomb.holder;
        for (const o of beans) if (canTag(h, o, t) && hyp(o.x - h.x, o.y - h.y) < R * 2 + 6) { if (give(bomb, o, h, t)) break; }
      }
      // thrown / loose bombs
      for (const bomb of [...bombs]) {
        if (bomb.state === 'fly') {
          bomb.fly -= dt; bomb.x += bomb.vx * dt; bomb.y += bomb.vy * dt; bomb.z = Math.max(0, 34 * (bomb.fly / THROW_T) + 20 * Math.sin(Math.PI * (1 - bomb.fly / THROW_T)));
          const hit = beans.find((o) => canTag(bomb.thrower, o, t) && o !== bomb.thrower && hyp(o.x - bomb.x, o.y - bomb.y) < R + 10);
          if (hit) { if (!give(bomb, hit, bomb.thrower, t)) { bomb.vx *= -0.4; bomb.vy *= -0.4; } else continue; }
          if (O.d(bomb.x, bomb.y) > ringR - 10 || pillars.some((p) => hyp(bomb.x - p.x, bomb.y - p.y) < PILLAR_R + 8)) { bomb.vx *= -0.5; bomb.vy *= -0.5; const a = O.ang(bomb.x, bomb.y); if (O.d(bomb.x, bomb.y) > ringR - 10) { const q = O.pt(a, ringR - 12); bomb.x = q.x; bomb.y = q.y; } }
          if (bomb.fly <= 0) { bomb.state = 'ground'; bomb.ground = 0; bomb.z = 0; }
        } else if (bomb.state === 'ground') {
          bomb.ground += dt;
          const near = beans.find((o) => o.alive && !holderOf(o) && hyp(o.x - bomb.x, o.y - bomb.y) < R + 10 && o.z < 30 && (o !== bomb.thrower || bomb.ground > 0.35));
          if (near) give(bomb, near, near === bomb.thrower ? null : bomb.thrower, t);
          else if (bomb.ground > 1.8 && bomb.thrower && bomb.thrower.alive && !holderOf(bomb.thrower)) { give(bomb, bomb.thrower, null, t); if (bomb.thrower.human) popText(bomb.thrower.x, bomb.thrower.y - 40, 'BOOMERANG!', '#FFB547', 16); }
        }
        if (bomb.state === 'held') { bomb.x = bomb.holder.x; bomb.y = bomb.holder.y; }
      }
      // fuses
      for (const bomb of [...bombs]) {
        bomb.fuse -= dt * (hot ? 1.4 : 1);
        const owner = bomb.state === 'held' ? bomb.holder : bomb.thrower;
        if (owner && owner.human && bomb.fuse < 2 && Math.floor(bomb.fuse * 4) !== Math.floor((bomb.fuse + dt) * 4)) beep(900, 0.04, 'square', 0.04);
        if (bomb.fuse <= 0 || !owner || !owner.alive) explode(bomb, t);
      }
      for (const k of booms) k.t -= dt; booms = booms.filter((k) => k.t > 0);
    },
    botInput(b, t) {
      const mine = holderOf(b);
      let x = 0, y = 0, dive = false;
      if (mine) {
        // chase the nearest rival we're allowed to tag; throw when they're lined up at range or time is short
        let tgt = null, bd = 1e9;
        // pick the easiest victim: close, pinned against the wall, or standing still (good holders read this)
        for (const o of beans) if (canTag(b, o, t)) {
          const d = hyp(o.x - b.x, o.y - b.y), pinned = clamp((O.d(o.x, o.y) - ringR * 0.6) / (ringR * 0.4), 0, 1), slow = hyp(o.vx, o.vy) < 60 ? 1 : 0;
          const score = d - b.skill * (pinned * 160 + slow * 90);
          if (score < bd) { bd = score; tgt = o; }
        }
        if (tgt) {
          const lead = 0.25 + 0.2 * b.skill, px = tgt.x + tgt.vx * lead, py = tgt.y + tgt.vy * lead, d = norm(px - b.x, py - b.y);
          x = d.x; y = d.y;
          const dist = hyp(px - b.x, py - b.y), facing = b.fx * d.x + b.fy * d.y;
          if (b.throwCd <= 0 && b.diveCd <= 0 && facing > 0.92 && dist > 70 && dist < 200 && !pillars.some((p) => segDist(p.x, p.y, b.x, b.y, px, py) < PILLAR_R + 10) && Math.random() < (mine.fuse < 1.6 ? 0.2 : 0.035) * (0.5 + b.skill)) dive = true;
        }
      } else {
        // run from bombs (held ones and loose ones), keep off the walls, use the pillars
        for (const k of bombs) {
          const hx = k.state === 'held' ? k.holder.x : k.x, hy = k.state === 'held' ? k.holder.y : k.y, d = Math.max(20, hyp(b.x - hx, b.y - hy));
          const w = (k.state === 'held' ? 1 : 0.6) * (k.fuse < 2 ? 1.6 : 1) * 9000 / (d * d);
          const n = norm(b.x - hx, b.y - hy); x += n.x * w; y += n.y * w;
          // sidestep a holder coming straight at us
          if (k.state === 'held' && d < 110 && Math.random() < b.skill) { x += -n.y * w * 0.9 * (b.i % 2 ? 1 : -1); y += n.x * w * 0.9 * (b.i % 2 ? 1 : -1); }
        }
        const r = O.d(b.x, b.y);
        if (r > ringR * 0.62) { const n = norm(C.x - b.x, C.y - b.y), w = (r - ringR * 0.62) / (ringR * 0.38) * 1.6; x += n.x * w; y += n.y * w; }
        for (const p of pillars) { const d = hyp(b.x - p.x, b.y - p.y); if (d < PILLAR_R + 40) { const n = norm(b.x - p.x, b.y - p.y); x += n.x * 0.6; y += n.y * 0.6; } }
        if (!bombs.length) { const n = norm(C.x - b.x + Math.sin(t + b.i) * 60, C.y - b.y); x = n.x * 0.3; y = n.y * 0.3; }
      }
      const d = hyp(x, y) > 0.05 ? norm(x, y) : { x: 0, y: 0 };
      return { x: d.x, y: d.y, jump: false, dive };
    },
    draw(t) {
      // boiler-room floor: riveted steel disc with a hazard-striped rim, stretched into the oval stage
      O.stretch(() => {
        platformCircle(C.x, C.y, ringR + 16, '#3a2a44', '#1d1426', 22);
        ctx.fillStyle = mat('metal'); ctx.beginPath(); ctx.arc(C.x, C.y, ringR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hot ? `rgba(255,90,40,${0.18 + 0.06 * Math.sin(t * 6)})` : 'rgba(40,20,60,.35)'; ctx.beginPath(); ctx.arc(C.x, C.y, ringR, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 26; ctx.strokeStyle = `rgba(255,120,60,${0.22 + 0.08 * Math.sin(t * 5)})`; ctx.beginPath(); ctx.arc(C.x, C.y, ringR - 10, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 12; ctx.setLineDash([20, 20]); ctx.strokeStyle = '#FFD95B'; ctx.beginPath(); ctx.arc(C.x, C.y, ringR + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.lineDashOffset = 20; ctx.strokeStyle = '#1b1d33'; ctx.stroke(); ctx.lineDashOffset = 0; ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2; for (const r of [70, 150]) { ctx.beginPath(); ctx.arc(C.x, C.y, r, 0, Math.PI * 2); ctx.stroke(); }
        if (hot && ringR < R0 - 2) { ctx.fillStyle = 'rgba(255,80,40,.25)'; ctx.beginPath(); ctx.arc(C.x, C.y, R0, 0, Math.PI * 2); ctx.arc(C.x, C.y, ringR + 16, 0, Math.PI * 2, true); ctx.fill(); }
      });
      bigLabel('FUSE FRENZY', C.x, C.y + 6, 'rgba(255,255,255,.08)', 34);
      for (const k of booms) { const e = 1 - k.t / 0.7; ctx.fillStyle = `rgba(20,10,20,${0.5 * k.t})`; ctx.beginPath(); ctx.ellipse(k.x, k.y, 40 + e * 30, 22 + e * 16, 0, 0, Math.PI * 2); ctx.fill(); }
      const ups = [];
      // steel pillars
      for (const p of pillars) { contactShadow(p.x, p.y + 6, 34, 16, 0.45); ups.push({ y: p.y, draw: () => billboard(p.x, p.y, 0, () => { box(PILLAR_R * 2, PILLAR_R * 2, 62, '#c9cfe8', '#6b7194', { r: 6 }); ctx.fillStyle = '#FFD95B'; for (let k = 0; k < 3; k++) { ctx.fillRect(-PILLAR_R + 2 + k * 16, -54, 8, 8); } }) }); }
      // bombs: on a holder's head, flying, or lying on the floor
      const bombArt = (k) => {
        const f = clamp(k.fuse / k.max, 0, 1), urgent = k.fuse < 2, pulse = urgent ? 1 + 0.12 * Math.sin(t * 30) : 1;
        ctx.save(); ctx.scale(pulse, pulse);
        glow(urgent ? '#FF557D' : '#FFB547', urgent ? 18 : 10, () => { ctx.fillStyle = '#1b1d33'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-4, -4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a2703f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(4, -11); ctx.quadraticCurveTo(10, -18, 8, -22); ctx.stroke();
        glow('#FFD95B', 12, () => { ctx.fillStyle = Math.sin(t * 40) > 0 ? '#FFD95B' : '#fff'; ctx.beginPath(); ctx.arc(8, -23, 3.5, 0, Math.PI * 2); ctx.fill(); });
        // fuse ring: how much time is left
        ctx.strokeStyle = urgent ? '#FF557D' : '#FFD95B'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, 0, 19, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.stroke();
        ctx.restore();
      };
      for (const k of bombs) {
        if (k.state === 'held') {
          const h = k.holder;
          ctx.fillStyle = `rgba(255,85,125,${0.18 + 0.1 * Math.sin(t * (k.fuse < 2 ? 20 : 6))})`; ctx.beginPath(); ctx.ellipse(h.x, h.y + 4, 34, 18, 0, 0, Math.PI * 2); ctx.fill();
          ups.push({ y: h.y + 0.03, draw: () => billboard(h.x, h.y, h.z + 66, () => bombArt(k)) });
        } else {
          contactShadow(k.x, k.y + 4, 16, 8, 0.45);
          if (k.state === 'ground') { ctx.strokeStyle = `rgba(255,181,71,${0.5 + 0.3 * Math.sin(t * 12)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(k.x, k.y + 2, 26, 14, 0, 0, Math.PI * 2); ctx.stroke(); }
          ups.push({ y: k.y, draw: () => billboard(k.x, k.y, 14 + k.z, () => bombArt(k)) });
        }
      }
      drawAll(beans, ups);
      inScreen(() => { const n = beans.filter((b) => b.alive).length; ctx.font = '12px Bungee, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText(`${n} STANDING`, W - 16, H - 92); });
    },
    winner(t, to) { return survivalWinner(beans, t, to, (b) => -b.held); },
  };
})();
