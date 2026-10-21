// ───────────────────────── ONLINE PLAY ─────────────────────────
// The server runs every online match. This browser connects over a WebSocket, sends only its stick/buttons,
// and replays the server's stream (inputs + random draws per tick) with the same deterministic simulation,
// so what you see is exactly what the server decided. Drops reconnect and resume automatically.
const NET = (() => {
  const N = {
    ws: null, status: 'off', token: store.get('hs_token'), name: store.get('hs_name') || '', rtt: 0, F: null,
    lobby: null, end: null, champ: null, lastP: -1, pingAt: 0, backoff: 0, wanted: false, queueSize: 4, err: '',
  };
  const enabled = () => typeof ONLINE !== 'undefined' && ONLINE && location.protocol.startsWith('http');
  const send = (o) => { if (N.ws && N.ws.readyState === 1) N.ws.send(JSON.stringify(o)); };
  function connect() {
    if (N.ws && N.ws.readyState <= 1) return;
    N.status = 'connecting';
    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
    N.ws = ws;
    ws.onopen = () => { N.backoff = 0; send({ t: 'hello', name: N.name, token: N.token }); };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } try { on(m); } catch (err) { console.error('net', m.t, err); } };
    ws.onclose = () => {
      if (N.ws !== ws) return;
      N.status = 'off';
      if (N.wanted) setTimeout(connect, Math.min(5000, 300 * 2 ** N.backoff++)); // back off, keep trying
    };
  }
  function on(m) {
    switch (m.t) {
      case 'welcome':
        N.token = m.token; store.set('hs_token', m.token); N.status = 'online';
        if (N.queueing) { send({ t: 'queue', mode: 'free', size: N.queueSize }); N.queueing = false; }
        return;
      case 'pong': N.rtt = N.rtt ? N.rtt * 0.7 + (performance.now() - m.c) * 0.3 : performance.now() - m.c; return;
      case 'error': N.err = m.msg; if (game.screen === 'onlineSetup') showOverlay(setupCard()); return;
      case 'lobby': N.lobby = m; game.screen = 'onlineLobby'; N.lobbyAt = performance.now(); showOverlay(lobbyCardOnline()); return;
      case 'left': return;
      case 'match': return startOnline(m);
      case 'round': return round(m);
      case 'intro': if (game.phase === 'intro') game.phaseT = Math.max(game.phaseT, INTRO_SECONDS - m.ms / 1000); return;
      case 'count': if (game.phase === 'intro') { game.phase = 'countdown'; game.phaseT = 0; showOverlay(''); } return;
      case 'tk': if (N.F && N.F.R) N.F.addFrames(m.k, m.f); return;
      case 'h': if (N.F) N.F.checkpoint(m.k, m.h); return;
      case 'end': if (N.F) N.F.ended(m); N.end = m; return; // tally is shown when playback reaches the finish
      case 'champ': N.champ = m; return;
      case 'presence': { const p = game.players.find((x) => x.i === m.i); if (p && m.i !== game.me) feed(`${p.name} ${m.on ? 'is back' : 'lost connection'}`, m.on ? '#7EE2B8' : '#FF557D'); return; }
      case 'sync': return resync(m);
      case 'closed': if (m.reason !== 'finished') { N.wanted = false; goHome(); } return;
    }
  }
  function startOnline(m) {
    game.mode = 'online'; game.screen = 'match'; game.size = m.size; game.me = m.you;
    game.players = m.seats.map((s) => ({ i: s.i, name: s.i === m.you ? 'You' : s.name, human: s.i === m.you, bot: s.bot }));
    game.wins = m.seats.map(() => 0); game.roundWinners = []; game.history = []; game.round = 0; N.champ = null;
    N.F = createFollower({ createSim, fx: FX_ENV, me: m.you, onDesync: (why) => { console.warn('desync', why); send({ t: 'resync' }); } });
  }
  function round(m) {
    if (!N.F) return;
    N.end = null; N.champ = null; N.shown = false;
    const r = N.F.round(withNames(m));
    bindRound(r);
    game.round = m.n; game.wins = m.wins; game.roundWinners = m.rw; game.history.push(m.key);
    beginIntro(m.introMs / 1000);
  }
  const withNames = (m) => ({ ...m, players: m.players.map((p) => ({ ...p, name: p.i === game.me ? 'You' : p.name })) });
  function resync(m) {
    if (!N.F || N.F.me !== m.match.you) startOnline(m.match);
    game.wins = m.wins; game.roundWinners = m.rw;
    if (m.lobby) { N.lobby = m.lobby; game.screen = 'onlineLobby'; showOverlay(lobbyCardOnline()); return; }
    if (m.champ) { N.champ = m.champ; return; }
    const r = N.F.sync({ ...m, round: withNames(m.round) });
    if (!r) return;
    bindRound(r); game.round = m.round.n;
    const left = m.msLeft / 1000;
    if (m.state === 'intro') beginIntro(left);
    else {
      showOverlay(''); $('#hud').hidden = false; document.body.classList.add('playing');
      game.phase = m.state === 'count' ? 'countdown' : m.state === 'play' ? 'play' : 'done';
      game.phaseT = m.state === 'count' ? 3 - left : 0; game.t = r.t; snapScores();
      if (m.end) { N.end = { w: m.end.w, wins: m.wins, rw: m.rw }; }
    }
  }
  // ── own-bean prediction: show your bean reacting immediately. The confirmed (server) state lags by about
  // one round trip + the jitter cushion, so re-apply your own most recent presses on a copy of your bean.
  // Display only: other players, hits and results always come from the confirmed simulation.
  const hist = [];
  const PRED = createSim({ seed: 3 }); // no effects/sounds: purely a movement model
  let shown = null;
  function predicted() {
    const me = meBean();
    if (game.phase !== 'play' || !me || !me.alive || !game.active.includes(me) || !N.F) { shown = null; return null; }
    const lagMs = N.rtt + N.F.buffered * (1000 / 60) + 12;
    const L = Math.max(0, Math.min(18, Math.round(lagMs / (1000 / 60))));
    const b = { ...me }, now = performance.now();
    for (let j = L; j >= 1; j--) {
      const at = now - j * (1000 / 60);
      let p = SIM0.IDLE_INPUT; for (const h of hist) { if (h.t <= at) p = h.p; else break; }
      PRED.stepBean(b, PRED.unpackInput(p), 1 / 60, arena.maxSpeed, arena.diveSpeed, arena.mods ? arena.mods(me) : null);
    }
    if (!shown || Math.abs(shown.x - b.x) + Math.abs(shown.y - b.y) > 90) shown = { x: b.x, y: b.y, z: b.z };
    else { shown.x += (b.x - shown.x) * 0.55; shown.y += (b.y - shown.y) * 0.55; shown.z += (b.z - shown.z) * 0.6; }
    return { me, b };
  }
  // draw with your bean temporarily moved to its predicted spot, then put the confirmed state back
  function withPrediction(draw) {
    const pr = predicted();
    if (!pr) return draw();
    const { me, b } = pr, keep = { x: me.x, y: me.y, z: me.z, fx: me.fx, fy: me.fy, vx: me.vx, vy: me.vy, walk: me.walk, diveT: me.diveT, proneT: me.proneT, sq: me.sq };
    Object.assign(me, { x: shown.x, y: shown.y, z: Math.max(0, shown.z), fx: b.fx, fy: b.fy, vx: b.vx, vy: b.vy, walk: b.walk, diveT: b.diveT, proneT: b.proneT, sq: b.sq });
    try { draw(); } finally { Object.assign(me, keep); }
  }
  // ── every animation frame while online
  let pingT = 0;
  function frame(dt) {
    if ((pingT += dt) > 2) { pingT = 0; send({ t: 'ping', c: performance.now() }); }
    // inputs: only changes are sent; the server applies the latest at each 60 Hz tick
    const live = game.phase === 'intro' || game.phase === 'countdown' || game.phase === 'play';
    const p = live ? SIM0.packInput(humanInput()) : SIM0.IDLE_INPUT;
    if (p !== N.lastP && N.ws && N.ws.readyState === 1) { N.lastP = p; send({ t: 'in', p }); }
    const now = performance.now(); hist.push({ t: now, p }); while (hist.length > 2 && hist[1].t < now - 600) hist.shift();
    if (!ROUND || !N.F || !N.F.R) return;
    if (game.phase === 'intro' || game.phase === 'countdown') tick(dt); // timers + countdown sounds
    if (game.phase === 'countdown' || game.phase === 'play') {
      const n = N.F.pace(dt * 1000);
      for (let k = 0; k < n; k++) {
        if (game.phase === 'countdown') { game.phase = 'play'; game.phaseT = 0; snapScores(); }
        stepRound(() => N.F.step(1));
        if (ROUND.winner) { roundOver(); break; }
      }
    } else if (game.phase === 'done') {
      tick(dt);
      if (N.champ && !N.shown && game.phaseT > 1.9) { N.shown = true; showOverlay(championCard(game.beans.find((b) => b.i === N.champ.w))); }
      else if (!N.champ && !N.shown && game.phaseT > 1.7 && N.end && N.end.champ == null) { N.shown = true; showOverlay(roundCard(game.beans.find((b) => b.i === N.end.w))); }
    }
  }
  function roundOver() {
    const e = N.end, w = (e && game.beans.find((b) => b.i === e.w)) || ROUND.winner; // the server's word is final
    if (e) { game.wins = e.wins; game.roundWinners = e.rw; }
    endRound(w);
  }
  function drawStatus() {
    inScreen(() => {
      const ok = N.ws && N.ws.readyState === 1;
      ctx.font = '700 11px "Baloo 2", sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const ms = Math.round(N.rtt), col = !ok ? '#FF557D' : ms < 90 ? '#7EE2B8' : ms < 160 ? '#FFD95B' : '#FF8F5B';
      ctx.fillStyle = 'rgba(10,13,36,.7)'; roundRect(W - 92, H - 30, 80, 18, 9); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(W - 82, H - 21, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(ok ? `${ms} ms` : 'reconnecting', W - 18, H - 21);
      if (!ok) { ctx.fillStyle = 'rgba(10,12,34,.82)'; roundRect(W / 2 - 150, 130, 300, 34, 17); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '15px Bungee, sans-serif'; ctx.fillText('RECONNECTING…', W / 2, 148); }
    });
  }
  // ── screens
  function setupCard() {
    return `<div class="card lobby">
      <div class="row" style="justify-content:space-between"><h2>Play online</h2><span class="label">free play · best 2 of 3</span></div>
      <div class="cols">
        <div style="display:grid;gap:14px;align-content:start">
          <label style="display:grid;gap:6px"><span class="label">Your name</span>
            <input id="netName" class="field" maxlength="14" autocomplete="nickname" placeholder="Player" value="${esc(N.name)}"></label>
          <div style="display:grid;gap:6px"><span class="label">Players</span><div class="seg">${[2, 4, 6, 8].map((s) => `<button class="${s === N.queueSize ? 'sel' : ''}" data-netsize="${s}">${s}<small>seats</small></button>`).join('')}</div></div>
          ${N.err ? `<p style="color:var(--coral)">${esc(N.err)}</p>` : ''}
        </div>
        <div style="display:grid;gap:12px;align-content:start">
          <div class="receipt">
            <div class="r"><span>Entry</span><b>Free</b></div>
            <div class="r"><span>Matchmaking</span><b>Real players first</b></div>
            <div class="r"><span>Empty seats</span><b>Bots after 12 s</b></div>
          </div>
          <button class="btn primary big" id="netFind">Find a match</button>
          <button class="btn ghost small" id="back" style="justify-self:start">Back</button>
          <ul class="fine"><li>The server runs every match; your browser shows exactly what it decided.</li><li>Lost connection? You rejoin your seat automatically.</li></ul>
        </div>
      </div>
    </div>`;
  }
  function lobbyCardOnline() {
    const L = N.lobby; if (!L) return '';
    const left = L.fillInMs == null ? null : Math.max(0, Math.ceil((L.fillInMs - (performance.now() - N.lobbyAt)) / 1000));
    const seats = Array.from({ length: L.size }, (_, i) => {
      const s = L.seats[i];
      return s ? `<div class="seat on${s.i === L.you ? ' you' : ''}"><img src="${portrait(s.i)}" alt=""><span class="nm">${esc(s.i === L.you ? 'You' : s.name)}</span><span class="label" style="color:var(--mint)">Ready</span></div>`
        : `<div class="seat"><div class="ghost">?</div><span class="nm" style="color:var(--dim)">Open seat</span></div>`;
    }).join('');
    return `<div class="card lobby">
      <div class="row" style="justify-content:space-between"><h2>Finding players…</h2><span class="label">${L.size} players · free play</span></div>
      <div class="seats">${seats}</div>
      <div class="row"><button class="btn ghost" id="netLeave">Leave</button><span class="label" id="netFill">${L.seats.length} / ${L.size} joined${left != null ? ` · bots fill empty seats in ${left}s` : ''}</span></div>
    </div>`;
  }
  // keep the lobby countdown ticking
  setInterval(() => { if (game.screen === 'onlineLobby' && N.lobby) { const el = document.getElementById('netFill'); if (el) { const L = N.lobby, left = L.fillInMs == null ? null : Math.max(0, Math.ceil((L.fillInMs - (performance.now() - N.lobbyAt)) / 1000)); el.textContent = `${L.seats.length} / ${L.size} joined${left != null ? ` · bots fill empty seats in ${left}s` : ''}`; } } }, 250);
  $('#ov').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'goOnline') { N.err = ''; game.screen = 'onlineSetup'; showOverlay(setupCard()); setTimeout(() => $('#netName')?.focus(), 50); }
    else if (t.dataset.netsize) { N.queueSize = +t.dataset.netsize; showOverlay(setupCard()); }
    else if (t.id === 'netFind') {
      N.name = ($('#netName')?.value || '').trim().slice(0, 14) || 'Player'; store.set('hs_name', N.name);
      N.wanted = true; N.err = '';
      if (N.ws && N.ws.readyState === 1) { send({ t: 'hello', name: N.name, token: N.token }); send({ t: 'queue', mode: 'free', size: N.queueSize }); }
      else { N.queueing = true; connect(); }
      t.disabled = true; t.textContent = 'Connecting…';
    }
    else if (t.id === 'netLeave' || (t.id === 'home' && game.mode === 'online')) { send({ t: 'leave' }); N.wanted = false; N.F = null; game.mode = 'practice'; goHome(); }
    else if (t.id === 'again' && game.mode === 'online') { game.screen = 'onlineSetup'; showOverlay(setupCard()); }
  });
  // reload mid-match? pick the seat back up
  if (enabled() && N.token) { N.wanted = true; connect(); }
  function ready() {
    send({ t: 'ready' });
    const b = document.getElementById('ready'); if (b) { b.disabled = true; b.textContent = 'Waiting for others…'; }
  }
  return { enabled, frame, drawStatus, ready, withPrediction, get state() { return N; } };
})();
