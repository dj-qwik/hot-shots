// ───────────────────────── boot ─────────────────────────
buildMaterials();
const SPEAKER = (on) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/>${on ? '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' : '<path d="M16 9l6 6M22 9l-6 6" stroke="#ff557d" stroke-width="2.2" stroke-linecap="round"/>'}</svg>`;
function renderMute() { const m = $('#mute'); m.innerHTML = SPEAKER(!AUDIO.muted); m.setAttribute('aria-label', AUDIO.muted ? 'Sound off' : 'Sound on'); }
$('#mute').addEventListener('click', () => { audioInit(); setMuted(!AUDIO.muted); renderMute(); });
renderMute();
document.addEventListener('click', (e) => { if (e.target.closest('.btn, .seg button')) SFX.ui(); });
setWallet(wallet);
resize();
goHome();
requestAnimationFrame(frame);
