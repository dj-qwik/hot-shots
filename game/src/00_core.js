// ───────────────────────── constants ─────────────────────────
const WEI = 10n ** 18n;
const TIERS = ['0.001', '0.005', '0.01', '0.05'];
const SIZES = [2, 4, 6, 8];

// ───────────────────────── money (same rules as the escrow contract) ─────────────────────────
function parseEth(s) { const [a, b = ''] = s.split('.'); return BigInt(a) * WEI + BigInt((b + '0'.repeat(18)).slice(0, 18)); }
function fmtEth(w) { const neg = w < 0n; if (neg) w = -w; const whole = w / WEI; const frac = (w % WEI).toString().padStart(18, '0').replace(/0+$/, ''); return (neg ? '-' : '') + whole + (frac ? '.' + frac : ''); }
function splitPot(stake, n) { const pot = stake * BigInt(n); const house = pot * 1000n / 10000n; return { pot, house, champ: pot - house }; }
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
let wallet = (() => { const v = store.get('hs_test_wallet'); try { return v ? BigInt(v) : parseEth('0.05'); } catch { return parseEth('0.05'); } })();
function setWallet(v) { wallet = v; store.set('hs_test_wallet', v.toString()); const el = $('#bal'); if (el) el.textContent = fmtEth(v); }

// ───────────────────────── tiny helpers ─────────────────────────
const $ = (s) => document.querySelector(s);
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ───────────────────────── AUDIO: synthesized SFX, crowd, music ─────────────────────────
// Everything is generated with Web Audio (no files). Starts on the first click/key (browser rule).
// beep(f, dur, type, vol) stays as the simple API arenas use; SFX.* are richer named sounds.
let actx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
const AUDIO = { muted: (() => { try { return localStorage.getItem('hs_muted') === '1'; } catch { return false; } })(), music: null };
function audioInit() {
  if (actx) return;
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = AUDIO.muted ? 0 : 0.9;
    const comp = actx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp).connect(actx.destination);
    sfxBus = actx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    musicBus = actx.createGain(); musicBus.gain.value = 0.0; musicBus.connect(master);
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  } catch { actx = null; }
}
document.addEventListener('pointerdown', audioInit, { once: true });
document.addEventListener('keydown', audioInit, { once: true });
function setMuted(m) { AUDIO.muted = m; try { localStorage.setItem('hs_muted', m ? '1' : '0'); } catch {} if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, actx.currentTime, 0.05); }
function tone(f, d = 0.08, type = 'square', vol = 0.05, f2 = null, when = 0) {
  if (!actx) return;
  const t = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(sfxBus); o.start(t); o.stop(t + d + 0.02);
}
function noise(d = 0.2, vol = 0.1, freq = 1200, q = 0.8, type = 'bandpass', when = 0, sweepTo = null) {
  if (!actx) return;
  const t = actx.currentTime + when, s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + d); f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f).connect(g).connect(sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.05);
}
function beep(f = 520, d = 0.08, type = 'square', vol = 0.05) { tone(f, d, type === 'square' ? 'triangle' : type, vol * 1.4); }
const SFX = {
  jump() { tone(380, 0.12, 'sine', 0.07, 760); },
  land() { noise(0.08, 0.05, 260, 1, 'lowpass'); },
  dive() { noise(0.18, 0.06, 900, 0.7, 'bandpass', 0, 300); },
  tackle() { tone(140, 0.16, 'sine', 0.16, 60); noise(0.09, 0.12, 1800, 0.6); },
  out() { tone(520, 0.45, 'sawtooth', 0.04, 90); noise(0.35, 0.05, 2500, 0.8, 'bandpass', 0, 300); },
  score() { [880, 1108, 1318].forEach((f, k) => tone(f, 0.12, 'triangle', 0.06, null, k * 0.055)); },
  tick() { tone(1500, 0.035, 'square', 0.025); },
  count(n) { tone(n > 0 ? 660 : 1320, n > 0 ? 0.14 : 0.35, 'triangle', 0.09); if (n <= 0) noise(0.4, 0.05, 3000, 0.5, 'highpass'); },
  win() { [523, 659, 784, 1046].forEach((f, k) => tone(f, 0.22, 'triangle', 0.08, null, k * 0.09)); crowdRoar(1); },
  lose() { [392, 330, 262].forEach((f, k) => tone(f, 0.25, 'triangle', 0.06, null, k * 0.12)); },
  ui() { tone(720, 0.05, 'triangle', 0.04); },
};
function crowdRoar(amount = 0.5) { if (!actx) return; noise(0.9 + amount, 0.05 * amount, 900, 0.4, 'bandpass', 0, 600); noise(0.7 + amount * 0.6, 0.03 * amount, 2200, 0.6, 'bandpass', 0.05); }

// Procedural music: a light 4-bar loop (bass, chords, hats) scheduled ahead with the audio clock.
// Intensity rises during play. Quiet by design (it sits under the SFX).
function startMusic() {
  if (!actx || AUDIO.music) return;
  const bpm = 116, beat = 60 / bpm, roots = [45, 41, 48, 43]; // A F C G (minor-ish loop)
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  let next = actx.currentTime + 0.1, step = 0;
  AUDIO.music = setInterval(() => {
    if (!actx) return;
    const target = AUDIO.muted ? 0 : (typeof game !== 'undefined' && game.phase === 'play' ? 0.5 : 0.32);
    musicBus.gain.setTargetAtTime(target, actx.currentTime, 0.4);
    while (next < actx.currentTime + 0.3) {
      const bar = Math.floor(step / 8) % 4, root = roots[bar], t = next, pos = step % 8;
      const playMode = typeof game !== 'undefined' && game.phase === 'play';
      // bass on 1 and the "and" of 2
      if (pos === 0 || pos === 3 || pos === 6) { const o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = hz(root - 12); f.type = 'lowpass'; f.frequency.value = 420; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.9); o.connect(f).connect(g).connect(musicBus); o.start(t); o.stop(t + beat); }
      // soft chord stab on 1
      if (pos === 0) for (const iv of [12, 15, 19]) { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'triangle'; o.frequency.value = hz(root + iv); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 3.5); o.connect(g).connect(musicBus); o.start(t); o.stop(t + beat * 3.6); }
      // kick on beats, hats on offbeats (hats only in play)
      if (pos % 2 === 0) { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.18); }
      if (playMode && pos % 2 === 1) { const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(0.025, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(f).connect(g).connect(musicBus); s.start(t, Math.random()); s.stop(t + 0.06); }
      next += beat / 2; step++;
    }
  }, 100);
}


// ───────────────────────── canvas sizing ─────────────────────────
const cv = $('#cv'); let ctx = cv.getContext('2d'); // let: menus temporarily point ctx at offscreen canvases to render bean portraits
let S = 1;
function resize() {
  const st = $('#stage'); const s = Math.min(st.clientWidth / W, st.clientHeight / H);
  const dpr = window.devicePixelRatio || 1;
  cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
  cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr); S = s * dpr;
  const hud = $('#hud'), tch = $('#touch');
  const left = (st.clientWidth - W * s) / 2 + 'px', top = (st.clientHeight - H * s) / 2 + 'px';
  // HUD is laid out at the canvas's native 960×600 and scaled with it, so it keeps its proportions on any screen
  // (k never drops below 0.62 so text stays legible on phones; the layout then has a bit more room to wrap)
  const k = Math.max(s, 0.62);
  Object.assign(hud.style, { inset: 'auto', left, top, width: (W * s) / k + 'px', height: (H * s) / k + 'px', transform: `scale(${k})`, transformOrigin: '0 0' });
  // touch controls stay finger-sized
  Object.assign(tch.style, { inset: 'auto', left, top, width: W * s + 'px', height: H * s + 'px' });
}
addEventListener('resize', resize);

// ───────────────────────── input ─────────────────────────
const keys = new Set();
const touchVec = { x: 0, y: 0 }; let touchJump = false, touchDive = false;
function startCountdown() {
  if (game.phase !== 'intro') return;
  if (game.mode === 'online') return NET.ready(); // online: the server starts the countdown once everyone is ready
  game.phase = 'countdown'; game.phaseT = 0; showOverlay('');
}
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && game.phase === 'intro') { e.preventDefault(); startCountdown(); return; }
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
// Gamepad (standard mapping): left stick or d-pad = move, Cross (✕, button 0) = jump, Square (□, button 2) = dive.
const PAD_DEADZONE = 0.22;
function padState() {
  const out = { x: 0, y: 0, jump: false, dive: false, connected: false };
  let pads = [];
  try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch {}
  for (const gp of pads) {
    if (!gp || !gp.connected) continue;
    out.connected = true;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (hyp(ax, ay) > PAD_DEADZONE) { out.x += ax; out.y += ay; }
    const b = (i) => !!gp.buttons[i] && gp.buttons[i].pressed;
    if (b(12)) out.y -= 1; if (b(13)) out.y += 1; if (b(14)) out.x -= 1; if (b(15)) out.x += 1;
    if (b(0)) out.jump = true;
    if (b(2)) out.dive = true;
  }
  return out;
}
// Cross also presses the highlighted button on menus/between rounds, so a controller player never needs the mouse.
let padConfirmLatch = false;
function pollPadMenus() {
  const p = padState();
  if (p.jump && !padConfirmLatch && !$('#ov').hidden) {
    const btn = $('#ov').querySelector('.btn.primary:not([disabled])');
    if (btn) btn.click();
  }
  padConfirmLatch = p.jump;
}
function humanInput() {
  let x = 0, y = 0;
  const gp = padState();
  x += gp.x; y += gp.y;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  x += touchVec.x; y += touchVec.y;
  const n = hyp(x, y) > 1 ? norm(x, y) : { x, y };
  const jump = keys.has('Space') || touchJump || gp.jump;
  const dive = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyK') || touchDive || gp.dive;
  touchDive = false;
  return { x: n.x, y: n.y, jump, dive };
}
const isTouch = matchMedia('(pointer: coarse)').matches;
(function setupTouch() {
  const stick = $('#stick'), knob = $('#knob'); let id = null;
  function move(e) { const r = stick.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const l = Math.min(1, hyp(dx, dy) / 45); const n = norm(dx, dy); touchVec.x = n.x * l; touchVec.y = n.y * l; knob.style.transform = `translate(${n.x * l * 35}px, ${n.y * l * 35}px)`; }
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(id); move(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = () => { id = null; touchVec.x = touchVec.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  $('#tJump').addEventListener('pointerdown', (e) => { e.preventDefault(); touchJump = true; });
  $('#tJump').addEventListener('pointerup', () => { touchJump = false; });
  $('#tJump').addEventListener('pointerleave', () => { touchJump = false; });
  $('#tDive').addEventListener('pointerdown', (e) => { e.preventDefault(); touchDive = true; });
})();

