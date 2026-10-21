// ───────────────────────── REAL-MONEY PLAY (testnet ETH on Robinhood Chain, via Privy) ─────────────────────────
// The wallet lives in Privy (email login creates one automatically, or connect MetaMask etc.). Stakes go
// from YOUR wallet into the escrow contract; only the contract pays out (90% champion / 10% house), after
// independent co-signers replay the match and a 1-hour dispute window passes. Leave before the lobby
// locks and you get your stake back.
const CASH = (() => {
  const C = { cfg: null, privy: null, w: null, bal: null, verified: null, stake: null, size: 4, lobby: null, busy: '', err: '', tx: null, match: null, settle: null };
  const FAUCET = 'https://faucet.testnet.chain.robinhood.com/';
  const GAS_BUFFER = parseEth('0.0003');
  const W = () => window.HSWallet;
  const short = (a) => a ? a.slice(0, 6) + '…' + a.slice(-4) : '';
  const enabled = () => !!(C.cfg && C.cfg.enabled && C.privy && W());
  const unit = () => (C.cfg && C.cfg.chainId === 4663 ? 'ETH' : 'tETH');

  async function loadConfig() {
    if (!NET.enabled()) return;
    try {
      const j = await (await fetch('/api/config')).json();
      C.cfg = j.cash; C.privy = j.privyAppId;
      if (C.cfg && C.cfg.tiers && !C.stake) C.stake = C.cfg.tiers[Math.min(2, C.cfg.tiers.length - 1)];
    } catch {}
    renderPill(); if (game.screen === 'home') showOverlay(homeCard());
    if (!C.cfg || C.cfg.status !== 'ready') setTimeout(loadConfig, 20000); // server may still be deploying the escrow
  }
  async function refresh() {
    C.w = W() ? W().state() : null;
    if (C.w && C.w.address) { try { const b = await W().balance(); C.bal = b == null ? null : BigInt(b); } catch {} } else C.bal = null;
    if (C.verified && (!C.w || !C.w.address || C.w.address.toLowerCase() !== C.verified.toLowerCase())) C.verified = null;
    renderPill(); rerender();
  }
  addEventListener('hswallet', refresh);
  setInterval(() => { if (C.w && C.w.address) refresh(); }, 12000);
  // redraw only when something visible changed (a redraw mid-click would swallow the click)
  let lastHtml = '';
  const paint = (html) => { if (html !== lastHtml || $('#ov').hidden) { lastHtml = html; showOverlay(html); } };
  const rerender = () => { if (game.screen === 'cashSetup') paint(setupCard()); else if (game.screen === 'cashLobby') paint(lobbyCard()); };

  // ── wallet pill in the top bar
  function renderPill() {
    const badge = $('#modeBadge');
    if (badge && NET.enabled()) { const live = C.cfg && C.cfg.enabled; badge.textContent = live ? (C.cfg.chainId === 4663 ? 'Mainnet' : 'Testnet') : 'Beta'; }
    const pill = document.querySelector('.wallet'); if (!pill) return;
    if (!C.cfg || !C.privy) return; // offline/demo: keep the simulated test wallet
    const amt = pill.querySelector('.amt'), btn = $('#faucet');
    const net = C.cfg.chainId === 4663 ? 'Robinhood Chain' : 'Robinhood testnet';
    if (!C.w || !C.w.authenticated || !C.w.address) {
      amt.innerHTML = `<small>${net}</small><b>Not signed in</b>`;
      btn.textContent = 'Sign in'; btn.dataset.act = 'login';
    } else {
      amt.innerHTML = `<small>${short(C.w.address)}</small><b>${C.bal == null ? '…' : fmt4(C.bal)} ${unit()}</b>`;
      btn.textContent = C.bal != null && C.bal < parseEth('0.002') ? `Get ${unit()}` : 'Wallet'; btn.dataset.act = C.bal != null && C.bal < parseEth('0.002') ? 'faucet' : 'menu';
    }
  }
  const fmt4 = (w) => { const s = fmtEth(w); const [a, b = ''] = s.split('.'); return b ? `${a}.${b.slice(0, 4)}` : a; };
  // the pill's button belongs to real money once the server offers it
  $('#faucet').addEventListener('click', (e) => {
    if (!C.cfg || !C.privy) return; // demo faucet handler in 90_game
    e.stopImmediatePropagation();
    const act = e.currentTarget.dataset.act;
    if (act === 'login') W() && W().login();
    else if (act === 'faucet') { game.screen = 'cashSetup'; C.showFund = true; showOverlay(setupCard()); }
    else { game.screen = 'cashSetup'; C.showFund = false; showOverlay(setupCard()); }
  }, true);

  // ── screens
  function walletBlock() {
    if (!W()) return `<p class="label">Loading wallet…</p>`;
    if (!C.w || !C.w.ready) return `<p class="label">Loading wallet…</p>`;
    if (!C.w.authenticated || !C.w.address) return `<button class="btn primary big" id="cashLogin">Sign in to play</button><p class="fine" style="padding:0">Email login creates a wallet for you. You can also connect MetaMask or another wallet.</p>`;
    const stake = parseEth(C.stake), low = C.bal != null && C.bal < stake + GAS_BUFFER;
    const fund = `<div class="notice"><b>Add ${unit()} to play</b><span>You need ${C.stake} ${unit()} for the stake plus a little for gas. Send testnet ETH to your wallet:</span>
      <div class="addr"><code>${esc(C.w.address)}</code><button class="btn ghost small" id="cashCopy">Copy</button></div>
      <a class="btn ghost small" href="${FAUCET}" target="_blank" rel="noopener">Open the Robinhood testnet faucet ↗</a></div>`;
    return `${low || C.showFund ? fund : ''}
      <button class="btn primary big" id="cashFind" ${low || C.busy ? 'disabled' : ''}>${C.busy || (C.verified ? `Find a ${C.size}-player lobby` : 'Verify wallet & find a lobby')}</button>
      <div class="row" style="gap:8px"><span class="label">${esc(short(C.w.address))} · ${C.bal == null ? '…' : fmt4(C.bal)} ${unit()}</span>${C.w.embedded ? '<button class="btn ghost small" id="cashExport">Export key</button>' : ''}<button class="btn ghost small" id="cashLogout">Sign out</button></div>`;
  }
  function setupCard() {
    const tiers = (C.cfg && C.cfg.tiers) || TIERS, sizes = (C.cfg && C.cfg.sizes) || SIZES;
    const stake = parseEth(C.stake || tiers[0]), { pot, house, champ } = splitPot(stake, C.size);
    return `<div class="card lobby">
      <div class="row" style="justify-content:space-between"><h2>Play for ${unit()}</h2><span class="label">${C.cfg && C.cfg.chainId === 4663 ? 'Robinhood Chain' : 'Robinhood Chain testnet'} · best 2 of 3</span></div>
      <div class="cols">
        <div style="display:grid;gap:12px;align-content:start">
          <div style="display:grid;gap:6px"><span class="label">Entry stake</span><div class="seg">${tiers.map((t) => `<button class="${t === C.stake ? 'sel' : ''}" data-ctier="${t}">${t}<small>${unit()}</small></button>`).join('')}</div></div>
          <div style="display:grid;gap:6px"><span class="label">Players</span><div class="seg">${sizes.map((s) => `<button class="${s === C.size ? 'sel' : ''}" data-csize="${s}">${s}<small>seats</small></button>`).join('')}</div></div>
          <div class="receipt">
            <div class="r"><span>Your stake</span><b>${fmtEth(stake)} ${unit()}</b></div>
            <div class="r"><span>Pot · ${C.size} × ${fmtEth(stake)}</span><b>${fmtEth(pot)} ${unit()}</b></div>
            <div class="r"><span>House fee · 10%</span><b>${fmtEth(house)} ${unit()}</b></div>
            <div class="r win"><span>Champion takes · 90%</span><b>${fmtEth(champ)}</b></div>
          </div>
        </div>
        <div style="display:grid;gap:12px;align-content:start">
          ${walletBlock()}
          ${C.err ? `<p style="color:var(--coral)">${esc(C.err)}</p>` : ''}
          <button class="btn ghost small" id="back" style="justify-self:start">Back</button>
          <ul class="fine"><li>Your stake goes into the Hot Shots escrow contract, not to us. Leave before the lobby locks for a full refund.</li><li>Real players only. If the lobby doesn't fill in 10 minutes, everyone is refunded automatically.</li><li>Results are replayed and co-signed by independent servers; payout follows a 1-hour dispute window.</li></ul>
        </div>
      </div>
    </div>`;
  }
  function lobbyCard() {
    const L = C.lobby; if (!L) return '';
    const left = Math.max(0, Math.ceil((L.deadlineMs - (performance.now() - L.at)) / 1000));
    const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    const seats = Array.from({ length: L.size }, (_, i) => {
      const s = L.seats[i];
      return s ? `<div class="seat on${s.you ? ' you' : ''}"><img src="${portrait(i)}" alt=""><span class="nm">${s.you ? 'You' : esc(short(s.wallet))}</span><span class="label" style="color:var(--mint)">Deposited</span></div>`
        : `<div class="seat"><div class="ghost">?</div><span class="nm" style="color:var(--dim)">Open seat</span></div>`;
    }).join('');
    const status = L.state === 'opening' ? 'Opening the lobby on Robinhood Chain…' : L.state === 'locking' ? 'Locking the roster on chain…' : L.state === 'cancelled' ? 'The lobby did not fill. Every deposit is being refunded automatically.' : L.state === 'failed' ? `Could not open the lobby: ${esc(L.error || 'unknown error')}` : L.youDeposited ? `You're in. Waiting for ${L.size - L.seats.length} more · lobby closes in ${mm}` : `Deposit to take a seat · ${L.seats.length} / ${L.size} in · closes in ${mm}`;
    const txLink = C.tx && W() && W().explorerTx(C.tx) ? ` <a href="${W().explorerTx(C.tx)}" target="_blank" rel="noopener">view tx ↗</a>` : '';
    return `<div class="card lobby">
      <div class="row" style="justify-content:space-between"><h2>${L.state === 'locking' ? 'Starting…' : 'Real-money lobby'}</h2><span class="label">${L.size} players · ${L.stake} ${unit()} each</span></div>
      <div class="seats">${seats}</div>
      <p id="cashStatus">${status}${txLink}</p>
      ${C.err ? `<p style="color:var(--coral)">${esc(C.err)}</p>` : ''}
      <div class="row">
        ${L.state === 'open' && !L.youDeposited ? `<button class="btn primary big" id="cashDeposit" ${C.busy ? 'disabled' : ''}>${C.busy || `Deposit ${L.stake} ${unit()}`}</button>` : ''}
        ${L.youDeposited && L.state === 'open' ? `<button class="btn ghost" id="cashLeave" ${C.busy ? 'disabled' : ''}>${C.busy || 'Leave · full refund'}</button>` : ''}
        ${!L.youDeposited && L.state !== 'locking' ? `<button class="btn ghost" id="cashBack">Back</button>` : ''}
      </div>
      <p class="fine">Escrow <code>${esc(short(L.escrow))}</code> · match <code>${esc(L.matchId.slice(0, 10))}…</code></p>
    </div>`;
  }
  setInterval(() => { if (game.screen === 'cashLobby' && C.lobby && C.lobby.state === 'open' && !C.busy) paint(lobbyCard()); }, 1000);

  // ── actions
  const errText = (e) => { const m = (e && (e.shortMessage || e.message)) || String(e); return /reject|denied|cancel/i.test(m) ? 'Cancelled in your wallet.' : m.replace(/^Error:\s*/, '').slice(0, 180); };
  async function verifyAndQueue() {
    C.err = ''; C.busy = 'Connecting…'; rerender();
    try {
      await NET.connectAsync();
      if (!C.verified) {
        C.busy = 'Sign the message in your wallet…'; rerender();
        const addr = C.w.address, nonce = NET.state.nonce;
        const msg = `Sign in to Hot Shots\n\nWallet: ${addr}\nNonce: ${nonce}\nChain: ${C.cfg.chainId}\n\nThis only proves you own this wallet. It costs nothing and moves no funds.`;
        const sig = await W().sign(msg);
        const ok = await NET.request({ t: 'auth', address: addr, sig }, ['authOk', 'authFail']);
        if (ok.t !== 'authOk') throw new Error(ok.msg || 'Wallet check failed');
        C.verified = ok.wallet;
      }
      C.busy = 'Finding a lobby…'; rerender();
      NET.send({ t: 'queue', mode: 'cash', size: C.size, stake: C.stake });
    } catch (e) { C.err = errText(e); C.busy = ''; rerender(); }
  }
  async function deposit() {
    const L = C.lobby; C.err = ''; C.busy = 'Confirm in your wallet…'; showOverlay(lobbyCard());
    try {
      C.tx = await W().deposit(L.matchId, L.stake);
      C.busy = 'Depositing…'; showOverlay(lobbyCard());
      const st = await W().waitTx(C.tx);
      if (st !== 'success') throw new Error('The deposit transaction failed.');
      L.youDeposited = true; SFX.score();
    } catch (e) { C.err = errText(e); }
    C.busy = ''; refresh(); showOverlay(lobbyCard());
  }
  async function leave() {
    const L = C.lobby; C.err = ''; C.busy = 'Confirm in your wallet…'; showOverlay(lobbyCard());
    try {
      C.tx = await W().leave(L.matchId); C.busy = 'Refunding…'; showOverlay(lobbyCard());
      if ((await W().waitTx(C.tx)) !== 'success') throw new Error('The refund transaction failed.');
      NET.send({ t: 'leaveCash' }); C.lobby = null; C.busy = ''; refresh(); game.screen = 'cashSetup'; showOverlay(setupCard()); return;
    } catch (e) { C.err = errText(e); }
    C.busy = ''; showOverlay(lobbyCard());
  }
  $('#ov').addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'goCashReal') openSetup();
    else if (t.dataset.ctier) { C.stake = t.dataset.ctier; showOverlay(setupCard()); }
    else if (t.dataset.csize) { C.size = +t.dataset.csize; showOverlay(setupCard()); }
    else if (t.id === 'cashLogin') W() && W().login();
    else if (t.id === 'cashLogout') { W() && W().logout(); C.verified = null; }
    else if (t.id === 'cashExport') W() && W().exportWallet().catch(() => {});
    else if (t.id === 'cashCopy') { navigator.clipboard?.writeText(C.w.address); t.textContent = 'Copied'; }
    else if (t.id === 'cashFind') verifyAndQueue();
    else if (t.id === 'cashDeposit') deposit();
    else if (t.id === 'cashLeave') leave();
    else if (t.id === 'cashBack') { NET.send({ t: 'leaveCash' }); C.lobby = null; game.screen = 'cashSetup'; showOverlay(setupCard()); }
  });

  // ── server messages (routed from NET)
  function onLobby(m) {
    C.lobby = { ...m, at: performance.now() }; C.busy = C.busy === 'Finding a lobby…' ? '' : C.busy;
    if (game.screen === 'cashSetup' || game.screen === 'cashLobby') { game.screen = 'cashLobby'; showOverlay(lobbyCard()); }
  }
  function onMatch(m) { C.match = { matchId: C.lobby ? C.lobby.matchId : null, stake: m.stake, size: m.size }; C.settle = null; }
  // ── after the match: show settlement progress on the champion card
  async function pollSettlement() {
    const id = C.match && C.match.matchId; if (!id || game.screen !== 'match') return;
    try {
      const s = await (await fetch('/api/match/' + id)).json(); C.settle = s;
      const el = document.getElementById('settleLine'); if (el) el.innerHTML = settleText(s);
      if (s.status !== 'SETTLED' && s.status !== 'REFUNDED') setTimeout(pollSettlement, 6000);
      else refresh();
    } catch { setTimeout(pollSettlement, 8000); }
  }
  function settleText(s) {
    if (!s) return 'Waiting for the co-signers to replay the match…';
    if (s.status === 'LOCKED') return 'Independent co-signers are replaying every round…';
    if (s.status === 'RESULT_FINAL') { const at = (Number(s.resultSubmittedAt) + Number(s.disputeWindow)) * 1000; return `Result is on chain. Payout after the dispute window (about ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}).`; }
    if (s.status === 'SETTLED') return 'Paid out ✓ — the escrow sent the pot.';
    return 'Status: ' + s.status;
  }
  function championExtra(w) {
    if (!C.match) return '';
    setTimeout(pollSettlement, 1500);
    const stake = parseEth(C.match.stake), { pot, house, champ } = splitPot(stake, C.match.size), mine = w && w.i === game.me;
    return `<div class="receipt">
        <div class="r"><span>Pot · ${C.match.size} × ${fmtEth(stake)}</span><b>${fmtEth(pot)} ${unit()}</b></div>
        <div class="r"><span>House 10%</span><b>${fmtEth(house)} ${unit()}</b></div>
        <div class="r win"><span>Your result</span><b style="color:${mine ? 'var(--mint)' : 'var(--coral)'}">${mine ? `+${fmtEth(champ - stake)}` : `−${fmtEth(stake)}`} ${unit()}</b></div>
      </div>
      <div class="steps"><div class="step" id="settleLine">${settleText(C.settle)}</div></div>`;
  }
  loadConfig();
  function openSetup() { C.match = null; C.lobby = null; C.err = ''; C.busy = ''; C.showFund = false; game.screen = 'cashSetup'; showOverlay(setupCard()); }
  return { enabled, onLobby, onMatch, championExtra, unit, openSetup, get state() { return C; }, refresh, isCashMatch: () => !!C.match };
})();
