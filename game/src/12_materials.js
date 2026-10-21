// ───────────────────────── MATERIALS: procedural textures ─────────────────────────
// Generated once at load into small canvases and used as repeating patterns. Because arenas draw floors
// inside the tilted world transform, patterns foreshorten correctly. Usage:
//   ctx.fillStyle = mat('wood'); ctx.fillRect(...)      // full material
//   grain(x, y, w, h, 0.08)                              // subtle film-grain/noise overlay on any area
// Materials: noise, wood, metal, rubber, ice, grass, asphalt, carpet, neon, tile, sand, plastic, stone,
//            water, lava, cloud, candy, felt
const MATS = {};
let _rand = 1234567;
function srand(seed) { _rand = seed >>> 0 || 1; }
function prand() { _rand ^= _rand << 13; _rand >>>= 0; _rand ^= _rand >> 17; _rand ^= _rand << 5; _rand >>>= 0; return _rand / 4294967296; }
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texture(name, size, paint) {
  const c = makeCanvas(size, size), g = c.getContext('2d');
  srand(name.length * 7919 + size);
  paint(g, size);
  MATS[name] = { canvas: c, pattern: null };
}
function mat(name) {
  const m = MATS[name]; if (!m) return '#888';
  if (!m.pattern) m.pattern = ctx.createPattern(m.canvas, 'repeat');
  return m.pattern;
}
function speckle(g, s, n, colors, rmin = 0.5, rmax = 1.6, alpha = 1) {
  for (let i = 0; i < n; i++) { g.globalAlpha = alpha * (0.4 + prand() * 0.6); g.fillStyle = colors[(prand() * colors.length) | 0]; const r = rmin + prand() * (rmax - rmin); const x = prand() * s, y = prand() * s; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
}
function buildMaterials() {
  texture('noise', 128, (g, s) => { const d = g.createImageData(s, s); for (let i = 0; i < d.data.length; i += 4) { const v = (prand() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); });
  texture('wood', 256, (g, s) => {
    const cols = ['#c98c55', '#bd8049', '#d29760', '#b97a44'];
    for (let y = 0; y < s; y += 32) {
      g.fillStyle = cols[(y / 32) % 4]; g.fillRect(0, y, s, 32);
      for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(90,45,15,${0.08 + prand() * 0.12})`; g.lineWidth = 0.6 + prand() * 1.2; g.beginPath(); const yy = y + 3 + prand() * 26; g.moveTo(0, yy); for (let x = 0; x <= s; x += 16) g.lineTo(x, yy + Math.sin(x * 0.05 + k) * 1.6); g.stroke(); }
      g.fillStyle = 'rgba(60,30,10,.55)'; g.fillRect(0, y + 31, s, 1.5);
      const off = ((y / 32) % 2) * 128 + 40; g.fillRect(off, y, 1.5, 32);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y + 1, s, 2);
      if (prand() < 0.6) { g.fillStyle = 'rgba(80,40,10,.35)'; g.beginPath(); g.ellipse(prand() * s, y + 16, 5, 2.5, 0, 0, Math.PI * 2); g.fill(); }
    }
  });
  texture('metal', 128, (g, s) => {
    const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#5d6789'); gr.addColorStop(1, '#465071'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < s; x += 16) { g.save(); g.translate(x + 4, y + 8); g.rotate(-0.6); g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-5, -1.2, 10, 2.4); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(-5, 1.2, 10, 1.2); g.restore(); }
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(255,255,255,${prand() * 0.05})`; g.beginPath(); g.moveTo(prand() * s, prand() * s); g.lineTo(prand() * s, prand() * s); g.stroke(); }
  });
  texture('rubber', 64, (g, s) => { g.fillStyle = '#34407a'; g.fillRect(0, 0, s, s); for (let y = 8; y < s; y += 16) for (let x = (y / 16 | 0) % 2 ? 16 : 8; x < s; x += 16) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + 1, y + 1.5, 3.4, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI * 2); g.fill(); } });
  texture('ice', 256, (g, s) => {
    const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#f2fbff'); gr.addColorStop(0.5, '#d9f1fb'); gr.addColorStop(1, '#eaf8ff'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(140,200,230,${0.15 + prand() * 0.3})`; g.lineWidth = 0.5 + prand(); g.beginPath(); let x = prand() * s, y = prand() * s; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (prand() - 0.5) * 60; y += (prand() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; const x = prand() * s, y = prand() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18 + prand() * 30, y + 6 + prand() * 10); g.stroke(); }
    speckle(g, s, 120, ['#ffffff', '#bfe6f7'], 0.4, 1.2, 0.7);
  });
  texture('grass', 128, (g, s) => { g.fillStyle = '#3c8a55'; g.fillRect(0, 0, s, s); for (let i = 0; i < 900; i++) { const x = prand() * s, y = prand() * s; g.strokeStyle = prand() < 0.5 ? 'rgba(120,200,110,.55)' : 'rgba(25,80,45,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (prand() - 0.5) * 3, y - 3 - prand() * 4); g.stroke(); } });
  texture('asphalt', 128, (g, s) => { g.fillStyle = '#34364f'; g.fillRect(0, 0, s, s); speckle(g, s, 700, ['#4a4d6b', '#26283c', '#5a5e80'], 0.4, 1.3); });
  texture('carpet', 64, (g, s) => { g.fillStyle = '#5b2a6e'; g.fillRect(0, 0, s, s); for (let y = 0; y < s; y += 4) for (let x = 0; x < s; x += 4) { g.fillStyle = `rgba(255,255,255,${prand() * 0.06})`; g.fillRect(x, y, 3, 3); } g.strokeStyle = 'rgba(255,217,91,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, s / 2); g.lineTo(s / 2, 0); g.lineTo(s, s / 2); g.lineTo(s / 2, s); g.closePath(); g.stroke(); });
  texture('neon', 64, (g, s) => { g.fillStyle = '#0d0f2b'; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(55,216,233,.35)'; g.lineWidth = 1.5; g.strokeRect(0.75, 0.75, s - 1.5, s - 1.5); g.strokeStyle = 'rgba(55,216,233,.1)'; g.lineWidth = 5; g.strokeRect(0, 0, s, s); });
  texture('tile', 64, (g, s) => { g.fillStyle = '#2a3168'; g.fillRect(0, 0, s, s); const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(2, 2, s - 4, s - 4); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2); });
  texture('sand', 128, (g, s) => { g.fillStyle = '#e7c98f'; g.fillRect(0, 0, s, s); speckle(g, s, 900, ['#d4b274', '#f5dfae', '#c9a463'], 0.4, 1.1); });
  texture('plastic', 64, (g, s) => { const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e8e4f4'); g.fillStyle = gr; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(120,110,160,.08)'; for (let i = 0; i < s; i += 8) g.fillRect(0, i, s, 1); });
  texture('stone', 128, (g, s) => {
    g.fillStyle = '#5b5277'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < s + 32; x += 32) { g.fillStyle = `rgba(${prand() < 0.5 ? 255 : 0},${prand() < 0.5 ? 255 : 0},255,${0.03 + prand() * 0.05})`; g.fillRect(x - 15, y + 1, 30, 30); g.strokeStyle = 'rgba(20,10,40,.45)'; g.lineWidth = 2; g.strokeRect(x - 15, y + 1, 30, 30); }
    speckle(g, s, 300, ['#7a7096', '#463e60'], 0.4, 1.2, 0.8);
  });
  texture('water', 256, (g, s) => {
    const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#1d5f8f'); gr.addColorStop(1, '#174a74'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(255,255,255,${0.04 + prand() * 0.1})`; g.lineWidth = 1 + prand() * 2; const x = prand() * s, y = prand() * s, w = 10 + prand() * 30; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g.stroke(); }
  });
  texture('lava', 128, (g, s) => { g.fillStyle = '#5a0f12'; g.fillRect(0, 0, s, s); for (let i = 0; i < 24; i++) { const x = prand() * s, y = prand() * s, r = 8 + prand() * 22; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(255,190,80,.9)'); rg.addColorStop(0.5, 'rgba(255,90,40,.5)'); rg.addColorStop(1, 'rgba(255,60,40,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); } });
  texture('candy', 64, (g, s) => { g.fillStyle = '#ff8fc2'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(255,255,255,.35)'; for (let k = -s; k < s * 2; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 8, 0); g.lineTo(k + 8 - s, s); g.lineTo(k - s, s); g.closePath(); g.fill(); } });
  texture('felt', 128, (g, s) => { g.fillStyle = '#2b6a4b'; g.fillRect(0, 0, s, s); speckle(g, s, 1200, ['#337a58', '#24593f'], 0.3, 0.9, 0.8); });
  texture('cloud', 256, (g, s) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, s, s); for (let i = 0; i < 14; i++) { const x = prand() * s, y = prand() * s, r = 20 + prand() * 40; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); } });
}
// Film grain / material grain overlay on an area (world or screen coords)
function grain(x, y, w, h, a = 0.06) { ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = mat('noise'); ctx.fillRect(x, y, w, h); ctx.restore(); }

// ───────────────────────── LIGHT helpers ─────────────────────────
// Emissive strokes/fills with a soft glow. Keep blur modest (it costs fill-rate).
function glow(color, blur, fn) { ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur * S; fn(); ctx.restore(); }
function additive(fn) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; fn(); ctx.restore(); }
// Radial light pool on the floor (world coords), e.g. under a lamp or a glowing pad.
function lightPool(x, y, r, color, alpha = 0.35) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore(); }
// Soft contact shadow on the floor (world coords).
function contactShadow(x, y, rx, ry = rx * 0.55, a = 0.32) { const g = ctx.createRadialGradient(x, y, 0, x, y, rx); g.addColorStop(0, `rgba(5,6,20,${a})`); g.addColorStop(1, 'rgba(5,6,20,0)'); ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
// Shaded sphere billboard (marbles, orbs, bombs). Draw inside billboard() (origin = sphere centre).
function sphere(r, color, opts = {}) {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r);
  g.addColorStop(0, opts.hi || '#ffffff'); g.addColorStop(0.28, color); g.addColorStop(0.85, shade(color, 0.55)); g.addColorStop(1, shade(color, 0.35));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.arc(0, 0, r * 0.8, Math.PI * 0.15, Math.PI * 0.6); ctx.stroke();
}
// Extruded box billboard helper: a prism with a top face and a front face (screen space, origin = base centre).
function box(w, d, h, top, front, opts = {}) {
  const dd = d * TILT;
  ctx.fillStyle = 'rgba(5,6,20,.28)'; roundRect(-w / 2 + 4, -dd / 2 + 6, w, dd, opts.r ?? 6); ctx.fill();
  ctx.fillStyle = front; roundRect(-w / 2, -h + dd / 2 - 2, w, h + 2, opts.r ?? 6); ctx.fill();
  ctx.fillStyle = top; roundRect(-w / 2, -h - dd / 2, w, dd, opts.r ?? 6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; roundRect(-w / 2 + 3, -h - dd / 2 + 2, w - 6, Math.max(2, dd * 0.18), 3); ctx.fill();
}
