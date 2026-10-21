// ───────────────────────── shared constants + pure helpers (included in the sim AND the client) ─────────────────────────
// RNG / DM are bound per scope: seeded + deterministic inside createSim(), Math.random / Math in the browser's global scope.
const W = 960, H = 600;
const WINS_TO_CHAMPION = 2; // best 2 out of 3
const ROUND_SECONDS = 30;
const maxRounds = (n) => (n >= 3 ? 4 : 3);
const ROSTER = [
  ['Coral', '#FF557D'], ['Cyan', '#37D8E9'], ['Lime', '#A8E24A'], ['Violet', '#8F75FF'],
  ['Amber', '#FFB547'], ['Magenta', '#E85BD9'], ['Teal', '#2EC4B6'], ['Cobalt', '#4C7DFF'],
];
const BOT_NAMES = ['Zip', 'Boop', 'Kiwi', 'Mochi', 'Turbo', 'Pip', 'Nova'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + RNG() * (b - a);
const hyp = DM.hypot;
function norm(x, y) { const l = hyp(x, y); return l > 1e-6 ? { x: x / l, y: y / l } : { x: 0, y: 0 }; }
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1); return hyp(px - ax - dx * t, py - ay - dy * t); }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
const TILT = 0.74;          // floor foreshortening (1 = top-down)
const Y0 = 112;             // screen y of world y = 0
const lift = (z) => z / TILT;
const PALETTE4 = [['#FF557D', '●'], ['#37D8E9', '▲'], ['#FFD95B', '■'], ['#7EE2B8', '✦']];
// colour helpers (pure; effects called from update() pass colours through these)
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = clamp(Math.round(r * f), 0, 255); g = clamp(Math.round(g * f), 0, 255); b = clamp(Math.round(b * f), 0, 255); return `rgb(${r},${g},${b})`; }
