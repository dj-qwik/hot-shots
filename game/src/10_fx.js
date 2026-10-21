// ───────────────────────── FX: particles, pop text, shake, ambience ─────────────────────────
const REDUCED = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
const fx = { parts: [], texts: [], amb: [], shake: 0 };
const FX_CAP = 420;
function part(p) { if (fx.parts.length < FX_CAP) fx.parts.push(Object.assign({ vx: 0, vy: 0, g: 0, drag: 2.5, size: 5, grow: 0, life: 0.5, rot: 0, vr: 0, kind: 'dot', color: '#fff', alpha: 1 }, p, { max: p.life ?? 0.5 })); }
function puff(x, y, n, color = 'rgba(255,255,255,.75)', spd = 70, size = 6, life = 0.45) {
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(0.3, 1) * spd; part({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - 10, size: size * rnd(0.6, 1.2), grow: size * 1.4, life: life * rnd(0.7, 1.2), color, kind: 'puff', drag: 4 }); }
}
function sparks(x, y, n, colors, spd = 260, life = 0.5) {
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(0.4, 1) * spd; part({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rnd(2, 4), life: life * rnd(0.6, 1.1), color: colors[(Math.random() * colors.length) | 0], kind: 'spark', drag: 3 }); }
}
function confetti(x, y, n, spread = 320) {
  const cols = ['#FF557D', '#37D8E9', '#FFD95B', '#8F75FF', '#7EE2B8', '#FFB547'];
  for (let i = 0; i < n; i++) { const a = rnd(-Math.PI, 0), s = rnd(0.3, 1) * spread; part({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, g: 520, size: rnd(4, 7), life: rnd(1.1, 1.9), color: cols[(Math.random() * cols.length) | 0], kind: 'confetti', rot: rnd(0, 6), vr: rnd(-12, 12), drag: 1.2 }); }
}
function ring(x, y, color, r0 = 6, r1 = 46, life = 0.35, w = 4) { part({ x, y, size: r0, grow: (r1 - r0) / life, life, color, kind: 'ring', drag: 0, w }); }
function popText(x, y, text, color = '#fff', size = 22) { if (fx.texts.length < 40) fx.texts.push({ x, y, text, color, size, life: 0.9, max: 0.9 }); }
function shake(a) { if (!REDUCED) fx.shake = Math.max(fx.shake, a); }

// event hooks (called from movement/collision code)
function fxStep(b) { part({ x: b.x - b.fx * 8 + rnd(-4, 4), y: b.y + 3, vx: -b.vx * 0.1, vy: -6, size: 3, grow: 9, life: 0.32, color: 'rgba(255,255,255,.35)', kind: 'puff', drag: 5 }); }
function fxLand(b) { if (b.human) SFX.land(); puff(b.x, b.y + 4, 6, 'rgba(255,255,255,.6)', 90, 5, 0.35); }
function fxDive(b) {
  puff(b.x, b.y + 4, 5, 'rgba(255,255,255,.65)', 60, 6, 0.4);
  for (let i = 0; i < 6; i++) part({ x: b.x - b.fx * i * 7, y: b.y - 10 - b.fy * i * 7, vx: -b.fx * 40, vy: -b.fy * 40, size: 5 - i * 0.6, life: 0.25, color: b.color, alpha: 0.5, kind: 'dot', drag: 6 });
  if (b.fatigue >= 1.5) popText(b.x, b.y - 46, 'DIZZY', '#FFD95B', 13);
}
function fxTackle(att, vic) { hype(0.15); vic.scaredT = 0.6;
  const x = (att.x + vic.x) / 2, y = (att.y + vic.y) / 2 - 12;
  sparks(x, y, 14, ['#FFD95B', '#fff', att.color], 280, 0.4); ring(x, y, '#fff', 4, 40, 0.25, 5);
  popText(x, y - 18, ['BONK!', 'WHAM!', 'POW!', 'BOOP!'][(Math.random() * 4) | 0], '#FFD95B', 20);
  if (att.human || vic.human) shake(7);
}
function fxOut(b) { hype(0.55); if (b.human) SFX.out(); else { tone(420, 0.25, 'sawtooth', 0.025, 120); crowdRoar(0.35); } feed(`${b.human ? 'You are' : b.name + ' is'} out`, b.color);
  puff(b.x, b.y - 10, 12, b.color, 140, 9, 0.6); sparks(b.x, b.y - 10, 10, ['#fff', b.color], 220, 0.5);
  popText(b.x, b.y - 40, b.human ? 'YOU\'RE OUT!' : 'OUT!', '#FF557D', b.human ? 26 : 18);
  if (b.human) shake(10);
}
function fxScore(b, label) { b.happyT = 1.2; hype(0.18); if (b.human) SFX.score(); else tone(990, 0.08, 'triangle', 0.025); sparks(b.x, b.y - 26, 10, ['#FFD95B', '#7EE2B8', '#fff'], 180, 0.5); popText(b.x, b.y - 48, label, b.human ? '#FFD95B' : '#fff', b.human ? 22 : 16); }
function fxWin(b) { hype(1.2); b.cheerT = 3.5; b.happyT = 3.5; confetti(b.x, b.y - 30, 70, 380); ring(b.x, b.y - 10, b.color, 10, 120, 0.6, 6); }

function stepFx(dt) {
  for (const p of fx.parts) {
    p.life -= dt; const d = Math.exp(-p.drag * dt);
    p.vx *= d; p.vy = p.vy * d + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.size += p.grow * dt; p.rot += p.vr * dt;
  }
  fx.parts = fx.parts.filter((p) => p.life > 0);
  for (const t of fx.texts) { t.life -= dt; t.y -= 38 * dt; }
  fx.texts = fx.texts.filter((t) => t.life > 0);
  fx.shake *= Math.exp(-9 * dt); if (fx.shake < 0.2) fx.shake = 0;
}
function drawFx() {
  for (const p of fx.parts) {
    const a = clamp(p.life / p.max, 0, 1) * p.alpha;
    ctx.globalAlpha = p.kind === 'confetti' ? Math.min(1, a * 2) : a;
    if (p.kind === 'ring') { ctx.strokeStyle = p.color; ctx.lineWidth = p.w * a + 0.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke(); }
    else if (p.kind === 'confetti') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * Math.abs(Math.cos(p.rot * 1.7)) + 1); ctx.restore(); }
    else if (p.kind === 'spark') { ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke(); ctx.lineCap = 'butt'; }
    else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // pop text is drawn upright at its projected position
  for (const t of fx.texts) {
    const k = 1 - t.life / t.max, sc = k < 0.15 ? 0.6 + k / 0.15 * 0.55 : 1.15 - Math.min(0.15, (k - 0.15) * 0.6);
    billboard(t.x, t.y, 0, () => {
      ctx.globalAlpha = clamp(t.life / 0.3, 0, 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(t.size * sc)}px Bungee, Impact, sans-serif`;
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(10,12,34,.9)'; ctx.lineJoin = 'round'; ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color; ctx.fillText(t.text, 0, 0);
    });
  }
  ctx.globalAlpha = 1;
}

// ───────────────────────── ANNOUNCER + KILL FEED (screen space) ─────────────────────────
const ANN = { queue: [], cur: null, feed: [] };
function announce(text, color = '#FFD95B', sub = '') { if (ANN.queue.length < 4) ANN.queue.push({ text, color, sub, life: 1.7, max: 1.7 }); }
function feed(text, color = '#fff') { ANN.feed.unshift({ text, color, life: 3.5 }); ANN.feed.length = Math.min(ANN.feed.length, 5); }
function stepAnnouncer(dt) {
  if (!ANN.cur && ANN.queue.length) { ANN.cur = ANN.queue.shift(); tone(988, 0.1, 'triangle', 0.05); tone(1318, 0.16, 'triangle', 0.05, null, 0.08); }
  if (ANN.cur && (ANN.cur.life -= dt) <= 0) ANN.cur = null;
  for (const f of ANN.feed) f.life -= dt; ANN.feed = ANN.feed.filter((f) => f.life > 0);
}
function drawAnnouncer() {
  const a = ANN.cur;
  if (a) {
    const k = 1 - a.life / a.max, sc = k < 0.12 ? 0.5 + (k / 0.12) * 0.7 : k > 0.85 ? 1.2 - (k - 0.85) * 4 : 1.2 - Math.min(0.2, (k - 0.12));
    ctx.save(); ctx.translate(W / 2, 168); ctx.scale(sc, sc); ctx.globalAlpha = clamp(a.life / 0.25, 0, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '46px Bungee, Impact, sans-serif'; ctx.lineJoin = 'round';
    ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(10,12,34,.92)'; ctx.strokeText(a.text, 0, 0);
    glow(a.color, 18, () => { ctx.fillStyle = a.color; ctx.fillText(a.text, 0, 0); });
    if (a.sub) { ctx.font = '700 17px "Baloo 2", sans-serif'; ctx.lineWidth = 5; ctx.strokeText(a.sub, 0, 34); ctx.fillStyle = '#fff'; ctx.fillText(a.sub, 0, 34); }
    ctx.restore();
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = '700 13px "Baloo 2", sans-serif';
  ANN.feed.forEach((f, i) => {
    const y = H - 92 - i * 24, a2 = clamp(f.life / 0.5, 0, 1);
    ctx.globalAlpha = a2; ctx.fillStyle = 'rgba(10,12,34,.72)'; const w = ctx.measureText(f.text).width + 30;
    roundRect(W - 14 - w, y - 10, w, 20, 10); ctx.fill();
    ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(W - 14 - w + 11, y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(f.text, W - 22, y + 1);
  });
  ctx.globalAlpha = 1;
}

// Ambient screen-space atmosphere per arena (snow, stars, bubbles, confetti, embers, leaves)
function stepAmbient(kind, dt) {
  if (REDUCED || !kind) { fx.amb.length = 0; return; }
  const want = { snow: 70, stars: 50, bubbles: 28, confetti: 40, embers: 45, sparkle: 35, rain: 90 }[kind] || 0;
  while (fx.amb.length < want) fx.amb.push({ x: rnd(0, W), y: rnd(-H, H), s: rnd(0.5, 1), ph: rnd(0, 6), c: ['#FF557D', '#37D8E9', '#FFD95B', '#8F75FF', '#7EE2B8'][(Math.random() * 5) | 0] });
  if (fx.amb.length > want) fx.amb.length = want;
  for (const a of fx.amb) {
    a.ph += dt;
    if (kind === 'snow') { a.y += 30 * a.s * dt; a.x += Math.sin(a.ph) * 12 * dt; }
    else if (kind === 'rain') { a.y += 520 * a.s * dt; a.x += 90 * dt; }
    else if (kind === 'bubbles') { a.y -= 26 * a.s * dt; a.x += Math.sin(a.ph * 1.3) * 10 * dt; }
    else if (kind === 'embers') { a.y -= 40 * a.s * dt; a.x += Math.sin(a.ph * 2) * 18 * dt; }
    else if (kind === 'confetti') { a.y += 45 * a.s * dt; a.x += Math.sin(a.ph * 2) * 20 * dt; }
    if (a.y > H + 10) { a.y = -10; a.x = rnd(0, W); } if (a.y < -10) { a.y = H + 10; a.x = rnd(0, W); } if (a.x > W + 10) a.x = -10;
  }
}
function drawAmbient(kind) {
  if (!kind) return;
  for (const a of fx.amb) {
    if (kind === 'snow') { ctx.fillStyle = `rgba(255,255,255,${0.35 + a.s * 0.4})`; ctx.beginPath(); ctx.arc(a.x, a.y, 1.5 + a.s * 2, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'rain') { ctx.strokeStyle = 'rgba(170,200,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x - 5, a.y - 16 * a.s); ctx.stroke(); }
    else if (kind === 'stars' || kind === 'sparkle') { const tw = 0.4 + 0.6 * Math.abs(Math.sin(a.ph * 2)); ctx.fillStyle = kind === 'stars' ? `rgba(255,255,255,${tw * 0.7})` : `rgba(255,217,91,${tw * 0.6})`; SHAPES['✦'](a.x, a.y, 2 + a.s * 3 * tw); }
    else if (kind === 'bubbles') { ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(a.x, a.y, 3 + a.s * 6, 0, Math.PI * 2); ctx.stroke(); }
    else if (kind === 'embers') { ctx.fillStyle = `rgba(255,${140 + a.s * 80},60,${0.4 + 0.4 * Math.sin(a.ph * 3)})`; ctx.beginPath(); ctx.arc(a.x, a.y, 1.5 + a.s * 1.5, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === 'confetti') { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ph * 3); ctx.fillStyle = a.c; ctx.globalAlpha = 0.6; ctx.fillRect(-3, -1.5, 6, 3); ctx.restore(); ctx.globalAlpha = 1; }
  }
}
function vignette(strength = 0.42) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(8,10,30,0)'); g.addColorStop(1, `rgba(8,10,30,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ───────────────────────── bean art: hats & eyes ─────────────────────────
// Each seat has its own hat so beans read by silhouette and number, not colour alone. Origin = body centre.
function drawHat(i, ry, b, t, back = false) {
  const top = -ry + 1.5;
  const shadeFill = (c, x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, shade(c, 1.3)); g.addColorStop(1, shade(c, 0.7)); return g; };
  ctx.save();
  switch (i % 8) {
    case 0: { // party cone with stripes + pompom
      ctx.fillStyle = shadeFill('#FFD95B', -8, top - 18, 8, top); ctx.beginPath(); ctx.moveTo(-9, top + 3); ctx.lineTo(9, top + 3); ctx.lineTo(1, top - 19); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.clip(); ctx.strokeStyle = '#FF557D'; ctx.lineWidth = 3; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-12, top - k * 6); ctx.lineTo(12, top - k * 6 - 5); ctx.stroke(); } ctx.restore();
      ctx.strokeStyle = 'rgba(80,50,0,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, top + 3); ctx.lineTo(1, top - 19); ctx.lineTo(9, top + 3); ctx.stroke();
      ctx.fillStyle = shadeFill('#37D8E9', -3, top - 23, 3, top - 17); ctx.beginPath(); ctx.arc(1, top - 20, 3.8, 0, Math.PI * 2); ctx.fill(); break; }
    case 1: { // knit beanie + pompom
      ctx.fillStyle = shadeFill('#3a4aa0', 0, top - 8, 0, top + 4); ctx.beginPath(); ctx.ellipse(0, top + 3, 12.5, 9.5, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; for (let x = -9; x <= 9; x += 3) { ctx.beginPath(); ctx.moveTo(x, top + 2); ctx.lineTo(x * 0.8, top - 5); ctx.stroke(); }
      ctx.fillStyle = shadeFill('#FFD95B', 0, top, 0, top + 5); roundRect(-12.5, top, 25, 5, 2.5); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, top - 8, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(160,170,210,.5)'; ctx.beginPath(); ctx.arc(1.2, top - 7, 2.6, 0, Math.PI * 2); ctx.fill(); break; }
    case 2: { // springy antenna
      const sw = Math.sin(t * 6 + i) * 4;
      ctx.strokeStyle = '#1b2347'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, top + 2); ctx.quadraticCurveTo(-4 + sw * 0.6, top - 9, sw, top - 17); ctx.stroke();
      ctx.save(); ctx.translate(sw, top - 18); sphere(4.2, '#FF557D'); ctx.restore(); break; }
    case 3: { // propeller cap
      ctx.fillStyle = shadeFill('#FF557D', 0, top - 6, 0, top + 3); ctx.beginPath(); ctx.ellipse(0, top + 3, 11, 7.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = shadeFill('#37D8E9', 0, top - 1, 0, top + 4); ctx.beginPath(); ctx.ellipse(back ? 0 : 5, top + 3, 9, 2.5, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#9aa3c7'; ctx.fillRect(-1, top - 8, 2, 7);
      const w = Math.cos(t * 24 + i) * 12; ctx.fillStyle = 'rgba(255,217,91,.9)'; ctx.beginPath(); ctx.ellipse(0, top - 8.5, Math.abs(w) + 1.5, 2.4, 0, 0, Math.PI * 2); ctx.fill(); break; }
    case 4: { // satin bow
      for (const s of [-1, 1]) { ctx.fillStyle = shadeFill('#FF7FC0', s * 2, top - 6, s * 10, top + 6); ctx.beginPath(); ctx.moveTo(0, top + 1); ctx.quadraticCurveTo(s * 6, top - 9, s * 11, top - 4); ctx.quadraticCurveTo(s * 12, top + 5, 0, top + 1); ctx.fill(); }
      ctx.fillStyle = shadeFill('#ff4fa3', 0, top - 3, 0, top + 4); ctx.beginPath(); ctx.arc(0, top + 1, 3.2, 0, Math.PI * 2); ctx.fill(); break; }
    case 5: { // little horns
      for (const s of [-1, 1]) { ctx.fillStyle = shadeFill('#fff1d6', s * 4, top + 4, s * 9, top - 9); ctx.beginPath(); ctx.moveTo(s * 4, top + 5); ctx.quadraticCurveTo(s * 12, top - 1, s * 9.5, top - 10); ctx.lineTo(s * 8, top + 5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(120,90,40,.4)'; ctx.lineWidth = 1; ctx.stroke(); }
      break; }
    case 6: { // headphones
      ctx.strokeStyle = '#1b2347'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(0, top + 9, 14, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      for (const s of [-1, 1]) { ctx.fillStyle = shadeFill('#7EE2B8', s * 13, top + 5, s * 13, top + 17); roundRect(s > 0 ? 10 : -17, top + 4, 7, 12, 3.5); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(s > 0 ? 12 : -15, top + 6, 1.5, 7); }
      break; }
    default: { // top hat with band
      ctx.fillStyle = '#141a3a'; ctx.beginPath(); ctx.ellipse(0, top + 2.5, 13, 3.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shadeFill('#25305d', -8, 0, 8, 0); roundRect(-8, top - 13, 16, 15.5, 2); ctx.fill();
      ctx.fillStyle = '#FF557D'; ctx.fillRect(-8, top - 2.5, 16, 3.2);
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(-6, top - 12, 2, 9); }
  }
  ctx.restore();
}
function drawEyes(b, vx, vy, t) {
  const dizzy = b.stun > 0 || b.fatigue >= 1.6, dead = !b.alive;
  const happy = (b.happyT > 0 || b.cheerT > 0) && !dizzy;
  const scared = !dead && !happy && (b.z > 48 || b.scaredT > 0);
  const side = Math.abs(b.fx) > 0.25 ? Math.sign(b.fx) : 0;
  const px = side * 1.6, py = b.fy * 1.1;
  for (const s of [-1, 1]) {
    const ex = vx + s * 4.4, ey = vy;
    ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
    if (dead) { ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(ex - 2.2, ey - 2.2); ctx.lineTo(ex + 2.2, ey + 2.2); ctx.moveTo(ex + 2.2, ey - 2.2); ctx.lineTo(ex - 2.2, ey + 2.2); ctx.stroke(); continue; }
    if (dizzy) { ctx.lineWidth = 1.3; ctx.beginPath(); for (let a = 0; a < 9; a += 0.4) { const r = a * 0.34; ctx.lineTo(ex + Math.cos(a + t * 10 * s) * r, ey + Math.sin(a + t * 10 * s) * r); } ctx.stroke(); continue; }
    if (happy) { ctx.lineWidth = 1.9; ctx.beginPath(); ctx.arc(ex, ey + 1.6, 2.7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); continue; }
    if (b.blink < 0) { ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(ex - 2.5, ey); ctx.lineTo(ex + 2.5, ey); ctx.stroke(); continue; }
    const er = scared ? 3.6 : 3.1;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, er * 0.92, er * 1.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b0f28'; ctx.beginPath(); ctx.arc(ex + px * (scared ? 0.3 : 1), ey + py, scared ? 1.1 : 1.75, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + px - 0.7, ey + py - 0.8, 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineCap = 'butt';
}
