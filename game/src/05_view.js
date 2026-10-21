// ───────────────────────── VIEW: 2.5D camera ─────────────────────────
// The world is simulated top-down in a 960 × 600 field (x right, y down, z up).
// It is RENDERED as a tilted stage: the floor plane is foreshortened by TILT and pushed down by Y0,
// so the top of the screen shows the stadium behind the arena. Anything with height (beans, items,
// text) is drawn upright as a billboard at its projected position and depth-sorted by y.
//
// Arena draw code runs inside the WORLD transform: draw floors/decals in world coords as usual.
//   lift(z)                       → y offset that raises a world-space shape by z screen pixels
//   billboard(x, y, z, fn, s)     → draw fn() upright (screen pixels, origin at the point, +y down)
//   sprite(y, fn)                 → queue an upright thing for depth sorting; flushed by drawAll()
//   drawAll(beans, extras)        → depth-sorts beans + queued sprites + extras [{y, draw}] and draws them
//   inScreen(fn)                  → draw fn() in plain screen space (HUD bits inside the canvas)
//   CAM.scrollY                   → scrolling arenas set this instead of translating the context
const CAM = { zoom: 1, fx: W / 2, fy: H / 2, scrollY: 0, shakeX: 0, shakeY: 0, tz: 1, tfx: W / 2, tfy: H / 2 };

function toScreen(x, y, z = 0) {
  return {
    x: (x - CAM.fx) * CAM.zoom + CAM.fx + CAM.shakeX,
    y: (((y - CAM.scrollY) * TILT + Y0 - z) - CAM.fy) * CAM.zoom + CAM.fy + CAM.shakeY,
  };
}
function applyWorld() {
  const z = CAM.zoom;
  ctx.setTransform(S * z, 0, 0, S * z * TILT,
    S * (-CAM.fx * z + CAM.fx + CAM.shakeX),
    S * ((Y0 - CAM.scrollY * TILT - CAM.fy) * z + CAM.fy + CAM.shakeY));
}
function applyScreen() { ctx.setTransform(S, 0, 0, S, 0, 0); }
function inScreen(fn) { ctx.save(); applyScreen(); fn(); ctx.restore(); }
// world-space y offset that appears as `z` pixels of height on screen
function billboard(x, y, z, fn, scale = 1) {
  const p = toScreen(x, y, z);
  ctx.save();
  ctx.setTransform(S * CAM.zoom * scale, 0, 0, S * CAM.zoom * scale, S * p.x, S * p.y);
  fn();
  ctx.restore();
}
const SPRITES = [];
function sprite(y, fn) { SPRITES.push({ y, draw: fn }); }
function drawAll(beans, extras = [], alphaFn) {
  const list = SPRITES.splice(0);
  for (const e of extras) list.push(e);
  for (const b of beans) list.push({ y: b.y + 0.01, draw: () => drawBean(b, alphaFn ? alphaFn(b) : 1) });
  list.sort((a, b) => a.y - b.y);
  for (const s of list) s.draw();
}
// Soft camera: frame() eases CAM toward the target (used for the slow-mo finish zoom).
function camFocus(x, y, zoom) { if (!isFinite(x) || !isFinite(y)) return; const p = { x, y: (y - CAM.scrollY) * TILT + Y0 }; CAM.tfx = p.x; CAM.tfy = p.y; CAM.tz = zoom; }
function camReset(hard) { CAM.tfx = W / 2; CAM.tfy = H / 2; CAM.tz = 1; if (hard) { CAM.fx = W / 2; CAM.fy = H / 2; CAM.zoom = 1; CAM.scrollY = 0; } }
function stepCam(dt) {
  const k = Math.min(1, dt * 5);
  CAM.zoom += (CAM.tz - CAM.zoom) * k; CAM.fx += (CAM.tfx - CAM.fx) * k; CAM.fy += (CAM.tfy - CAM.fy) * k;
}
