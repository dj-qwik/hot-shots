// ───────────────────────── drawing beans ─────────────────────────
// ───────────────────────── BEAN RENDERER v3 ─────────────────────────
// Beans are billboards: a soft contact shadow on the floor (world space) plus an upright, fully shaded
// character drawn at the projected point. Origin of drawBeanFigure = between the feet, screen pixels.
function drawBean(b, alpha = 1) {
  if (!b.alive && b.out > 0.7) return;
  const t = performance.now() / 1000;
  const fade = b.alive ? alpha : alpha * Math.max(0, 1 - b.out / 0.7);
  const depth = 0.9 + 0.18 * clamp((b.y - CAM.scrollY) / 600, 0, 1); // nearer = slightly bigger
  // contact shadow (world space, shrinks and fades as the bean rises)
  const sh = clamp(1 - b.z / 160, 0.35, 1);
  // b.zoff: height of the floor this bean stands on (e.g. -80 for a basement level). Arenas set it.
  const zo = b.zoff || 0;
  ctx.save(); ctx.globalAlpha = fade; contactShadow(b.x, b.y + 2 - lift(zo), 17 * sh * depth, 13 * sh * depth, 0.38 * sh); ctx.restore();
  const cheer = b.cheerT > 0 ? Math.abs(Math.sin(t * 9)) * 14 : 0;
  billboard(b.x, b.y, b.z + zo + cheer, () => { ctx.globalAlpha = fade; drawBeanFigure(b, t); }, depth * (b.alive ? 1 : Math.max(0.3, 1 - b.out)));
  if (!b.alive) return;
  // carried crown (Crown Conveyor)
  if (b.carry && typeof b.carry === 'object') billboard(b.x, b.y, b.z + zo + 54 * depth, () => drawCrown(0, 0, 0.95), depth);
  // dizzy stars
  if (b.stun > 0 || b.fatigue >= 1.6) billboard(b.x, b.y, b.z + zo + 44 * depth, () => { for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; ctx.fillStyle = '#FFD95B'; SHAPES['✦'](Math.cos(a) * 14, Math.sin(a) * 4, 3.6); } }, depth);
  // name tag / YOU marker
  billboard(b.x, b.y, b.z + zo + 50 * depth + (b.carry ? 22 : 0), () => {
    if (b.human) {
      const y = Math.sin(t * 5) * 2;
      ctx.fillStyle = '#FFD95B'; ctx.strokeStyle = '#2a2100'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, y - 9); ctx.lineTo(8, y - 9); ctx.lineTo(0, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.font = '11px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 4; ctx.strokeStyle = '#1a1600'; ctx.strokeText('YOU', 0, y - 11); ctx.fillText('YOU', 0, y - 11);
    } else if (!game || game.phase !== 'play' || game.t < 4) {
      ctx.font = '700 10px "Baloo 2", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,12,32,.85)'; ctx.strokeText(b.name, 0, -2); ctx.fillStyle = '#fff'; ctx.fillText(b.name, 0, -2);
    }
  }, depth);
}
function drawBeanFigure(b, t) {
  const prone = b.proneT > 0, air = b.z > 2 || (b.cheerT > 0);
  const speed = hyp(b.vx, b.vy);
  const back = b.fy < -0.55 && !prone;                      // running away from camera: show the back
  const side = Math.abs(b.fx) > 0.25 ? Math.sign(b.fx) : 0;
  const rx = 13 * (1 + b.sq), ry = 16.5 * (1 - b.sq);
  const walk = b.walk * 6, stride = !air && !prone && speed > 30 ? Math.sin(walk) : 0;
  const bob = !air && !prone ? Math.abs(Math.sin(walk)) * 1.6 * Math.min(1, speed / 150) : 0;
  const lean = prone ? 0 : clamp(b.vx / 900, -0.2, 0.2);
  const col = b.color, dark = shade(col, 0.48), mid = shade(col, 0.7);
  ctx.save();
  if (prone) {
    // lying flat after a dive: rotate onto the side we dived toward, squash for away/toward dives
    const s = Math.abs(b.fx) > 0.3 ? Math.sign(b.fx) : 1;
    ctx.translate(0, -6); ctx.rotate(s * 1.3); ctx.scale(1, Math.abs(b.fx) > 0.3 ? 1 : 0.7); ctx.translate(0, 6);
  } else ctx.rotate(lean);
  ctx.translate(0, -bob);
  const cy = -ry - 6; // body centre (feet at 0)
  // ── legs & shoes
  for (const s of [-1, 1]) {
    const k = s * stride, lift = air ? 4 : Math.max(0, k) * 3;
    const fx = s * 6.2 + (side ? side * k * 2.5 : 0), fy = -1.5 - lift;
    ctx.fillStyle = dark; roundRect(fx - 2.6, cy + ry * 0.6, 5.2, fy - cy - ry * 0.6 + 2, 2.4); ctx.fill();
    ctx.fillStyle = '#1b1f3f'; ctx.beginPath(); ctx.ellipse(fx + side * 1.5, fy, 6.2, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(fx - 5.5 + side * 1.5, fy + 1.4, 11, 1.4);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(fx + side * 1.5 - 2, fy - 1.4, 2.2, 1, 0, 0, Math.PI * 2); ctx.fill();
  }
  // ── arms (back arm first)
  // positive s = right arm; negative rotation swings it outward/up
  const armAngle = (s) => -(prone ? s * 2.7 : air ? s * (2.4 + Math.sin(t * 14 + s) * (b.cheerT > 0 ? 0.5 : 0.15)) : s * (0.38 - stride * s * 0.55));
  const drawArm = (s) => {
    ctx.save(); ctx.translate(s * (rx - 1.5), cy + 1); ctx.rotate(armAngle(s));
    const ag = ctx.createLinearGradient(-3, 0, 3, 0); ag.addColorStop(0, mid); ag.addColorStop(1, dark);
    ctx.fillStyle = ag; roundRect(-3.2, 0, 6.4, 11, 3.2); ctx.fill();
    // glove
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 12, 4.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(120,130,170,.45)'; ctx.beginPath(); ctx.arc(0.8, 13, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-0.6, 11.6, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  const backArm = side > 0 ? -1 : side < 0 ? 1 : 0; // facing camera: both arms in front
  if (backArm) drawArm(backArm);
  // ── body
  ctx.save(); ctx.translate(0, cy);
  const bg = ctx.createRadialGradient(-rx * 0.38, -ry * 0.42, rx * 0.12, 0, 0, ry * 1.08);
  bg.addColorStop(0, shade(col, 1.45)); bg.addColorStop(0.42, col); bg.addColorStop(0.86, shade(col, 0.62)); bg.addColorStop(1, shade(col, 0.45));
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  // rim light (cool, from behind-right) + outline
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = 'rgba(190,230,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(1.2, 0.8, rx, ry, 0, -0.2, 1.4); ctx.stroke();
  // belly
  if (!back) { ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.ellipse(side * 1.5, ry * 0.45, rx * 0.56, ry * 0.36, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.strokeStyle = dark; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  // specular highlight
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-rx * 0.42, -ry * 0.5, rx * 0.2, ry * 0.13, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(-rx * 0.5, -ry * 0.58, 1.3, 0, Math.PI * 2); ctx.fill();
  // number (front: belly badge; back: jersey number)
  ctx.font = `800 ${back ? 11 : 9}px "Baloo 2", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillText(String(b.i + 1), back ? 0 : side * 1.5, back ? 2 : ry * 0.46);
  if (!back) {
    // visor: glossy glass with eyes, shifts toward facing direction
    const vx = side * 3.6, vy = -ry * 0.28;
    const vg = ctx.createLinearGradient(0, vy - 6, 0, vy + 6); vg.addColorStop(0, '#2a3466'); vg.addColorStop(1, '#0d1130');
    ctx.fillStyle = vg; roundRect(vx - 10, vy - 6, 20, 12, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; roundRect(vx - 10, vy - 6, 20, 12, 6); ctx.stroke();
    drawEyes(b, vx, vy + 0.5, t);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; roundRect(vx - 8, vy - 4.6, 7, 1.8, 0.9); ctx.fill();
    // eyebrows show effort/expression
    const det = speed > 160 && !prone, mad = b.stun > 0;
    if (det || mad) { ctx.strokeStyle = shade(col, 0.35); ctx.lineWidth = 2; ctx.lineCap = 'round'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(vx + s * 7, vy - 9); ctx.lineTo(vx + s * 2.5, vy - 7.3 + (mad ? -1.5 : 0)); ctx.stroke(); } ctx.lineCap = 'butt'; }
  } else {
    // back view: a little backpack strap line
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-rx * 0.6, -ry * 0.3); ctx.quadraticCurveTo(0, -ry * 0.05, rx * 0.6, -ry * 0.3); ctx.stroke();
  }
  drawHat(b.i, ry, b, t, back);
  ctx.restore();
  if (backArm) drawArm(-backArm); else { drawArm(-1); drawArm(1); }
  ctx.restore();
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawCrown(x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#FFD95B'; ctx.strokeStyle = '#8a6a00'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(-11, -5); ctx.lineTo(-5, 0); ctx.lineTo(0, -8); ctx.lineTo(5, 0); ctx.lineTo(11, -5); ctx.lineTo(10, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FF557D'; ctx.beginPath(); ctx.arc(0, 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function floorTexture(c1, c2, size = 48, oy = 0) {
  ctx.fillStyle = c1; ctx.fillRect(0, oy, W, H);
  for (let y = Math.floor(oy / size) * size; y < oy + H; y += size) for (let x = 0; x < W; x += size) {
    ctx.fillStyle = ((x / size) + (y / size)) % 2 === 0 ? c2 : c1;
    roundRect(x + 2, y + 2, size - 4, size - 4, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(x + 4, y + 3, size - 8, 3);
  }
  const g = ctx.createLinearGradient(0, oy, 0, oy + H); g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
  ctx.fillStyle = g; ctx.fillRect(0, oy, W, H);
}
// ───────────────────────── stage art helpers ─────────────────────────
// Game-show backdrop: gradient, drifting coloured glows, two sweeping spotlights and a faint dot grid.
function backdrop(top, bottom, glow, t, oy = 0) {
  const g = ctx.createLinearGradient(0, oy, 0, oy + H); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, oy, W, H);
  for (let k = 0; k < 3; k++) {
    const x = W * (0.18 + 0.32 * k) + Math.sin(t * 0.3 + k * 2) * 90, y = oy + H * (0.3 + 0.25 * (k % 2)) + Math.cos(t * 0.25 + k) * 60;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, 280); rg.addColorStop(0, glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, oy, W, H);
  }
  ctx.fillStyle = 'rgba(255,255,255,.045)';
  const y0 = Math.floor(oy / 32) * 32;
  for (let y = y0; y < oy + H; y += 32) for (let x = 16; x < W; x += 32) ctx.fillRect(x, y, 2, 2);
  if (!REDUCED) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of [-1, 1]) {
      const a = Math.sin(t * 0.55 + (s > 0 ? 1.7 : 0)) * 0.35 - s * 0.3;
      ctx.save(); ctx.translate(W / 2 + s * 380, oy - 30); ctx.rotate(a);
      const lg = ctx.createLinearGradient(0, 0, 0, H * 1.15); lg.addColorStop(0, 'rgba(255,255,255,.11)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(130, H * 1.15); ctx.lineTo(-130, H * 1.15); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}
// Raised platforms: a darker side band under the top face, soft drop shadow, rim highlight.
function platformCircle(x, y, r, top, side, depth = 16) {
  depth = lift(depth);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y + depth + 12, r * 1.02, r * 0.98, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = side; ctx.beginPath(); ctx.arc(x, y + depth, r, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - r, y, r * 2, depth);
  ctx.fillStyle = top; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r - 2, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
}
function platformRect(x, y, w, h, top, side, depth = 16, rad = 16) {
  depth = lift(depth);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; roundRect(x + 6, y + depth + 10, w, h, rad); ctx.fill();
  ctx.fillStyle = side; roundRect(x, y + depth, w, h, rad); ctx.fill(); ctx.fillRect(x, y + rad, w, h - rad);
  ctx.fillStyle = top; roundRect(x, y, w, h, rad); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + rad, y + 2); ctx.lineTo(x + w - rad, y + 2); ctx.stroke();
}
function hexPath(x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.closePath(); }

