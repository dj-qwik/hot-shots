// Real-money flow in two real browsers against a local chain. Privy can't run offline, so each page gets a
// stand-in window.HSWallet with the same API, backed by an anvil test key (signing happens in Node).
// Everything else is real: server deploys the escrow, browsers sign in, deposit, play, co-signers replay,
// payout. Screenshots every step.  PATH=$HOME/.foundry/bin:$PATH node game/tools/cash_browser.mjs [outdir]
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { escrowAbi, getChain } from '@hotshots/shared'
import { derivedAccount } from '../../services/settlement/src/keys.ts'

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..', '..')
const OUT = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'hs-cash-shots')); fs.mkdirSync(OUT, { recursive: true })
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')
const port = (b) => b + ((Math.random() * 2000) | 0)
const ANVIL = port(41000), GAME = port(43000), CA = port(45000), CB = port(47000), rpc = `http://127.0.0.1:${ANVIL}`
const procs = [], logs = {}
const run = (name, cmd, args, env) => { const p = spawn(cmd, args, { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }); logs[name] = ''; p.stdout.on('data', (d) => { logs[name] += d }); p.stderr.on('data', (d) => { logs[name] += d }); procs.push(p); return p }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const done = (ok, msg) => { console.log(ok ? 'PASS' : 'FAIL', msg); if (!ok) for (const [k, v] of Object.entries(logs)) console.log('── ' + k + '\n' + v.split('\n').slice(-15).join('\n')); procs.forEach((p) => p.kill()); process.exit(ok ? 0 : 1) }
run('anvil', 'anvil', ['--port', String(ANVIL), '--chain-id', '46630', '--silent']); await sleep(1200)
const chain = getChain(46630, rpc), pub = createPublicClient({ chain, transport: http(rpc) })
const secret = (n) => 'browser-secret-' + n + '-'.repeat(40)
await pub.request({ method: 'anvil_setBalance', params: [derivedAccount(secret('op'), 'operator').address, '0x' + parseEther('5').toString(16)] })
const token = 'tok' + Math.random(), director = `http://127.0.0.1:${GAME}`
for (const [n, p] of [['a', CA], ['b', CB]]) run('cs-' + n, 'node', ['services/settlement/src/cosignerMain.ts'], { PORT: String(p), CHAIN_ID: '46630', RPC_URL: rpc, COSIGNER_SECRET: secret('c' + n), COSIGNER_NAME: n, COSIGNER_AUTH_TOKEN: token, DIRECTOR_URL: director, SIM_PATH: 'game/dist/sim.cjs' })
run('game', 'node', ['game/server/index.mjs'], { PORT: String(GAME), CHAIN_ID: '46630', RPC_URL: rpc, OPERATOR_SECRET: secret('op'), OWNER_ADDRESS: '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720', COSIGNER_URLS: `http://127.0.0.1:${CA},http://127.0.0.1:${CB}`, COSIGNER_AUTH_TOKEN: token, DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'hsb-')), POLL_INTERVAL_MS: '1000', PRIVY_APP_ID: 'cmvhen2mi005k0hjwyo66w9rz' })
let cfg; for (let i = 0; i < 90; i++) { await sleep(1000); try { cfg = (await (await fetch(director + '/api/config')).json()).cash; if (cfg.status === 'ready') break } catch {} }
if (cfg?.status !== 'ready') done(false, 'server cash not ready ' + JSON.stringify(cfg))
const KEYS = ['0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a']
const browser = await chromium.launch()
async function page(key, name) {
  const acct = privateKeyToAccount(key), wal = createWalletClient({ chain, transport: http(rpc), account: acct })
  const p = await browser.newPage({ viewport: { width: 1100, height: 720 } })
  p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/wallet\.js|MIME|fonts|ERR_TUNNEL/.test(m.text())) p.errs.push(m.text()) })
  await p.exposeFunction('__sign', (msg) => acct.signMessage({ message: msg }))
  await p.exposeFunction('__bal', async () => (await pub.getBalance({ address: acct.address })).toString())
  await p.exposeFunction('__write', async (fn, matchId, stake) => wal.writeContract({ address: cfg.escrow, abi: escrowAbi, functionName: fn, args: fn === 'joinMatch' ? [matchId, []] : fn === 'claim' ? [] : [matchId], value: stake ? parseEther(stake) : undefined }))
  await p.exposeFunction('__send', async (to, amt) => {
    if (amt !== 'max') return wal.sendTransaction({ to, value: parseEther(amt) })
    const bal = await pub.getBalance({ address: acct.address }), f = await pub.estimateFeesPerGas(), gas = 25000n
    return wal.sendTransaction({ to, value: bal - gas * f.maxFeePerGas, gas, maxFeePerGas: f.maxFeePerGas, maxPriorityFeePerGas: f.maxPriorityFeePerGas })
  })
  await p.exposeFunction('__wait', async (h) => (await pub.waitForTransactionReceipt({ hash: h })).status)
  await p.addInitScript((addr) => {
    window.HSWallet = { state: () => ({ ready: true, authenticated: true, address: addr, embedded: true, chainId: 46630 }), login() {}, async logout() {},
      balance: () => window.__bal(), sign: (m) => window.__sign(m), deposit: (id, s) => window.__write('joinMatch', id, s), leave: (id) => window.__write('leaveMatch', id),
      claim: () => window.__write('claim'), claimRefund: (id) => window.__write('claimRefund', id), send: (to, a) => window.__send(to, a), waitTx: (h) => window.__wait(h), explorerTx: (h) => 'https://explorer.testnet.chain.robinhood.com/tx/' + h, exportWallet: async () => {} }
    setTimeout(() => window.dispatchEvent(new Event('hswallet')), 300)
  }, acct.address)
  await p.goto(director + '/'); await p.waitForTimeout(1500)
  return p
}
const A = await page(KEYS[0], 'Alice'), B = await page(KEYS[1], 'Bob')
await A.screenshot({ path: path.join(OUT, 'c1_home.png') })
for (const p of [A, B]) { await p.click('#goCashReal'); await p.waitForTimeout(400); await p.click('[data-csize="2"]'); await p.click('[data-ctier="0.001"]'); await p.waitForTimeout(800) }
await A.screenshot({ path: path.join(OUT, 'c2_setup.png') })
for (const [n, p] of [['A', A], ['B', B]]) { try { await p.click('#cashFind', { timeout: 8000 }) } catch (e) { await p.screenshot({ path: path.join(OUT, 'dbg_fail.png') }); console.log('FIND FAILED on', n, await p.evaluate(() => JSON.stringify({ screen: game.screen, ov: document.getElementById('ov').hidden, h2: document.querySelector('#ov h2')?.textContent, busy: CASH.state.busy, err: CASH.state.err, lobby: CASH.state.lobby?.state }))); done(false, 'find') } }
if (process.env.TRACE) { const tr = []; for (let i = 0; i < 40; i++) { tr.push(await A.evaluate(() => `${game.screen}|ov:${document.getElementById('ov').hidden ? 'hidden' : (document.querySelector('#ov .card h2')?.textContent || '?')}|L:${CASH.state.lobby?.state}|busy:${CASH.state.busy}`)); await sleep(100) } console.log([...new Set(tr)].join('\n')); done(true, 'trace') }
await A.waitForSelector('#cashDeposit', { timeout: 60000 }); await A.screenshot({ path: path.join(OUT, 'c3_lobby.png') })
await A.click('#cashDeposit'); await A.waitForFunction(() => CASH.state.lobby && CASH.state.lobby.youDeposited, null, { timeout: 60000 }); await A.waitForTimeout(3500)
await A.screenshot({ path: path.join(OUT, 'c4_deposited.png') })
const redraws = await A.evaluate(() => new Promise((res) => { let n = 0; const mo = new MutationObserver((ms) => { for (const m of ms) if (m.target.id === 'ov') n++ }); mo.observe(document.getElementById('ov'), { childList: true }); setTimeout(() => { mo.disconnect(); res(n) }, 5000) }))
console.log(`lobby card full redraws while waiting 5 s: ${redraws} (0 = no flicker)`)
if (redraws > 0) done(false, 'lobby card keeps redrawing (flicker)')
await B.waitForSelector('#cashDeposit', { timeout: 60000 }); await B.click('#cashDeposit')
await A.waitForFunction(() => game.phase === 'intro', null, { timeout: 90000 }); await A.screenshot({ path: path.join(OUT, 'c5_intro.png') })
const t0 = Date.now(); let shot = false
while (Date.now() - t0 < 240e3) {
  for (const p of [A, B]) { const k = ['KeyW', 'KeyA', 'KeyS', 'KeyD'][(Math.random() * 4) | 0]; p.keyboard.down(k).catch(() => {}); setTimeout(() => p.keyboard.up(k).catch(() => {}), 300); if (Math.random() < 0.2) p.keyboard.press('Space').catch(() => {}) }
  await sleep(300)
  const st = await A.evaluate(() => ({ phase: game.phase, t: game.t, champ: !!document.getElementById('settleLine') }))
  if (!shot && st.phase === 'play' && st.t > 6) { shot = true; await A.screenshot({ path: path.join(OUT, 'c6_play.png') }) }
  if (st.champ) break
}
await A.waitForSelector('#settleLine', { timeout: 30000 }); await A.waitForTimeout(6000); await A.screenshot({ path: path.join(OUT, 'c7_champion.png') })
const mid = await A.evaluate(() => CASH.state.match.matchId)
await A.waitForFunction(() => /Paid out/.test(document.getElementById('settleLine')?.textContent || ''), null, { timeout: 90000 }).catch(() => {})
await A.screenshot({ path: path.join(OUT, 'c8_paid.png') })
const line = await A.evaluate(() => document.getElementById('settleLine')?.textContent)
// cash out everything from the Wallet screen to a fresh address
const DEST = '0x000000000000000000000000000000000000c0DE'
await A.click('#faucet'); await A.waitForSelector('#coTo'); await A.screenshot({ path: path.join(OUT, 'c9_wallet.png') })
await A.fill('#coTo', DEST); await A.click('#coMax'); await A.click('#coSend'); await A.waitForSelector('#coGo'); await A.screenshot({ path: path.join(OUT, 'c10_confirm.png') })
await A.click('#coGo'); await A.waitForFunction(() => /Sent/.test(document.querySelector('#ov .card')?.textContent || ''), null, { timeout: 30000 }).catch(() => {})
await A.screenshot({ path: path.join(OUT, 'c11_sent.png') })
const destBal = await pub.getBalance({ address: DEST })
console.log('cashed out to', DEST, ':', Number(destBal) / 1e18, 'ETH')
if (destBal <= 0n) done(false, 'cash out did not arrive')
const errs = [...A.errs, ...B.errs]
await browser.close()
done(/Paid out/.test(line) && !errs.length, `browser cash flow · settlement line: "${line}" · page errors: ${errs.length ? errs.slice(0, 3).join(' | ') : 0} · shots in ${OUT}`)
