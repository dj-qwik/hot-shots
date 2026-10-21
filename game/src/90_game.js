// ───────────────────────── match state ─────────────────────────
const game = {
  screen: 'home', mode: 'cash', stake: parseEth('0.01'), size: 4, beans: [], active: [], players: [], me: 0, wins: [], round: 0, history: [],
  roundWinners: [], phase: 'idle', t: 0, phaseT: 0, speed: 1, winnerBean: null, deposited: false,
};
let arena = null, ROUND = null; // the current round (deterministic simulation instance); arena = ROUND.arena
const meBean = () => game.beans.find((b) => b.i === game.me) || null;
// A fresh, isolated simulation instance per round (the same code the server runs online).
function bindRound(round) { ROUND = round; arena = round.arena; game.beans = round.beans; game.active = round.active; game.isFinal = round.isFinal; }

// Rotation: a shuffled deck of all arenas (remembered on this device) so every arena comes up before any
// repeats; within a match no repeats and never the same genre twice in a row.
function pickArena() {
  const keysA = Object.keys(ARENAS);
  let deck = []; try { deck = JSON.parse(localStorage.getItem('hs-deck') || '[]').filter((k) => ARENAS[k]); } catch {}
  const lastGenre = game.history.length ? ARENAS[game.history[game.history.length - 1]].genre : null;
  const draw = (ok) => {
    for (let pass = 0; pass < 2; pass++) {
      const i = deck.findIndex(ok);
      if (i >= 0) return deck.splice(i, 1)[0];
      const fresh = [...keysA]; for (let j = fresh.length - 1; j > 0; j--) { const r = (Math.random() * (j + 1)) | 0; [fresh[j], fresh[r]] = [fresh[r], fresh[j]]; }
      deck.push(...fresh);
    }
    return null;
  };
  const key = draw((k) => !game.history.includes(k) && ARENAS[k].genre !== lastGenre) || draw((k) => !game.history.includes(k));
  try { localStorage.setItem('hs-deck', JSON.stringify(deck)); } catch {}
  return ARENAS[key];
}

function startMatch() {
  // offline roster: you are seat 0, bots fill the rest with a spread of skill
  game.me = 0;
  game.players = Array.from({ length: game.size }, (_, i) => i === 0 ? { i, name: 'You', human: true }
    : { i, name: BOT_NAMES[(i - 1) % BOT_NAMES.length], skill: rnd(BOT_SKILL[0], BOT_SKILL[1]), speedMul: rnd(BOT_SPEED[0], BOT_SPEED[1]) });
  game.wins = Array(game.size).fill(0); game.round = 0; game.history = []; game.roundWinners = [];
  nextRound();
}
// Rounds 1–3 are open to all. If they produced three different winners, round 4 is a final for those three only.
function contenders() { // seat indices
  const w = game.roundWinners;
  if (w.length >= 3 && new Set(w.slice(0, 3)).size === 3) return w.slice(0, 3);
  return game.players.map((p) => p.i);
}
function nextRound() {
  game.round++;
  const key = pickArena().key; game.history.push(key);
  const active = contenders(), seed = (Math.random() * 4294967296) >>> 0;
  bindRound(createSim({ fx: FX_ENV, seed }).createRound({ key, seed, players: game.players, active, isFinal: active.length !== game.players.length }));
  beginIntro(INTRO_SECONDS);
}
function beginIntro(seconds) {
  document.body.classList.add('playing');
  camReset(true); game.phase = 'intro'; game.phaseT = INTRO_SECONDS - seconds; game.t = 0; game.speed = 1; game.winnerBean = null; game.acc = 0;
  showOverlay(introCard()); $('#hud').hidden = false; $('#touch').hidden = !isTouch; $('#ff').hidden = true;
  renderHud(true);
}

// ───────────────────────── overlays ─────────────────────────
// Redrawing a card that is already showing (balance tick, a player joining, a server status update) must
// not replay its pop-in animation: that replay is the "flicker". Identical HTML is skipped outright; an
// update to the same card (same screen, same title) swaps in place with animations held still.
let OV_HTML = '', OV_KEY = '';
function showOverlay(html) {
  const ov = $('#ov'); html = html || '';
  if (html === OV_HTML && ov.hidden === !html) return;
  const key = html ? game.screen + '|' + ((html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || '') : '';
  const same = !!html && !ov.hidden && key === OV_KEY;
  ov.classList.toggle('still', same);
  if (same) { const t = document.createElement('div'); t.innerHTML = html; morphKids(ov, t); }
  else ov.innerHTML = html;
  ov.hidden = !html; OV_HTML = html; OV_KEY = key;
}
// Patch `el`'s children to match `to`'s, touching only what differs: images don't reload, the focused
// field keeps focus and caret, hover states survive.
function morphKids(el, to) {
  const a = [...el.childNodes], b = [...to.childNodes];
  for (let i = 0; i < b.length; i++) {
    const x = a[i], y = b[i];
    if (!x) { el.appendChild(y); continue; }
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName || (x.id || '') !== (y.id || '')) { el.replaceChild(y, x); continue; }
    if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; continue; }
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
    if ((x.tagName === 'INPUT' || x.tagName === 'TEXTAREA') && x !== document.activeElement && x.value !== (y.getAttribute('value') || '')) x.value = y.getAttribute('value') || '';
    if (x.tagName === 'BUTTON' || x.tagName === 'INPUT' || x.tagName === 'SELECT') x.disabled = y.hasAttribute('disabled');
    morphKids(x, y);
  }
  for (let i = a.length - 1; i >= b.length; i--) a[i].remove();
}
// ───────────────────────── UI KIT: portraits, icons, pips ─────────────────────────
const PORTRAITS = {};
// Bean avatar rendered with the real in-game character art into a small canvas (cached as a data URL).
function portrait(i, mood = 'idle', size = 96) {
  const key = `${i}|${mood}|${size}`;
  if (PORTRAITS[key]) return PORTRAITS[key];
  if (typeof HEADLESS !== 'undefined') return '';
  const c = makeCanvas(size * 2, size * 2), g = c.getContext('2d');
  const saved = ctx; ctx = g;
  try {
    const col = ROSTER[i][1];
    const bg = g.createRadialGradient(size, size * 0.8, size * 0.1, size, size, size);
    bg.addColorStop(0, hexA(col, 0.55)); bg.addColorStop(0.7, hexA(col, 0.18)); bg.addColorStop(1, hexA(col, 0));
    g.fillStyle = bg; g.beginPath(); g.arc(size, size, size, 0, Math.PI * 2); g.fill();
    const b = makeBean(i, false); b.fx = 0.3; b.fy = 1; b.blink = 3;
    if (mood === 'happy') { b.happyT = 3; b.cheerT = 1; }
    if (mood === 'sad') { b.stun = 1; }
    const s = (size * 2) / 70;
    g.setTransform(s, 0, 0, s, size, size * 1.83);
    drawBeanFigure(b, 0.4);
  } catch (e) { /* portrait is decorative */ }
  ctx = saved;
  return (PORTRAITS[key] = c.toDataURL());
}
const ICONS = {
  flag: '<path d="M8 4v24" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M9 5h15l-3.5 5L24 15H9z" fill="currentColor"/><path d="M9 5h4v5H9zm8 0h4v5h-4zm-4 5h4v5h-4z" fill="#fff" opacity=".85"/>',
  shield: '<path d="M16 3l11 4v8c0 7-5 11.5-11 14C10 26.5 5 22 5 15V7z" fill="currentColor"/><path d="M16 9l2.2 4.5 5 .7-3.6 3.5.9 4.9L16 20.3l-4.5 2.3.9-4.9-3.6-3.5 5-.7z" fill="#fff"/>',
  gem: '<path d="M8 5h16l5 7-13 16L3 12z" fill="currentColor"/><path d="M3 12h26M12 5l-3 7 7 16 7-16-3-7" stroke="#fff" stroke-width="1.6" fill="none" opacity=".85"/>',
  rocket: '<path d="M16 3c5 3 7 9 6 15l-3 4h-6l-3-4c-1-6 1-12 6-15z" fill="currentColor"/><circle cx="16" cy="12" r="3" fill="#fff"/><path d="M13 22l-1 6 4-3 4 3-1-6" fill="#ffb347"/><path d="M10 18l-4 4 4 1zM22 18l4 4-4 1z" fill="#fff" opacity=".85"/>',
  lantern: '<rect x="10" y="9" width="12" height="15" rx="5" fill="currentColor"/><rect x="13" y="12" width="6" height="9" rx="3" fill="#fff6c4"/><path d="M12 6h8M12 26h8M16 3v3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>',
  paint: '<path d="M16 3c4 6 9 10 9 16a9 9 0 0 1-18 0c0-6 5-10 9-16z" fill="currentColor"/><path d="M11 19a5 5 0 0 0 5 5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/>',
  crown: '<path d="M4 11l6 5 6-9 6 9 6-5-3 15H7z" fill="currentColor"/><path d="M7 26h18" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="16" cy="19" r="2.2" fill="#fff"/>',
  plank: '<path d="M4 12h24v5H4zM4 20h24v5H4z" fill="currentColor"/><path d="M9 12v5M17 20v5M23 12v5" stroke="#fff" stroke-width="1.6" opacity=".8"/><path d="M8 6c3-2 6 2 9 0s5-2 7 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>',
  star: '<path d="M16 3l3.8 8 8.7 1.1-6.4 6 1.6 8.7L16 22.6l-7.7 4.2 1.6-8.7-6.4-6 8.7-1.1z" fill="currentColor"/>',
};
const GENRE_ICON = { Sprint: 'flag', Race: 'flag', 'Balance race': 'plank', Survival: 'shield', Collection: 'gem', 'Vehicle skill': 'rocket', 'Steal-and-score': 'lantern', Territory: 'paint', 'Arena control': 'crown' };
function icon(name, color = '#fff') { return `<svg viewBox="0 0 32 32" style="color:${color}" aria-hidden="true">${ICONS[name] || ICONS.star}</svg>`; }
function genreIcon(a) { return icon(GENRE_ICON[a.genre] || 'star', arenaAccent(a)); }
function arenaAccent(a) { return (THEMES[a?.theme] || THEMES.night).accent; }
function pipsHtml(w) { return `<span class="pips" aria-label="${w} round wins">${Array.from({ length: WINS_TO_CHAMPION }, (_, k) => `<span class="pip${k < w ? ' on' : ''}"></span>`).join('')}</span>`; }
function miniHtml(b) { return `<span class="mini${b.human ? ' you' : ''}"><img src="${portrait(b.i)}" alt="">${esc(b.name)}${pipsHtml(game.wins[b.i] || 0)}</span>`; }
const TROPHY = '<svg class="trophy" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".45" stop-color="#ffd95b"/><stop offset="1" stop-color="#c58a0a"/></linearGradient></defs><path d="M30 14h60v20c0 22-12 38-30 40-18-2-30-18-30-40z" fill="url(#tg)"/><path d="M30 22H14c0 16 8 26 20 28M90 22h16c0 16-8 26-20 28" stroke="url(#tg)" stroke-width="7" fill="none"/><rect x="52" y="72" width="16" height="16" fill="#d9a21a"/><rect x="34" y="88" width="52" height="12" rx="4" fill="url(#tg)"/><rect x="28" y="100" width="64" height="10" rx="4" fill="#9c6a06"/><path d="M42 22c0 18 4 30 12 38" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5" fill="none"/><path d="M60 30l3.6 7.3 8 1.2-5.8 5.6 1.4 8L60 48.4l-7.2 3.7 1.4-8-5.8-5.6 8-1.2z" fill="#fff" opacity=".9"/></svg>';

// ───────────────────────── SCREENS ─────────────────────────
function homeCard() {
  return `<div class="card title">
    <div class="hero">
      <h1 class="mega" aria-label="Hot Shots"><span class="w1">HOT</span><span class="w2">SHOTS</span></h1>
      <p class="tagline">Thirty-second mini games. <em>Best 2 out of 3.</em> The champion takes 90% of the pot.</p>
      <div class="row">${CASH.enabled() || CASH.pending() ? `<button class="btn primary big" id="goCashReal">Play for ${CASH.unit()}</button><button class="btn ghost big" id="goOnline">Free online</button>` : NET.enabled() ? '<button class="btn primary big" id="goOnline">Play online</button>' : '<button class="btn primary big" id="goCash">Play for test ETH</button>'}<button class="btn ghost big" id="goPractice">Practice</button></div>
      <div class="panel">
        <div class="feats">
          <div class="feat">${icon('flag', '#37d8e9')}<b>20 arenas</b><span>Races, survival, steals and turf wars. Never the same twice in a row.</span></div>
          <div class="feat">${icon('crown', '#ffd95b')}<b>Best of 3</b><span>Win two rounds. Three different winners? They play a final.</span></div>
          <div class="feat">${icon('shield', '#7ee2b8')}<b>Escrow rules</b><span>${CASH.enabled() ? 'Stakes sit in an escrow contract on Robinhood Chain. Independent servers replay every match before it pays.' : NET.enabled() ? 'Free online play now. Real stakes run through an escrow contract on Robinhood Chain.' : 'The pot is held by contract rules. Test mode simulates them here.'}</span></div>
        </div>
        <div class="ctrls">
          <span><kbd>WASD</kbd> <kbd>Space</kbd> <kbd>Shift</kbd></span><span>Move · jump · dive (a lunge for tackles, chaining dives makes you dizzy)</span>
          <span><kbd>Stick</kbd> <kbd>✕</kbd> <kbd>□</kbd></span><span>Controller: move · jump · dive. <kbd>✕</kbd> also confirms menus.</span>
        </div>
      </div>
      <p class="fine" style="padding:0">${CASH.enabled() ? (CASH.state.cfg.chainId === 4663 ? 'Real ETH on Robinhood Chain. Only stake what you can afford to lose.' : 'Robinhood Chain testnet: stakes are free test ETH from the Robinhood faucet. No real money.') : NET.enabled() ? 'Free play: no wallet, no money. The test-ETH demo is simulated in this browser only.' : 'Test mode: simulated tETH in this browser only. No wallet, no blockchain, no real money.'}</p>
    </div>
  </div>`;
}
function lobbyCard() {
  const n = game.size, { pot, house, champ } = splitPot(game.stake, n);
  const filled = game.deposited ? game.lobbyFilled : 0;
  const seats = Array.from({ length: n }, (_, i) => {
    const on = i < filled, nm = i === 0 ? 'You' : BOT_NAMES[(i - 1) % BOT_NAMES.length];
    return on ? `<div class="seat on${i === 0 ? ' you' : ''}${i === filled - 1 ? ' newest' : ''}"><img src="${portrait(i)}" alt=""><span class="nm">${esc(nm)}</span><span class="label" style="color:var(--mint)">Ready</span></div>`
      : `<div class="seat"><div class="ghost">?</div><span class="nm" style="color:var(--dim)">Open seat</span></div>`;
  }).join('');
  const lacks = wallet < game.stake, locked = game.deposited && filled >= n;
  return `<div class="card lobby">
    <div class="row" style="justify-content:space-between"><h2>${game.deposited ? (locked ? 'Roster locked' : 'Filling the lobby…') : 'Choose your lobby'}</h2><span class="label">${n} players · best 2 of 3</span></div>
    <div class="cols">
      <div style="display:grid;gap:12px;align-content:start">
        ${game.deposited ? '' : `<div style="display:grid;gap:6px"><span class="label">Entry stake</span><div class="seg">${TIERS.map((t) => `<button class="${parseEth(t) === game.stake ? 'sel' : ''}" data-tier="${t}">${t}<small>tETH</small></button>`).join('')}</div></div>
        <div style="display:grid;gap:6px"><span class="label">Players</span><div class="seg">${SIZES.map((s) => `<button class="${s === n ? 'sel' : ''}" data-size="${s}">${s}<small>seats</small></button>`).join('')}</div></div>`}
        <div class="seats">${seats}</div>
      </div>
      <div style="display:grid;gap:12px;align-content:start">
        <div class="receipt">
          <div class="r"><span>Your stake</span><b>${fmtEth(game.stake)} tETH</b></div>
          <div class="r"><span>Pot · ${n} × ${fmtEth(game.stake)}</span><b>${fmtEth(pot)} tETH</b></div>
          <div class="r"><span>House fee · 10%</span><b>${fmtEth(house)} tETH</b></div>
          <div class="r win"><span>Champion takes · 90%</span><b>${fmtEth(champ)}</b></div>
          <div class="r"><span>Longest possible match</span><b>${maxRounds(n)} rounds · ~${Math.ceil(maxRounds(n) * 45 / 60)} min</b></div>
        </div>
        ${game.deposited
          ? `<div class="row"><button class="btn ghost" id="leave" ${locked ? 'disabled' : ''}>Leave · full refund</button><span class="label">${locked ? 'Starting…' : `${filled} / ${n} joined`}</span></div>`
          : `<button class="btn primary big" id="deposit" ${lacks ? 'disabled' : ''}>Deposit ${fmtEth(game.stake)} tETH</button>
             ${lacks ? '<p>Not enough test ETH — tap <b>+ 0.05 tETH</b> at the top.</p>' : ''}
             <button class="btn ghost small" id="back" style="justify-self:start">Back</button>`}
        <ul class="fine"><li>Only the champion is paid; rounding dust goes to the champion.</li><li>Leave any time before the roster locks for a full refund.</li></ul>
      </div>
    </div>
  </div>`;
}
const INTRO_SECONDS = 5;
// Split an objective into short, scannable lines ("Red beams are low: JUMP." → one line each).
function objectiveLines(text) { return text.split(/(?<=[.!])\s+/).map((x) => x.trim()).filter(Boolean); }
function introCard() {
  const watching = game.isFinal && !game.active.some((b) => b.i === game.me);
  return `<div class="card intro" style="--acc:${arenaAccent(arena)}">
    <div class="head"><div class="genre-ic">${genreIcon(arena)}</div><div style="display:grid;gap:4px;min-width:0">
      <span class="label">${game.isFinal ? 'Deciding final' : `Round ${game.round} of 3`} · ${esc(arena.genre)} · 30 s max</span>
      <h1 class="arena-title">${esc(arena.name)}</h1></div></div>
    <ul class="howto">${objectiveLines(arena.objective).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <div class="lineup">${game.active.map(miniHtml).join('')}</div>
    ${watching ? '<p>You did not win a round, so you watch this one.</p>' : ''}
    <div class="row"><button class="btn primary" id="ready">${watching ? 'Watch' : 'Ready'}</button><span class="label">Space · Enter · <kbd>✕</kbd> — starts in <span id="introLeft">${INTRO_SECONDS}</span>s</span></div>
    <div class="introbar"><div id="introFill"></div></div>
  </div>`;
}
function standingsHtml(winner) {
  const list = [...game.beans].sort((a, b) => (game.wins[b.i] - game.wins[a.i]) || (a.i - b.i));
  return `<div class="standings">${list.map((b) => `<div class="st${b === winner ? ' lead' : ''}${b.human ? ' you' : ''}"><img src="${portrait(b.i)}" alt=""><span class="n">${esc(b.name)}</span>${pipsHtml(game.wins[b.i])}</div>`).join('')}</div>`;
}
function roundCard(w) {
  return `<div class="card result">
    <span class="label">${game.isFinal ? 'Deciding final' : `Round ${game.round}`} · ${esc(arena.name)}</span>
    <img class="hero-img" src="${portrait(w.i, 'happy', 128)}" alt="">
    <h2 style="color:${w.color}">${w.human ? 'You win the round!' : `${esc(w.name)} wins the round`}</h2>
    ${standingsHtml(w)}
    ${game.mode === 'online' ? `<p class="label" style="text-align:center">Next arena in a moment…</p>` : `<div class="row" style="justify-content:center"><button class="btn primary big" id="nextRound">${contendersPreview() ? 'To the final' : 'Next arena'}</button></div>`}
    <p>${game.wins[game.me] === 1 ? '<b style="color:var(--butter)">Match point for you.</b> ' : ''}${contendersPreview()}</p>
  </div>`;
}
function contendersPreview() { const w = game.roundWinners; return w.length === 3 && new Set(w).size === 3 ? 'Three different winners — they play a deciding final.' : ''; }
function championCard(w) {
  const n = game.size, { pot, house, champ } = splitPot(game.stake, n);
  const cash = game.mode === 'cash';
  if (cash) setTimeout(() => countUp('payCount', champ), 250);
  return `<div class="card result champ">
    <div class="ch-left">
      <span class="label">Match over · ${game.round} round${game.round === 1 ? "" : "s"}</span>
      <div class="row" style="justify-content:center;gap:0">${TROPHY}<img class="hero-img" src="${portrait(w.i, 'happy', 128)}" alt=""></div>
      <h1 style="font-size:clamp(1.8rem,5vw,2.6rem);color:${w.color}">${w.human ? 'Champion!' : `${esc(w.name)} is champion`}</h1>
      ${cash ? `<div class="count"><span id="payCount">0</span> tETH</div><span class="label">paid to the champion</span>` : game.mode === 'online' && CASH.isCashMatch() ? `<span class="label">Real-money match · ${CASH.unit()}</span>` : game.mode === 'online' ? '<p>Free online match — no stakes involved.</p>' : '<p>Practice match — no stakes involved.</p>'}
    </div>
    <div class="ch-right">
      ${game.mode === 'online' && CASH.isCashMatch() ? CASH.championExtra(w) : ''}
      ${cash ? `<div class="receipt">
        <div class="r"><span>Pot · ${n} × ${fmtEth(game.stake)}</span><b>${fmtEth(pot)} tETH</b></div>
        <div class="r"><span>House 10%</span><b>${fmtEth(house)} tETH</b></div>
        <div class="r win"><span>Your result</span><b style="color:${w.human ? 'var(--mint)' : 'var(--coral)'}">${w.human ? `+${fmtEth(champ - game.stake)}` : `−${fmtEth(game.stake)}`} tETH</b></div>
      </div>
      <div class="steps">
        <div class="step">Result co-signed by 2 of 3 independent servers</div>
        <div class="step">Dispute window closed <span class="label">&nbsp;1 h on-chain · skipped in test</span></div>
        <div class="step">${w.human ? 'Paid to your test wallet' : `Paid to ${esc(w.name)}`}</div>
      </div>` : ''}
      ${standingsHtml(w)}
      <div class="row"><button class="btn primary big" id="again">Play again</button><button class="btn ghost big" id="home">Home</button></div>
    </div>
  </div>`;
}
function countUp(id, wei) {
  const el = document.getElementById(id); if (!el) return;
  const t0 = performance.now(), dur = 1300, target = Number(wei) / 1e18;
  const step = (now) => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = k < 1 ? (target * e).toFixed(4) : fmtEth(wei); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

$('#ov').addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (game.mode === 'online' && ['again', 'nextRound', 'home'].includes(t.id)) return; // handled by NET
  if (t.id === 'goCash') { game.mode = 'cash'; game.deposited = false; game.screen = 'lobby'; showOverlay(lobbyCard()); }
  else if (t.id === 'goPractice') { game.mode = 'practice'; game.size = 4; game.screen = 'match'; startMatch(); }
  else if (t.dataset.tier) { game.stake = parseEth(t.dataset.tier); showOverlay(lobbyCard()); }
  else if (t.dataset.size) { game.size = +t.dataset.size; showOverlay(lobbyCard()); }
  else if (t.id === 'back' || t.id === 'home') { goHome(); }
  else if (t.id === 'deposit') {
    if (wallet < game.stake) return;
    setWallet(wallet - game.stake); game.deposited = true; game.lobbyFilled = 1; SFX.score();
    showOverlay(lobbyCard()); fillLobby();
  }
  else if (t.id === 'leave') { clearTimeout(game.fillTimer); setWallet(wallet + game.stake); game.deposited = false; showOverlay(lobbyCard()); }
  else if (t.id === 'nextRound') { nextRound(); }
  else if (t.id === 'ready') { if (game.mode === 'online') NET.ready(); else startCountdown(); }
  else if (t.id === 'again') { if (game.mode === 'cash') { game.deposited = false; game.screen = 'lobby'; $('#hud').hidden = true; $('#touch').hidden = true; arena = null; showOverlay(lobbyCard()); } else startMatch(); }
});
function fillLobby() {
  game.fillTimer = setTimeout(() => {
    if (!game.deposited) return;
    game.lobbyFilled++; showOverlay(lobbyCard()); tone(500 + game.lobbyFilled * 60, 0.08, 'triangle', 0.05);
    if (game.lobbyFilled < game.size) fillLobby();
    else setTimeout(() => { if (game.deposited) { game.screen = 'match'; startMatch(); } }, 900);
  }, rnd(350, 750));
}
function goHome() { document.body.classList.remove('playing'); game.screen = 'home'; arena = null; $('#hud').hidden = true; $('#touch').hidden = true; showOverlay(homeCard()); }
$('#faucet').addEventListener('click', () => { if (CASH.state.cfg && CASH.state.privy) return; setWallet(wallet + parseEth('0.05')); SFX.score(); if (game.screen === 'lobby' && !game.deposited) showOverlay(lobbyCard()); });
$('#ff').addEventListener('click', () => { game.speed = game.speed === 1 ? 3 : 1; $('#ff').textContent = game.speed === 1 ? 'Fast-forward ×3' : 'Normal speed'; });

// ───────────────────────── HUD ─────────────────────────
let lastHud = '';
function renderHud(force) {
  if (!arena) return;
  const left = Math.max(0, Math.ceil(arena.timeout - game.t));
  const playing = game.phase === 'play';
  const ring = document.getElementById('hRing');
  if (ring) { ring.setAttribute('stroke-dashoffset', String(175.9 * (playing ? clamp(game.t / arena.timeout, 0, 1) : 0))); ring.setAttribute('stroke', playing && left <= 5 ? '#ff557d' : arenaAccent(arena)); }
  const key = `${arena.key}|${left}|${game.wins.join(',')}|${game.phase}|${game.active.map((b) => b.alive ? 1 : 0).join('')}`;
  if (!force && key === lastHud) return; lastHud = key;
  $('#hIcon').innerHTML = genreIcon(arena);
  $('#hName').textContent = `${arena.name} · ${game.isFinal ? 'Final' : 'Round ' + game.round}`;
  $('#hObj').textContent = objectiveLines(arena.objective).slice(0, 2).join(' ');
  $('#hTime').textContent = playing ? left : '–';
  $('#hTimer').classList.toggle('low', playing && left <= 5);
  if (playing && left <= 5 && left > 0 && left !== game.lastTick) { game.lastTick = left; SFX.tick(); }
  $('#hBoard').innerHTML = game.beans.map((b) => `<div class="pl${b.human ? ' you' : ''}${game.active.includes(b) && !b.alive ? ' out' : ''}${game.active.includes(b) ? '' : ' out'}" title="${esc(b.name)}"><img src="${portrait(b.i)}" alt="${esc(b.name)}">${pipsHtml(game.wins[b.i])}</div>`).join('');
}

let last = performance.now();
const AMBIENT = { runway: 'sparkle', hex: 'stars', crown: 'sparkle', laser: 'embers', bubblegum: 'bubbles', turnpike: null, rodeo: 'stars', skyrail: 'snow', floes: 'snow', storm: 'rain', marbles: null, bumper: 'confetti', iceberg: 'snow', crater: 'embers', disco: 'confetti', meteor: 'stars', jelly: 'bubbles', lantern: 'embers', paint: 'sparkle', bounce: 'confetti' };
function bigCenterText(txt, color, scale, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(W / 2, H / 2 + 20); ctx.scale(scale, scale);
  ctx.font = '130px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = 16; ctx.strokeStyle = '#0b0e2a'; ctx.strokeText(txt, 0, 6);
  const g = ctx.createLinearGradient(0, -60, 0, 60); g.addColorStop(0, '#fff'); g.addColorStop(0.45, color); g.addColorStop(1, shade(color, 0.6));
  glow(color, 24, () => { ctx.fillStyle = g; ctx.fillText(txt, 0, 0); });
  ctx.restore();
}
function frameInner(now) {
  let dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  const tt = now / 1000;
  if (game.phase !== 'play') pollPadMenus(); else padConfirmLatch = padState().jump;
  stepFx(dt); stepCam(dt); stepAnnouncer(dt);
  for (const b of game.beans) if (b.cheerT > 0) b.cheerT -= dt;
  const theme = arena ? (arena.theme || 'night') : 'night';
  const amb = arena ? AMBIENT[arena.key] : 'sparkle';
  stepAmbient(amb, dt);
  CAM.shakeX = fx.shake ? rnd(-fx.shake, fx.shake) : 0; CAM.shakeY = fx.shake ? rnd(-fx.shake, fx.shake) : 0;
  applyScreen();
  drawStadium(theme, tt, arena ? arena.name : 'Hot Shots');
  if (!arena) {
    CAM.scrollY = 0; applyWorld(); stageFloor(theme); drawAttract(tt); drawFx();
    applyScreen(); drawAmbient(amb); stageLighting(theme, tt);
    return;
  }
  if (game.mode === 'online') NET.frame(dt);
  else {
    // fixed 60 Hz simulation steps (the arenas are tuned at exactly 1/60 s), ×3 when fast-forwarding
    game.acc = Math.min(0.25, (game.acc || 0) + dt * (game.phase === 'play' ? game.speed : 1));
    while (game.acc >= 1 / 60) { tick(1 / 60); game.acc -= 1 / 60; }
  }
  CAM.scrollY = arena.cam ? (arena.cam() || 0) : 0; // non-scrolling arenas must not inherit a race's scroll
  applyWorld();
  stageFloor(theme);
  if (game.mode === 'online') NET.withPrediction(() => arena.draw(game.t)); else arena.draw(game.t);
  applyWorld(); drawFx();
  applyScreen();
  drawAmbient(amb);
  stageLighting(theme, tt);
  if (game.phase === 'countdown') {
    const n = Math.max(1, Math.ceil(3 - game.phaseT)), frac = game.phaseT % 1;
    ctx.fillStyle = 'rgba(8,10,30,.3)'; ctx.fillRect(0, 0, W, H);
    bigCenterText(String(n), ['#7EE2B8', '#37D8E9', '#FF557D'][n - 1], 1 + Math.max(0, 0.3 - frac) * 2.2, 1);
  }
  if (game.phase === 'play' && game.t < 0.8) { const k = game.t / 0.8; bigCenterText('GO!', '#FFD95B', 1 + k * 0.7, 1 - k); }
  drawAnnouncer();
  const me = meBean();
  const banner = (txt) => { ctx.fillStyle = 'rgba(10,12,34,.8)'; roundRect(W / 2 - 230, H - 112, 460, 34, 17); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '17px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, W / 2, H - 95); };
  if (game.phase === 'play' && me && !game.active.includes(me)) banner('DECIDING FINAL · SPECTATING');
  else if (game.phase === 'play' && me && !me.alive && me.out > 0.8) banner('YOU ARE OUT · SPECTATING');
  if (game.mode === 'online') NET.drawStatus();
  renderHud(false);
}
let frameErrs = 0;
function frame(now) {
  // Never let one bad draw freeze the game: log, reset canvas state, keep the loop alive.
  try { frameInner(now); frameErrs = 0; }
  catch (e) {
    if (frameErrs++ < 3) console.error(e);
    try { ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; ctx.setLineDash([]); } catch (_) {}
    try { if (game.phase === 'play' || game.phase === 'countdown' || game.phase === 'intro') { const s = Math.min(game.speed || 1, 3); for (let k = 0; k < s; k++) tick(1 / 60); renderHud(false); } } catch (_) {}
  }
  requestAnimationFrame(frame);
}
let lastCount = 0;
function tick(dt) {
  game.phaseT += dt;
  if (game.phase === 'intro') {
    const left = Math.max(0, INTRO_SECONDS - game.phaseT);
    const el = document.getElementById('introLeft'); if (el) el.textContent = Math.ceil(left);
    const bar = document.getElementById('introFill'); if (bar) bar.style.width = (left / INTRO_SECONDS) * 100 + '%';
    if (left <= 0 && game.mode !== 'online') startCountdown();
    return;
  }
  if (game.phase === 'countdown') {
    const c = Math.ceil(3 - game.phaseT); if (c !== lastCount) { lastCount = c; SFX.count(c); }
    if (game.phaseT > 3 && game.mode !== 'online') { game.phase = 'play'; game.phaseT = 0; game.t = 0; snapScores(); }
    return;
  }
  if (game.phase !== 'play') {
    // after the result: everything coasts in slow motion while the camera pushes in on the winner
    const slow = game.phaseT < 1.6 ? 0.25 : 0.12;
    ROUND.coast(dt * slow);
    if (game.phaseT > 1.6 && CAM.tz !== 1) camReset();
    return;
  }
  const me = meBean(), inputs = {};
  if (me && game.active.includes(me)) inputs[me.i] = SIM0.packInput(humanInput());
  stepRound(() => ROUND.step(inputs));
}
// One simulation tick plus the presentation around it (shared by practice and online play).
function stepRound(step) {
  const prevT = ROUND.t, aliveBefore = game.active.map((b) => b.alive);
  step();
  game.t = ROUND.t;
  if (prevT < arena.timeout - 10 && game.t >= arena.timeout - 10) announce('10 SECONDS!', '#FF557D');
  game.active.forEach((b, k) => { if (aliveBefore[k] && !b.alive) fxOut(b); });
  const aliveNow = game.active.filter((b) => b.alive).length, aliveWas = aliveBefore.filter(Boolean).length;
  if (aliveNow < aliveWas && game.active.length > 2) {
    if (aliveNow === 2) announce('FINAL TWO!', '#FFD95B'); else if (aliveNow === 3 && game.active.length > 3) announce('3 LEFT!', '#37D8E9');
  }
  checkScores();
  const me = meBean();
  $('#ff').hidden = game.mode === 'online' || (me && game.active.includes(me) && me.alive);
  if (ROUND.winner && game.mode !== 'online') endRound(ROUND.winner);
}
// Generic score pop-ups: watch each arena's progress fields and celebrate when they tick up.
function scoreKey(b) {
  return { pts: (b.bank || 0) + (b.stars || 0) + (b.next || 0) + (b.got ? b.got.length : 0) + (b.done ? 1 : 0), sec: Math.floor(b.cap || 0), lap: Math.floor(Math.max(0, b.prog || 0) / (2 * Math.PI)) };
}
function snapScores() { for (const b of game.active) b.sk = scoreKey(b); }
function checkScores() {
  for (const b of game.active) {
    const k = scoreKey(b), o = b.sk || k;
    if (k.pts > o.pts) fxScore(b, b.done ? 'DONE!' : '+1');
    if (k.sec > o.sec) fxScore(b, `${k.sec}s`);
    if (k.lap > o.lap && k.lap < 3) fxScore(b, `LAP ${k.lap + 1}`);
    if (k.pts < o.pts && b.human) popText(b.x, b.y - 46, 'STOLEN!', '#FF557D', 18);
    b.sk = k;
  }
}
function endRound(w) {
  game.phase = 'done'; game.phaseT = 0; game.speed = 1; $('#ff').hidden = true; $('#ff').textContent = 'Fast-forward ×3';
  if (game.mode !== 'online') { game.wins[w.i]++; game.roundWinners.push(w.i); } // online: the server's tally arrives with 'end'
  fxWin(w); if (w.human) shake(6);
  camFocus(w.x, w.y, 1.35);
  announce(w.human ? 'YOU WIN THE ROUND!' : `${w.name.toUpperCase()} WINS!`, w.color, game.wins[w.i] >= WINS_TO_CHAMPION ? 'CHAMPION!' : game.wins[w.i] === 1 ? 'Match point' : '');
  renderHud(true);
  if (w.human) SFX.win(); else { SFX.lose(); crowdRoar(0.8); }
  if (game.mode === 'online') return; // the server drives what comes next
  if (game.wins[w.i] >= WINS_TO_CHAMPION) {
    if (game.mode === 'cash' && w.human) setWallet(wallet + splitPot(game.stake, game.size).champ);
    setTimeout(() => showOverlay(championCard(w)), 1900);
  } else setTimeout(() => showOverlay(roundCard(w)), 1700);
}

// Attract mode behind the home screen: the eight beans goofing around on a lit stage.
const AC = { x: 655, y: 330, r: 215 }; // stage sits right of the title column
const attract = Array.from({ length: 8 }, (_, i) => Object.assign(makeBean(i, false), { x: AC.x + rnd(-150, 150), y: AC.y + rnd(-110, 110), tx: AC.x, ty: AC.y }));
function drawAttract(t) {
  lightPool(AC.x, AC.y, 330, 'rgba(55,216,233,1)', 0.12);
  platformCircle(AC.x, AC.y, AC.r, mat('rubber'), '#1a2150', 22);
  glow('#37D8E9', 14, () => { ctx.strokeStyle = 'rgba(95,240,255,.85)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(AC.x, AC.y, AC.r - 4, 0, Math.PI * 2); ctx.stroke(); });
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 10; for (let r = 40; r < AC.r - 20; r += 46) { ctx.beginPath(); ctx.arc(AC.x, AC.y, r, 0, Math.PI * 2); ctx.stroke(); }
  for (const b of attract) {
    if (hyp(b.tx - b.x, b.ty - b.y) < 20) { const a = rnd(0, 6.28), r = rnd(0, AC.r - 40); b.tx = AC.x + Math.cos(a) * r; b.ty = AC.y + Math.sin(a) * r; }
    const d = norm(b.tx - b.x, b.ty - b.y);
    stepBean(b, { x: d.x * 0.55, y: d.y * 0.55, jump: Math.random() < 0.008, dive: Math.random() < 0.003 }, 1 / 60, 160);
    if (b.cheerT > 0) b.cheerT -= 1 / 60; else if (Math.random() < 0.002) { b.cheerT = 1.5; b.happyT = 1.5; }
  }
  collide(attract);
  drawAll(attract);
}

