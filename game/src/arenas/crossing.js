// 24 · Critter Crossing — a lane-by-lane dash to the finish, built fresh every round from four kinds of strip:
// grass (trees block the way), roads (cars can be hopped, trucks can't), rivers (ride the logs; touch the water
// and you're back on the bank) and railway tracks (lights flash, then a train you can't jump comes through).
// Every vehicle and log moves on a fixed loop, so nothing ever pops in late: what you see coming is what comes.
// Anti-exploit: holding forward gets hit on roads and dunked in rivers; bunny-hopping is useless against
// trucks and trains and lands you in the water; trains knock you back two lanes.
ARENAS.crossing = (() => {
  const L = 160, Rt = 800, LH = 72, LEN = 3000, BASE = LEN - 220, TOP = 300, FINISH = 140, M = 150;
  const P = Rt - L + 2 * M; // loop length for vehicles and logs (they wrap well off the road)
  const CAR_COLS = ['#FFB547', '#8F75FF', '#2EC4B6', '#5ab0ff', '#7EE2B8', '#FF8FC2'];
  let lanes, beans, camY, T, splashes;
  const laneIdx = (y) => Math.round((BASE - y) / LH);
  const laneAt = (y) => { const i = laneIdx(y); return i >= 0 && i < lanes.length && Math.abs(lanes[i].y - y) <= LH / 2 ? lanes[i] : null; };
  const wrap = (v) => ((v % P) + P) % P;
  // position of a mover at time t (pure function: no spawning, no late arrivals)
  const posX = (lane, m, t) => lane.v > 0 ? L - M + wrap(m.o + lane.v * t) : Rt + M - wrap(m.o - lane.v * t);
  function movers(lane, wMin, wMax, gMin, gMax, truckP) {
    const out = []; let cur = rnd(0, P), used = 0;
    for (let k = 0; k < 12; k++) {
      const truck = Math.random() < truckP, w = truck ? rnd(150, 180) : rnd(wMin, wMax), gap = rnd(gMin, gMax);
      if (used + w + gap > P - gMin * 0.6 && out.length) break;
      out.push({ o: wrap(cur + w / 2), w, truck, c: CAR_COLS[(Math.random() * CAR_COLS.length) | 0] });
      cur += w + gap; used += w + gap;
    }
    return out;
  }
  function build() {
    lanes = [];
    let y = BASE, last = 'grass', counts = { road: 0, river: 0, rail: 0 };
    const add = (type, extra = {}) => { lanes.push({ type, y, i: lanes.length, ...extra }); y -= LH; };
    const grass = () => {
      const trees = [], n = (Math.random() * 3.2) | 0;
      for (let k = 0; k < n; k++) for (let tries = 0; tries < 8; tries++) { const x = rnd(L + 50, Rt - 50); if (trees.every((t2) => Math.abs(t2.x - x) > 130)) { trees.push({ x, r: 21, h: rnd(0.85, 1.2) }); break; } }
      add('grass', { trees });
    };
    grass(); grass();
    while (y > TOP + LH * 2) {
      // pick the next strip, never the same kind twice; make sure every round has rivers and a railway
      const room = Math.floor((y - TOP) / LH);
      let pool = ['road', 'road', 'river', 'river', 'rail'].filter((k) => k !== last);
      if (!counts.river && room < 12) pool = ['river']; else if (!counts.rail && room < 7) pool = ['rail'];
      const kind = pool[(Math.random() * pool.length) | 0];
      const p = 1 - (y - TOP) / (BASE - TOP); // 0 at the start → 1 near the finish: things get quicker
      const n = Math.min(room - 1, kind === 'road' ? 2 + ((Math.random() * 3) | 0) : kind === 'river' ? 3 + ((Math.random() * 2) | 0) : 1);
      if (n < 1) break;
      let dir = Math.random() < 0.5 ? 1 : -1;
      for (let k = 0; k < n; k++) {
        if (kind === 'road') {
          const lane = { v: dir * (rnd(105, 165) + p * 75) };
          lane.cars = movers(lane, 78, 104, 140, 300, 0.2);
          add('road', lane);
        } else if (kind === 'river') {
          const lane = { v: dir * (rnd(50, 85) + p * 40) };
          lane.logs = movers(lane, 110, 190, 95, 170, 0);
          add('river', lane);
        } else add('rail', { dir, next: rnd(1.2, 4.5), warn: 0, x: null, len: 640, sp: 1250 });
        if (kind !== 'road' || Math.random() < 0.6) dir = -dir; // rivers always alternate; roads usually do
      }
      counts[kind]++; last = kind;
      grass(); if (Math.random() < 0.35 && y > TOP + LH * 3) grass();
    }
    while (y > TOP - LH) grass();
    // each river remembers the bank you get sent back to
    for (const lane of lanes) if (lane.type === 'river') { let j = lane.i; while (j > 0 && lanes[j].type === 'river') j--; lane.bank = lanes[j]; }
  }
  const logUnder = (lane, x, t, pad = 4) => lane.logs.find((g) => Math.abs(x - posX(lane, g, t)) < g.w / 2 + pad);
  // how long until a car/train covers x in this lane (0 = covered now)
  function clearIn(lane, x, t, trucksOnly) {
    if (lane.type === 'rail') return lane.x != null || lane.warn > 0 ? 0 : Math.max(0, lane.next - 1.3);
    if (lane.type !== 'road') return 9;
    let tmin = 9;
    for (const c of lane.cars) {
      if (trucksOnly && !c.truck) continue;
      const cx = posX(lane, c, t), half = c.w / 2 + R + 10, ahead = (x - cx) * Math.sign(lane.v);
      if (Math.abs(x - cx) < half) return 0;
      if (ahead > 0) tmin = Math.min(tmin, (ahead - half) / Math.abs(lane.v));
    }
    return tmin;
  }
  function knock(b, ky, kx, stun, text) {
    if (shielded(b)) return;
    b.ky = ky; b.kx = kx; b.stun = Math.max(b.stun, stun); b.hitCd = stun + 0.1; b.scaredT = 0.8;
    sparks(b.x, b.y - 14, 8, ['#fff', '#FFD95B', '#FF557D'], 200, 0.35);
    if (b.human) { beep(130, 0.12, 'sawtooth', 0.05); shake(text === 'CHOO CHOO!' ? 7 : 4); popText(b.x, b.y - 36, text, '#FF557D', 18); }
  }

  return {
    cam() { return camY; },
    // power-ups appear on grass a few lanes ahead of the pack
    power: {
      kinds: ['zoom', 'bubble'], every: [4, 6], // no spring: a super jump clears whole rivers
      spot() {
        const ys = beans.filter((b) => b.alive !== false).map((b) => b.y).sort((a, c) => a - c);
        const mid = laneIdx(ys[ys.length >> 1] ?? BASE);
        const opts = lanes.filter((l) => l.type === 'grass' && l.i > mid + 1 && l.i < mid + 7);
        if (!opts.length) return null;
        const l = opts[(Math.random() * opts.length) | 0];
        for (let k = 0; k < 6; k++) { const x = rnd(L + 40, Rt - 40); if (l.trees.every((tr) => Math.abs(tr.x - x) > 50)) return { x, y: l.y }; }
        return null;
      },
    },
    key: 'crossing', name: 'Critter Crossing', genre: 'Sprint', theme: 'meadow', timeout: ROUND_SECONDS, maxSpeed: 235,
    objective: 'Cross to the finish! Hop cars (not trucks), ride the logs across rivers, and when the rail lights flash, wait for the train.',
    init(bs) {
      beans = bs; splashes = []; T = 0; build();
      beans.forEach((b, i) => { b.x = L + 40 + (i + 0.5) * (Rt - L - 80) / beans.length; b.y = LEN - 90; b.fy = -1; b.fx = 0; b.waitT = 0; });
      camY = LEN - 660;
    },
    update(dt, t) {
      T = t;
      for (const lane of lanes) if (lane.type === 'rail') {
        if (lane.x != null) { lane.x += lane.dir * lane.sp * dt; if (Math.abs(lane.x - 480) > (Rt - L) / 2 + lane.len / 2 + 80) { lane.x = null; lane.next = rnd(3.2, 6); } }
        else if ((lane.next -= dt) <= 0) { lane.x = lane.dir > 0 ? L - lane.len / 2 - 60 : Rt + lane.len / 2 + 60; lane.warn = 0; }
        else lane.warn = lane.next < 1.3 ? 1 : 0;
      }
      for (const s of splashes) s.t -= dt; splashes = splashes.filter((s) => s.t > 0);
      for (const b of beans) {
        const lane = laneAt(b.y), air = b.z > 0.5;
        // trees on grass are solid
        if (lane && lane.type === 'grass') for (const tr of lane.trees) {
          const dx = b.x - tr.x, dy = b.y - lane.y, d = hyp(dx, dy), min = tr.r + R;
          if (d < min && d > 0.01) { b.x = tr.x + dx / d * min; b.y = lane.y + dy / d * min; }
        }
        // rivers: ride a log or go for a swim
        if (lane && lane.type === 'river' && (!air || b.touch)) {
          const log = logUnder(lane, b.x, t);
          if (log) { b.x += lane.v * dt; b.zoff = 2; }
          if (!log || b.x < L + R + 1 || b.x > Rt - R - 1) {
            splashes.push({ x: b.x, y: b.y, t: 0.8 });
            puff(b.x, b.y, 10, 'rgba(210,240,255,.9)', 110, 7, 0.5); sparks(b.x, b.y - 8, 8, ['#ffffff', '#9fe8ff'], 200, 0.45);
            if (b.human) { beep(220, 0.18, 'sine', 0.05); popText(b.x, b.y - 32, 'SPLASH!', '#5ab0ff', 20); shake(3); }
            b.y = lane.bank.y + 6; b.vx = b.vy = b.kx = b.ky = 0; b.stun = Math.max(b.stun, 0.9); b.sq = 0.3; b.hitCd = 0.9; b.waitT = 0;
          }
        } else b.zoff = 0;
        b.x = clamp(b.x, L + R, Rt - R); b.y = clamp(b.y, 60, LEN - 40);
        if (b.hitCd > 0) continue;
        // roads and railways (only the lane you're standing in can hit you)
        const hit = laneAt(b.y);
        if (!hit || Math.abs(b.y - hit.y) > LH / 2 - 6) continue;
        if (hit.type === 'road') for (const c of hit.cars) {
          if (b.z > (c.truck ? 90 : 26)) continue;
          if (Math.abs(b.x - posX(hit, c, t)) < c.w / 2 + R - 2) { knock(b, c.truck ? 560 : 480, Math.sign(hit.v) * 280, c.truck ? 0.8 : 0.65, c.truck ? 'TRUCKED!' : 'BONK!'); break; }
        }
        if (hit.type === 'rail' && hit.x != null && Math.abs(b.x - hit.x) < hit.len / 2 + R) knock(b, 760, hit.dir * 420, 1.15, 'CHOO CHOO!');
      }
      camY = followCam(beans, camY, LEN, dt);
    },
    botInput(b, t) {
      let tx = b.x, up = -1, jump = false;
      const i = laneIdx(b.y), here = lanes[i], next = lanes[i + 1];
      const toNext = next ? b.y - next.y : 0;
      if (next && (next.type === 'road' || next.type === 'rail')) {
        // wait at the kerb until the lane ahead is clear long enough to cross it
        const need = (toNext + LH * 0.5) / 210;
        // cars can be hopped, so a good driver only waits for trucks (and trains)
        if (clearIn(next, b.x, t, next.type === 'road' && b.skill > 0.6) < need * (1.35 - b.skill * 0.35) && b.waitT < (next.type === 'rail' ? 9 : 1.6)) {
          b.waitT += 1 / 60;
          if (next.type === 'road') { let best = b.x, bs = -1e9; for (let x = L + 30; x <= Rt - 30; x += 30) { const sc = Math.min(clearIn(next, x, t, b.skill > 0.6), 2) - Math.abs(x - b.x) / 260; if (sc > bs) { bs = sc; best = x; } } tx = best; }
          up = toNext > LH * 0.8 ? -0.3 : 0.25;
        } else if (toNext < LH * 0.6) b.waitT = 0;
      } else if (next && next.type === 'river') {
        // step onto a log only when one will be under us on arrival
        const arrive = Math.max(0.15, (toNext - LH * 0.3) / 220), lead = here && here.type === 'river' ? here.v * arrive : 0;
        const log = logUnder(next, b.x + lead, t + arrive, -10);
        if (!log && toNext < LH * 0.95) {
          up = here && here.type === 'river' ? 0 : 0.2;
          // slide toward the nearest log in the next lane (staying on our own log if we're riding)
          let best = null, bd = 1e9;
          for (const g of next.logs) { const gx = posX(next, g, t + 0.6); if (gx < L + 20 || gx > Rt - 20) continue; const d = Math.abs(gx - b.x); if (d < bd) { bd = d; best = gx; } }
          if (best != null) tx = here && here.type === 'river' ? clamp(best, posX(here, logUnder(here, b.x, t, 30) || { o: 0, w: 0 }, t) - 40, posX(here, logUnder(here, b.x, t, 30) || { o: 0, w: 0 }, t) + 40) : best;
          if (here && here.type === 'river' && !logUnder(here, b.x, t, 30)) tx = b.x;
        }
      } else if (next && next.type === 'grass') {
        // walk around trees
        for (const tr of next.trees) if (Math.abs(tr.x - b.x) < tr.r + R + 8) { tx = tr.x + (b.x < tr.x || tr.x > Rt - 60 ? -1 : 1) * (tr.r + R + 24); if (tr.x < L + 60) tx = tr.x + tr.r + R + 24; break; }
      }
      // on a road: hop a car that's about to hit us
      if (here && here.type === 'road' && here.cars.some((c) => !c.truck && Math.abs(posX(here, c, t + 0.15) - b.x) < c.w / 2 + R + 4) && Math.random() < b.skill) jump = true;
      // riding a log: keep away from its ends
      if (here && here.type === 'river') { const g = logUnder(here, b.x, t, 0); if (g) { const gx = posX(here, g, t); if (Math.abs(b.x - gx) > g.w / 2 - 24) tx = gx; } }
      // never jump toward water you can't land on
      const land = laneAt(b.y - 150);
      if (jump && land && land.type === 'river' && !logUnder(land, b.x, t + 0.6) && Math.random() < b.skill) jump = false;
      const d = norm(clamp((tx - b.x) / 40, -1, 1), up);
      return { x: d.x, y: d.y, jump, dive: false };
    },
    draw(t) {
      const y0 = camY - 10, y1 = camY + 700, ups = [];
      ctx.save(); ctx.beginPath(); ctx.rect(-400, camY - 5, W + 800, 1400); ctx.clip();
      // raised track bed with grassy verges either side
      ctx.fillStyle = 'rgba(10,20,10,.35)'; ctx.fillRect(L - 30, y0, Rt - L + 60, y1 - y0);
      ctx.fillStyle = '#2f5a2a'; ctx.fillRect(L - 18, y0, Rt - L + 36, y1 - y0);
      for (const lane of lanes) {
        if (lane.y < y0 - LH || lane.y > y1 + LH) continue;
        const top = lane.y - LH / 2;
        if (lane.type === 'grass') {
          ctx.fillStyle = mat('grass'); ctx.fillRect(L, top, Rt - L, LH);
          ctx.fillStyle = lane.i % 2 ? 'rgba(160,230,120,.16)' : 'rgba(20,60,20,.12)'; ctx.fillRect(L, top, Rt - L, LH);
          ctx.fillStyle = 'rgba(255,255,255,.18)'; for (let x = L + 24 + (lane.i * 37) % 60; x < Rt - 10; x += 74) { ctx.fillRect(x, lane.y - 10 + (x % 17), 3, 6); ctx.fillRect(x + 5, lane.y - 7 + (x % 17), 3, 4); }
          for (const tr of lane.trees) { contactShadow(tr.x, lane.y + 8, 30, 14, 0.4); ups.push({ y: lane.y, draw: () => billboard(tr.x, lane.y, 0, () => {
            box(12, 12, 16 * tr.h, '#a2703f', '#7a4f29', { r: 2 });
            ctx.translate(0, -16 * tr.h); box(40, 36, 30 * tr.h, '#7EE2B8', '#3f9f5f', { r: 7 });
            ctx.translate(0, -30 * tr.h); box(26, 24, 16 * tr.h, '#a6f0c8', '#57b877', { r: 6 });
          }) }); }
        } else if (lane.type === 'road') {
          ctx.fillStyle = mat('asphalt'); ctx.fillRect(L, top, Rt - L, LH);
          ctx.fillStyle = 'rgba(20,10,40,.3)'; ctx.fillRect(L, top, Rt - L, LH);
          const below = lanes[lane.i - 1], above = lanes[lane.i + 1];
          ctx.fillStyle = '#f4f6ff';
          if (!below || below.type !== 'road') ctx.fillRect(L, top + LH - 3, Rt - L, 3);
          if (!above || above.type !== 'road') ctx.fillRect(L, top, Rt - L, 3);
          else for (let x = L + 10; x < Rt; x += 56) ctx.fillRect(x, top - 1.5, 28, 3); // dashed divider between road lanes
          const dir = Math.sign(lane.v);
          ctx.fillStyle = 'rgba(255,255,255,.14)';
          for (let x = L + 50; x < Rt; x += 140) { ctx.beginPath(); ctx.moveTo(x + dir * 10, lane.y); ctx.lineTo(x - dir * 4, lane.y - 7); ctx.lineTo(x - dir * 4, lane.y + 7); ctx.closePath(); ctx.fill(); }
          for (const c of lane.cars) {
            const cx = posX(lane, c, t);
            if (cx < L - c.w || cx > Rt + c.w) continue;
            lightPool(cx + dir * (c.w / 2 + 30), lane.y, 40, c.truck ? 'rgba(255,90,120,1)' : 'rgba(255,230,150,1)', 0.3);
            contactShadow(cx, lane.y + 6, c.w * 0.62, 22, 0.45);
            ups.push({ y: lane.y + 4, draw: () => { ctx.save(); ctx.beginPath(); ctx.rect(L - 2, camY - 5, Rt - L + 4, 1400); ctx.clip(); billboard(cx, lane.y, 0, () => {
              const h = c.truck ? 44 : 24, body = c.truck ? '#FF557D' : c.c;
              ctx.fillStyle = '#14152a'; for (const wx of c.truck ? [-0.38, -0.12, 0.3] : [-0.3, 0.3]) { ctx.beginPath(); ctx.ellipse(wx * c.w, 12, 9, 6, 0, 0, Math.PI * 2); ctx.fill(); }
              box(c.w, 40, h, shade(body, 1.18), body, { r: c.truck ? 8 : 11 });
              if (c.truck) {
                ctx.fillStyle = shade(body, 0.7); roundRect(dir * c.w * 0.32 - 20, -h - 10, 40, h + 20, 8); ctx.fill();
                ctx.fillStyle = 'rgba(200,240,255,.75)'; roundRect(dir * c.w * 0.32 - 12 + dir * 4, -h - 2, 22, 15, 4); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,.85)'; roundRect(-c.w / 2 + 12 - (dir > 0 ? 0 : -40), -h + 16, c.w - 64, 16, 5); ctx.fill();
                ctx.fillStyle = '#c0306a'; ctx.font = '11px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NO HOP', -dir * 20, -h + 24);
              } else {
                ctx.fillStyle = 'rgba(200,240,255,.8)'; roundRect(dir * c.w * 0.1 - 17, -h - 13, 30, 13, 5); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(dir * c.w * 0.1 - 13, -h - 11, 6, 9);
              }
              glow('#FFE68F', 12, () => { ctx.fillStyle = '#FFF3C2'; ctx.beginPath(); ctx.arc(dir * (c.w / 2 - 5), -h * 0.45, 4, 0, Math.PI * 2); ctx.fill(); });
              ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.arc(-dir * (c.w / 2 - 5), -h * 0.45, 3.2, 0, Math.PI * 2); ctx.fill();
            }); ctx.restore(); } });
          }
        } else if (lane.type === 'river') {
          const wg = ctx.createLinearGradient(0, top, 0, top + LH); wg.addColorStop(0, '#2f8fd6'); wg.addColorStop(1, '#1f5fa8');
          ctx.fillStyle = wg; ctx.fillRect(L, top, Rt - L, LH);
          ctx.fillStyle = mat('water'); ctx.globalAlpha = 0.45; ctx.fillRect(L, top, Rt - L, LH); ctx.globalAlpha = 1;
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
          const fl = wrap(lane.v * t) % 90;
          for (let x = L - 90 + fl; x < Rt; x += 90) { if (x < L) continue; ctx.beginPath(); ctx.moveTo(x, lane.y - 14 + (lane.i % 3) * 9); ctx.quadraticCurveTo(x + 12, lane.y - 20 + (lane.i % 3) * 9, x + 26, lane.y - 14 + (lane.i % 3) * 9); ctx.stroke(); }
          const below = lanes[lane.i - 1];
          if (below && below.type !== 'river') { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(L, top + LH - 3, Rt - L, 3); }
          for (const g of lane.logs) {
            const gx = posX(lane, g, t);
            if (gx < L - g.w || gx > Rt + g.w) continue;
            ctx.save(); ctx.beginPath(); ctx.rect(L, top, Rt - L, LH); ctx.clip();
            ctx.fillStyle = 'rgba(5,20,50,.35)'; roundRect(gx - g.w / 2 + 4, lane.y - 14, g.w, 36, 16); ctx.fill();
            ctx.fillStyle = '#7a4f29'; roundRect(gx - g.w / 2, lane.y - 20 + lift(4), g.w, 38, 17); ctx.fill();
            ctx.fillStyle = mat('wood'); roundRect(gx - g.w / 2, lane.y - 20, g.w, 34, 16); ctx.fill();
            ctx.fillStyle = 'rgba(255,220,170,.25)'; roundRect(gx - g.w / 2 + 8, lane.y - 17, g.w - 16, 7, 4); ctx.fill();
            ctx.fillStyle = '#d9a86a'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(gx + s * (g.w / 2 - 6), lane.y - 3, 6, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#a2703f'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(gx + s * (g.w / 2 - 6), lane.y - 3, 3, 8, 0, 0, Math.PI * 2); ctx.stroke(); }
            ctx.restore();
          }
        } else {
          ctx.fillStyle = mat('stone'); ctx.fillRect(L, top, Rt - L, LH);
          ctx.fillStyle = 'rgba(60,40,30,.35)'; ctx.fillRect(L, top, Rt - L, LH);
          ctx.fillStyle = '#6b4a32'; for (let x = L + 6; x < Rt; x += 26) ctx.fillRect(x, lane.y - 22, 12, 44);
          ctx.fillStyle = mat('metal'); ctx.fillRect(L, lane.y - 16, Rt - L, 5); ctx.fillRect(L, lane.y + 11, Rt - L, 5);
          if (lane.warn || lane.x != null) { ctx.fillStyle = `rgba(255,60,90,${0.12 + 0.12 * Math.sin(t * 18)})`; ctx.fillRect(L, top, Rt - L, LH); }
          for (const sx of [L - 10, Rt + 10]) ups.push({ y: lane.y + LH / 2 - 4, draw: () => billboard(sx, lane.y + LH / 2 - 4, 0, () => {
            ctx.fillStyle = '#ddd'; roundRect(-3, -64, 6, 64, 2); ctx.fill();
            ctx.fillStyle = '#1b1d33'; roundRect(-16, -78, 32, 18, 8); ctx.fill();
            const on = lane.warn || lane.x != null;
            for (const s of [-1, 1]) { const lit = on && (Math.sin(t * 14) > 0) === (s > 0); if (lit) glow('#ff3d5a', 14, () => { ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.arc(s * 8, -69, 5, 0, Math.PI * 2); ctx.fill(); }); else { ctx.fillStyle = '#4a2030'; ctx.beginPath(); ctx.arc(s * 8, -69, 5, 0, Math.PI * 2); ctx.fill(); } }
            ctx.strokeStyle = '#f4f6ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-12, -54); ctx.lineTo(12, -40); ctx.moveTo(12, -54); ctx.lineTo(-12, -40); ctx.stroke();
          }) });
          if (lane.x != null) ups.push({ y: lane.y + 6, draw: () => { ctx.save(); ctx.beginPath(); ctx.rect(L - 2, camY - 5, Rt - L + 4, 1400); ctx.clip(); billboard(lane.x, lane.y, 0, () => {
            const n = 4, cw = lane.len / n;
            for (let k = 0; k < n; k++) {
              const x = -lane.len / 2 + cw * k + cw / 2, engine = lane.dir > 0 ? k === n - 1 : k === 0;
              ctx.save(); ctx.translate(x, 0); box(cw - 8, 46, engine ? 70 : 62, engine ? '#ffd95b' : '#e8eaff', engine ? '#f2a93b' : '#8f75ff', { r: 9 }); ctx.restore();
              ctx.fillStyle = 'rgba(200,240,255,.8)'; for (let wx = -cw / 2 + 16; wx < cw / 2 - 16; wx += 26) { roundRect(x + wx, -50, 16, 14, 3); ctx.fill(); }
            }
            const fx = lane.dir * (lane.len / 2 - 6);
            glow('#FFE68F', 18, () => { ctx.fillStyle = '#FFF3C2'; ctx.beginPath(); ctx.arc(fx, -36, 6, 0, Math.PI * 2); ctx.fill(); });
          }); ctx.restore(); } });
        }
      }
      for (const s of splashes) { const k = 1 - s.t / 0.8; ctx.strokeStyle = `rgba(255,255,255,${s.t})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, 8 + k * 36, 0, Math.PI * 2); ctx.stroke(); }
      // start + finish slabs
      if (y1 > LEN - 200) { platformRect(L, LEN - 180, Rt - L, 150, mat('tile'), '#2f5a2a', 10, 10); bigLabel('START', 480, LEN - 105, 'rgba(255,255,255,.6)', 26); }
      if (y0 < 330) {
        platformRect(L, 40, Rt - L, 160, mat('grass'), '#2f5a2a', 10, 10);
        lightPool(480, 140, 300, 'rgba(126,226,184,1)', 0.35);
        for (let x = L; x < Rt; x += 20) for (let k = 0; k < 2; k++) { ctx.fillStyle = ((x / 20 + k) | 0) % 2 ? '#f4f6ff' : '#111322'; ctx.fillRect(x, 130 + k * 10, 20, 10); }
      }
      ctx.restore();
      if (camY < 300) ups.push({ y: 146, draw: () => billboard(480, 146, 0, () => {
        for (const s of [-1, 1]) { ctx.fillStyle = '#a2703f'; roundRect(s * 316 - 8, -110, 16, 110, 5); ctx.fill(); }
        glow('#7EE2B8', 18, () => { ctx.fillStyle = '#123a33'; roundRect(-320, -134, 640, 30, 10); ctx.fill(); });
        ctx.fillStyle = '#7EE2B8'; ctx.font = '20px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★ FINISH ★', 0, -118);
      }) });
      drawAll(beans, ups);
      progressStrip(beans, LEN, FINISH);
    },
    winner(t, to) { const d = beans.filter((b) => b.y < FINISH).sort((a, b) => a.y - b.y); if (d.length) return d[0]; return to ? [...beans].sort((a, b) => a.y - b.y)[0] : null; },
  };
})();
