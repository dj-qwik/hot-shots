// ───────────────────────── shared arena helpers ─────────────────────────
// Per-bean score strip along the bottom (screen space). fmt(b) → label; frac(b) (optional) → 0..1 progress bar.
function tally(beans, fmt, frac) {
  inScreen(() => {
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '700 12px "Baloo 2", sans-serif';
    const list = [...beans].sort((a, c) => a.i - c.i), wEach = Math.min(118, (W - 24) / list.length);
    list.forEach((b, i) => {
      const x = 12 + i * wEach, y = H - 64;
      ctx.fillStyle = 'rgba(10,13,36,.8)'; roundRect(x, y, wEach - 6, 24, 12); ctx.fill();
      if (b.human) { ctx.strokeStyle = '#FFD95B'; ctx.lineWidth = 1.5; roundRect(x, y, wEach - 6, 24, 12); ctx.stroke(); }
      if (frac) { const f = clamp(frac(b), 0, 1); ctx.save(); roundRect(x, y, wEach - 6, 24, 12); ctx.clip(); ctx.fillStyle = hexA(b.color, 0.28); ctx.fillRect(x, y, (wEach - 6) * f, 24); ctx.restore(); }
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(x + 12, y + 12, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0b0f28'; ctx.font = '800 9px "Baloo 2", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(b.i + 1), x + 12, y + 12.5);
      ctx.textAlign = 'left'; ctx.font = '700 12px "Baloo 2", sans-serif';
      ctx.fillStyle = !b.alive ? 'rgba(255,255,255,.4)' : b.human ? '#FFD95B' : '#fff'; ctx.fillText(fmt(b), x + 23, y + 12.5);
    });
  });
}
function bigLabel(text, x, y, color = '#fff', size = 14) { ctx.fillStyle = color; ctx.font = `${size}px Bungee, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); }
// Vertical race-progress rail on the right edge (screen space).
function progressStrip(beans, LEN, goalY) {
  inScreen(() => {
    const top = 130, h = H - 230;
    ctx.fillStyle = 'rgba(10,13,36,.8)'; roundRect(W - 30, top - 8, 18, h + 16, 9); ctx.fill();
    ctx.fillStyle = '#7EE2B8'; ctx.fillRect(W - 27, top - 4, 12, 3);
    for (const b of [...beans].sort((a, c) => (a.human ? 1 : 0) - (c.human ? 1 : 0))) { const p = clamp(1 - (b.y - goalY) / (LEN - goalY - 100), 0, 1); ctx.fillStyle = b.color; ctx.strokeStyle = '#0b0f28'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W - 21, top + h * (1 - p), b.human ? 7.5 : 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  });
}
function water(t, c1 = '#174a74', c2 = 'rgba(255,255,255,.08)') {
  ctx.fillStyle = c1; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = c2; ctx.lineWidth = 2;
  for (let y = 20; y < H; y += 34) { ctx.beginPath(); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, y + Math.sin(x * 0.03 + t * 2 + y) * 4); ctx.stroke(); }
}
const SHAPES = { '●': (x, y, s) => { ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); }, '▲': (x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y + s * 0.8); ctx.lineTo(x - s, y + s * 0.8); ctx.fill(); }, '■': (x, y, s) => ctx.fillRect(x - s * 0.85, y - s * 0.85, s * 1.7, s * 1.7), '✦': (x, y, s) => { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.45 : s; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.fill(); } };

