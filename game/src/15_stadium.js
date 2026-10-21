// ───────────────────────── STADIUM: the TV-show set around every arena ─────────────────────────
// Screen-space backdrop drawn before the world: dome, truss lights, jumbotrons, a crowd that reacts to
// hype (eliminations, scores, wins), and an LED ribbon. stageFloor() paints the floor around the arena
// in world space. Each arena passes a THEME (see themes below or make your own).
const STADIUM = { hype: 0, crowd: [], built: false, ribbon: 'HOT SHOTS' };
function hype(a) { STADIUM.hype = Math.min(1.5, STADIUM.hype + a); }
const THEMES = {
  night: { top: '#0b0d2a', bottom: '#1d2257', accent: '#37D8E9', light: '#9fe8ff', floor: 'tile', floorTint: 'rgba(12,14,40,.72)' },
  neon: { top: '#0a0620', bottom: '#2a0f45', accent: '#E85BD9', light: '#ff9cf0', floor: 'neon', floorTint: 'rgba(10,6,30,.35)' },
  sunset: { top: '#2a1240', bottom: '#7a2f55', accent: '#FFB547', light: '#ffd9a0', floor: 'asphalt', floorTint: 'rgba(40,20,50,.45)' },
  arctic: { top: '#0c2140', bottom: '#2c5a86', accent: '#9fe8ff', light: '#e6f8ff', floor: 'water', floorTint: 'rgba(10,40,70,.25)' },
  candy: { top: '#3a1650', bottom: '#8a3f86', accent: '#FF8FC2', light: '#ffe0f0', floor: 'carpet', floorTint: 'rgba(40,10,50,.35)' },
  space: { top: '#04051a', bottom: '#151a4a', accent: '#8F75FF', light: '#c9bdff', floor: 'neon', floorTint: 'rgba(5,6,26,.5)' },
  fire: { top: '#1a0608', bottom: '#4a1414', accent: '#FF7A3D', light: '#ffc58f', floor: 'stone', floorTint: 'rgba(30,8,10,.55)' },
  meadow: { top: '#123a5a', bottom: '#3f8fb0', accent: '#7EE2B8', light: '#ffffff', floor: 'grass', floorTint: 'rgba(0,30,10,.15)' },
};
function buildStadium() {
  const cols = ['#FF557D', '#37D8E9', '#A8E24A', '#8F75FF', '#FFB547', '#E85BD9', '#2EC4B6', '#4C7DFF', '#ffffff'];
  srand(99);
  for (let r = 0; r < 5; r++) {
    const sc = 0.45 + r * 0.12, c = makeCanvas(W, 40), g = c.getContext('2d');
    for (let x = 6 + (r % 2) * 7; x < W; x += 15 * sc + 6) {
      if (prand() < 0.07) continue;
      const col = cols[(prand() * cols.length) | 0], y = 34 - prand() * 3;
      g.fillStyle = col; g.globalAlpha = 0.55 + r * 0.09;
      g.beginPath(); g.ellipse(x, y - 9 * sc, 7 * sc, 10 * sc, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#10142e'; g.fillRect(x - 4.5 * sc, y - 15 * sc, 9 * sc, 5 * sc);
      if (prand() < 0.25) { g.fillStyle = col; g.fillRect(x + 6 * sc, y - 22 * sc, 2.5 * sc, 12 * sc); } // waving arm
      if (prand() < 0.08) { g.fillStyle = ['#FFD95B', '#fff'][(prand() * 2) | 0]; g.fillRect(x - 10 * sc, y - 34 * sc, 20 * sc, 9 * sc); } // sign
    }
    STADIUM.crowd.push({ c, phase: prand() * 6, y: 18 + r * 15 });
  }
  STADIUM.built = true;
}
function drawStadium(theme, t, title = '') {
  const th = THEMES[theme] || THEMES.night;
  if (!STADIUM.built) buildStadium();
  STADIUM.hype = Math.max(0, STADIUM.hype - 0.012);
  // dome + sky
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.top); g.addColorStop(0.55, th.bottom); g.addColorStop(1, th.top);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // roof truss arches
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 3;
  for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(W / 2, 170 + k * 10, 640 - k * 40, 190 - k * 12, 0, Math.PI, 0); ctx.stroke(); }
  for (let x = -40; x < W + 40; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(W / 2 + (x - W / 2) * 0.55, 60); ctx.stroke(); }
  ctx.restore();
  // hanging lights with soft halos
  additive(() => {
    for (let k = 0; k < 9; k++) {
      const x = 60 + k * 105, y = 14 + Math.abs(k - 4) * 3, pulse = 0.65 + 0.35 * Math.sin(t * 2 + k);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, 46); rg.addColorStop(0, th.light); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.28 * pulse; ctx.fillStyle = rg; ctx.fillRect(x - 46, y - 46, 92, 92);
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  // jumbotrons
  for (const s of [-1, 1]) {
    const x = W / 2 + s * 330 - 70, y = 8;
    ctx.fillStyle = '#05060f'; roundRect(x - 4, y - 4, 148, 56, 8); ctx.fill();
    const sg = ctx.createLinearGradient(x, y, x, y + 48); sg.addColorStop(0, shade(th.accent, 0.35)); sg.addColorStop(1, '#0a0b1e');
    ctx.fillStyle = sg; roundRect(x, y, 140, 48, 5); ctx.fill();
    ctx.save(); ctx.beginPath(); roundRect(x, y, 140, 48, 5); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let yy = y; yy < y + 48; yy += 3) ctx.fillRect(x, yy, 140, 1);
    ctx.font = '13px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    glow(th.accent, 10, () => { ctx.fillStyle = '#fff'; ctx.fillText(s < 0 ? 'HOT SHOTS' : (title || 'LIVE').toUpperCase().slice(0, 16), x + 70, y + 18); });
    ctx.fillStyle = th.accent; ctx.font = '700 11px "Baloo 2", sans-serif'; ctx.fillText(s < 0 ? 'BEST 2 OF 3' : (Math.sin(t * 3) > 0 ? '● LIVE' : '○ LIVE'), x + 70, y + 35);
    ctx.restore();
  }
  // crowd stands (back rows first), bouncing with hype
  ctx.fillStyle = 'rgba(5,6,18,.55)'; ctx.fillRect(0, 54, W, Y0 - 50);
  for (const [i, row] of STADIUM.crowd.entries()) {
    const bob = -Math.abs(Math.sin(t * (6 + i) + row.phase)) * (1 + STADIUM.hype * 6);
    ctx.drawImage(row.c, 0, 54 + row.y - 18 + bob);
    ctx.fillStyle = 'rgba(5,6,18,.35)'; ctx.fillRect(0, 54 + row.y + 18, W, 3);
  }
  // flash bulbs when hype is high
  if (STADIUM.hype > 0.3 && !REDUCED) for (let k = 0; k < 3; k++) if (Math.random() < STADIUM.hype * 0.25) { const x = rnd(20, W - 20), y = rnd(64, Y0 - 16); additive(() => { const rg = ctx.createRadialGradient(x, y, 0, x, y, 12); rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = rg; ctx.fillRect(x - 12, y - 12, 24, 24); }); }
  // LED ribbon board
  const ry = Y0 - 18;
  ctx.fillStyle = '#05060f'; ctx.fillRect(0, ry, W, 16);
  ctx.save(); ctx.beginPath(); ctx.rect(0, ry, W, 16); ctx.clip();
  ctx.font = '11px Bungee, Impact, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const msg = `  ★  HOT SHOTS  ★  ${(title || '').toUpperCase()}  ★  BEST 2 OF 3  ★  ROBINHOOD CHAIN  `;
  const mw = msg.length * 8.6, off = -((t * 70) % mw);
  ctx.fillStyle = th.accent; for (let x = off; x < W; x += mw) ctx.fillText(msg, x, ry + 8.5);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 0; x < W; x += 3) ctx.fillRect(x, ry, 1, 16);
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, ry + 16, W, 1);
}
// Floor around the arena, in WORLD space. Covers everything the tilted camera can see.
function stageFloor(theme, extra = 400) {
  const th = THEMES[theme] || THEMES.night;
  const y0 = CAM.scrollY - 6, y1 = CAM.scrollY + H / TILT + 60; // starts right under the LED board
  ctx.fillStyle = mat(th.floor); ctx.fillRect(-extra, y0, W + extra * 2, y1 - y0);
  ctx.fillStyle = th.floorTint; ctx.fillRect(-extra, y0, W + extra * 2, y1 - y0);
  // horizon fade where the floor meets the stands
  const fg = ctx.createLinearGradient(0, y0, 0, y0 + 220); fg.addColorStop(0, 'rgba(5,6,18,.8)'); fg.addColorStop(1, 'rgba(5,6,18,0)');
  ctx.fillStyle = fg; ctx.fillRect(-extra, y0, W + extra * 2, 220);
  grain(-extra, y0, W + extra * 2, y1 - y0, 0.05);
}
// Volumetric light rays + vignette over the finished frame (screen space).
function stageLighting(theme, t) {
  const th = THEMES[theme] || THEMES.night;
  if (!REDUCED) additive(() => {
    for (const s of [-1, 1]) {
      const a = Math.sin(t * 0.5 + (s > 0 ? 2 : 0)) * 0.25;
      ctx.save(); ctx.translate(W / 2 + s * 300, 10); ctx.rotate(a - s * 0.28);
      const lg = ctx.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, hexA(th.light, 0.13)); lg.addColorStop(1, hexA(th.light, 0));
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(150, H); ctx.lineTo(-150, H); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  });
  const v = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.95);
  v.addColorStop(0, 'rgba(4,5,18,0)'); v.addColorStop(1, 'rgba(4,5,18,.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
