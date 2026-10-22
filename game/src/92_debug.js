// ───────────────────────── PRACTICE MENU: PICK AN ARENA (practice mode only, for everyone) ─────────────────────────
// Practice opens a menu: Quick practice (normal rotation) or pick any arena. Arena matches lock the
// chosen arena for every round and add test controls: F = speed ×1/×2/×4, R = restart the round,
// bots Easy / Hard / Frozen. Never used online or for cash: all hooks check game.mode === 'practice'.
const DEBUG = (() => {
  const D = { on: false, arena: null, size: 4, bots: 'easy', speed: 1 };
  try { Object.assign(D, JSON.parse(localStorage.getItem('hs-debug') || '{}'), { on: false }); } catch {}
  const save = () => { try { localStorage.setItem('hs-debug', JSON.stringify({ arena: D.arena, size: D.size, bots: D.bots })); } catch {} };
  D.active = () => D.on && game.mode === 'practice';

  function card() {
    const keys = Object.keys(ARENAS);
    if (!D.arena || !ARENAS[D.arena]) D.arena = keys[0];
    const sel = ARENAS[D.arena];
    return `<div class="card lobby" style="width:min(760px,100%)">
      <div class="row" style="justify-content:space-between"><h2>Practice</h2><span class="label">Bots only · no money</span></div>
      <div class="row" style="gap:8px"><button class="btn primary big" id="dbgQuick">Quick practice</button><span class="label">Normal rotation, 4 players</span></div>
      <div style="display:grid;gap:8px">
        <span class="label">Or pick an arena</span>
        <div class="seg dbg-arenas">${keys.map((k) => `<button class="${k === D.arena ? 'sel' : ''}" data-dbg-arena="${k}" title="${esc(ARENAS[k].genre)}"><span class="dbg-ic">${genreIcon(ARENAS[k])}</span>${esc(ARENAS[k].name)}</button>`).join('')}</div>
        <p class="fine" style="padding:0;margin:0"><span style="color:var(--text);font-weight:800">${esc(sel.name)}</span> · ${esc(sel.genre)} — ${esc(sel.objective || '')}</p>
      </div>
      <div class="row" style="gap:18px;align-items:flex-start">
        <div style="display:grid;gap:6px"><span class="label">Players</span><div class="seg">${[2, 4, 6, 8].map((n) => `<button class="${n === D.size ? 'sel' : ''}" data-dbg-size="${n}">${n}</button>`).join('')}</div></div>
        <div style="display:grid;gap:6px"><span class="label">Bots</span><div class="seg">${[['easy', 'Easy'], ['hard', 'Hard'], ['frozen', 'Frozen']].map(([k, l]) => `<button class="${k === D.bots ? 'sel' : ''}" data-dbg-bots="${k}">${l}</button>`).join('')}</div></div>
      </div>
      <div class="row" style="gap:8px"><button class="btn primary big" id="dbgStart">Play ${esc(sel.name)}</button><button class="btn ghost" id="back">Back</button></div>
      <p class="fine" style="padding:0;margin:0">Every round is this arena. In the match: F = speed ×1/×2/×4, R = restart the round. Frozen bots stand still.</p>
    </div>`;
  }
  D.open = () => { game.mode = 'practice'; game.screen = 'practiceMenu'; D.on = false; showOverlay(card()); };
  function start(debug) {
    D.on = debug; D.speed = 1; game.mode = 'practice'; game.size = debug ? D.size : 4; game.screen = 'match'; save();
    startMatch(); bar();
  }
  $('#ov').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || game.screen !== 'practiceMenu') return;
    if (t.dataset.dbgArena) D.arena = t.dataset.dbgArena;
    else if (t.dataset.dbgSize) D.size = +t.dataset.dbgSize;
    else if (t.dataset.dbgBots) D.bots = t.dataset.dbgBots;
    else if (t.id === 'dbgQuick') return start(false);
    else if (t.id === 'dbgStart') return start(true);
    else return;
    save(); showOverlay(card());
  });

  // hooks used by the match flow
  D.forcedArena = () => (D.active() && ARENAS[D.arena] ? ARENAS[D.arena] : null);
  D.botTune = (p) => (D.active() && D.bots === 'hard' ? { ...p, skill: 0.85, speedMul: 1 } : p);
  D.freeze = (inputs, me) => { if (D.active() && D.bots === 'frozen') for (const b of game.active) if (b !== me) inputs[b.i] = SIM0.IDLE_INPUT; };

  // speed + restart (keyboard and the on-screen button)
  const speeds = [1, 2, 4];
  D.cycleSpeed = () => { game.speed = D.speed = speeds[(speeds.indexOf(game.speed) + 1) % speeds.length] || 1; bar(); };
  addEventListener('keydown', (e) => {
    if (!D.active() || game.screen !== 'match' || e.repeat || (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName))) return;
    if (e.code === 'KeyF') D.cycleSpeed();
    else if (e.code === 'KeyR' && arena) { game.round = Math.max(0, game.round - 1); game.history.pop(); nextRound(); bar(); }
  });
  // small status bar while testing
  let el = null;
  function bar() {
    if (!el) { el = document.createElement('div'); el.id = 'dbgBar'; el.style.cssText = 'position:fixed;right:18px;bottom:64px;z-index:30;font:700 12px var(--body,system-ui);color:#FFD95B;background:rgba(10,13,36,.85);border:1px solid rgba(255,217,91,.4);border-radius:999px;padding:5px 12px;pointer-events:none;white-space:nowrap'; document.body.appendChild(el); }
    el.hidden = !(D.active() && game.screen === 'match');
    if (!el.hidden) el.textContent = `PRACTICE · ${ARENAS[D.arena].name} · bots ${D.bots} · speed ×${game.speed || 1} · F speed · R restart`;
  }
  D.bar = bar;
  setInterval(bar, 500);
  return D;
})();
