# Hot Shots

Thirty-second mini games, best 2 of 3, champion takes 90% of the pot — escrowed in ETH on **Robinhood Chain**
(testnet `46630`, mainnet `4663`), wallets via **Privy**, multiplayer on **Render**.

## Running it live (Render)

The repo root `render.yaml` is a Render Blueprint. Every push to `main` redeploys.

1. Render → **New → Blueprint** → this repo, branch `main`. It creates `hot-shots-game` (web service) and
   `hot-shots-db` (Postgres). Render generates every secret; nobody ever sees a private key.
2. Set **`OWNER_ADDRESS`** (your wallet) on `hot-shots-game` → Environment. It receives the 10% house fee and is
   the escrow's guardian (can pause or veto a result).
3. Open **`/status`** on the deployed site. Send ~0.05 testnet ETH to the server wallet shown there
   ([Robinhood faucet](https://faucet.testnet.chain.robinhood.com/)). The server then deploys the escrow by itself,
   registers its two result co-signers, and opens real-money play.
4. In the Privy dashboard → Configuration → App settings → Domains, add the site's URL to **Allowed origins**.

What runs where:

| Piece | Where | Notes |
|---|---|---|
| Game server (`game/server`) | `hot-shots-game` | Authoritative 60 Hz matches over WebSockets, lobbies, wallet sign-in, evidence + replays at `/api/evidence/:matchId`, status at `/status` |
| Result co-signers (`services/settlement/src/cosignerMain.ts`) | 2 processes inside `hot-shots-game` (testnet) | Each replays every round of the deterministic simulation before signing; refuses on any mismatch |
| Settlement worker | inside the game server | Submits co-signed results, the escrow pays the champion in that same transaction (instant payout; DISPUTE_WINDOW=0), pushes refunds |
| Wallet bridge (`apps/web/src/bridge.tsx`) | served at `/wallet/wallet.js` | Privy login, embedded wallets, deposits; the game talks to it via `window.HSWallet` |
| Escrow (`contracts/`) | Robinhood Chain | Deployed by the server on first boot (testnet only) |

### Mainnet: the lean launch (what's live now)
`CHAIN_ID=4663` + `ALLOW_RAW_KEYS_ON_MAINNET=i-understand` (both in `render.yaml`). The server deploys the instant-payout
escrow itself, makes `OWNER_ADDRESS` guardian + treasury, and starts handing the admin role to `OWNER_ADDRESS`
(accept with `acceptDefaultAdminTransfer()` from that wallet after the 2-day delay). Keys are derived from Render
secrets and both co-signers run beside the server, so whoever controls the Render account controls results of matches
in progress. Players' own wallets are never reachable. Fund the server wallet (`/status`) with ~0.005 ETH for gas.
After the first boot, pin the escrow with `ESCROW_ADDRESS` + `ESCROW_DEPLOY_BLOCK` so a database loss can't redeploy it.

### Going to mainnet, hardened (recommended next step)
- Deploy the escrow yourself with a **Safe multisig as admin** (`contracts/script/Deploy.s.sol` enforces this on 4663) and set `ESCROW_ADDRESS`.
- Replace derived keys with **KMS/HSM signers** (`services/settlement/src/keys.ts` → `kmsAccount`); the code refuses raw keys on mainnet.
- Run the co-signers on **independent infrastructure** (different provider/account), set `COSIGNER_URLS`, pin `ESCROW_ADDRESS` on each.
- Get the escrow **independently audited**, and get legal advice on paid-entry contests where you operate.

### Tests
`npm test -w @hotshots/game` (determinism + network) · `node game/tools/cash_e2e.mjs` (needs `anvil`: deploy → deposit → match →
replay-verified co-sign → payout, plus tampering refusals) · `node game/tools/accept.mjs <arena>` (exploit/fairness suite).
CI runs all of these plus `forge test` on every push.

---

## Crypto & payments layer (details)

Escrowed ETH entry stakes on **Robinhood Chain** (mainnet `4663`, testnet `46630`), wallets via **Privy**, and a 90/10 champion/house payout that happens exactly once. This repo is the money layer from spec §2, §11, §13–16 and §21; the game client mounts around it.

```
contracts/            Foundry: HotShotsEscrow.sol, 44 tests (unit + fuzz + invariants), deploy script
packages/shared/      Chain config, ABI, payout math, best-of-3 match rules, EIP-712 types, roster/evidence hashing, allowlists
services/settlement/  Lobby↔escrow bridge, indexer, co-signer, settlement worker, finality tracking, Postgres schema
apps/web/             React + Privy: wallet panel, stake confirmation, match-end settlement screen
```

## How money moves

1. **Lobby opens** → backend (`OPERATOR_ROLE`) calls `createMatch` with exact stake (wei), capacity, admission deadline, rules hash, optional private-lobby allowlist root.
2. **Players deposit** from their own Privy (embedded or external) wallet: `joinMatch` with exactly the on-chain stake. They can `leaveMatch` for a full refund until lock.
3. **Ready check passes** → `lockMatch`. The contract freezes exactly the wallets that have deposited (it reads and sorts them itself, so a last-second join/leave can't block the lock). No substitutions after that.
4. **Match ends** → the match director publishes the round ledger (stage ids, seed commit/reveal, winners, score-evidence hashes). Each **independent co-signer** re-derives the champion from that ledger and chain state, and signs an EIP-712 `MatchResult`. Anyone relays ≥ threshold signatures to `submitResult`.
5. **Dispute window** (default and minimum 1 hour — Arbitrum's sequencer can skew timestamps by up to ~1 h, so anything shorter could be skipped): the guardian can veto (back to LOCKED; the vetoed signatures are permanently invalid, co-signers must sign a corrected result) or abort (full refunds).
6. **Payout**: `finalizeSettlement` pays champion `pot − ⌊pot/10⌋` and house `⌊pot/10⌋`. If a recipient can't receive, the amount is held for them to `claim()`.

**Liveness guarantees for players:** if a lobby isn't locked by its deadline, or a locked match has no result by its result deadline (default 3 h), *anyone* can abort it and every stake is refunded — even if Hot Shots is offline. Pausing can never block refunds, leaving, or claims, and can delay a final payout by at most 7 days.

**Gas:** players pay gas for their own deposit. The relayer (operator wallet) pays gas for create/lock/result/payout/refund. Gas never comes out of the pot.

## Verified so far

| What | Result |
|---|---|
| Robinhood Chain 4663 live, ETH gas, testnet 46630 | Confirmed (docs.robinhood.com, Oct 2026). Mainnet since 1 Jul 2026. |
| Privy supports 4663 / 46630 | Listed in Privy's supported chains; Privy also powers Robinhood's own wallet. viem ≥ 2.57 ships both chain definitions. |
| Contract tests | 44/44 pass: lifecycle, signatures, roster substitution, deadlines, pause, reentrancy, rejecting recipients, 2,000-run fuzz of full matches (2–16 players), invariant suite (16k random calls/run: solvency, conservation, house ≤10%, settle-once). |
| Independent security review | 1 High, 2 Medium, 3 Low found and fixed, each with a regression test: vetoed results could be replayed; lock could be griefed by last-second join/leave; a pause could run out the clock and turn a win into a refund; push payments could be gas-starved; contract wallets couldn't be rescued from a failed push; dispute window could be shorter than Arbitrum's timestamp tolerance. |
| Shared library | 10/10: spec §2 example (8 × 0.01 → 0.072 / 0.008), dust rule, exhaustive enumeration of every legal best-of-3 match, ledger validation for every roster size 2–16. |
| End-to-end (real bytecode + real service code on a local chain with id 46630) | 8/8: full 4-player match to 90/10 payout, co-signers rejecting bad evidence, cancelled lobby refunds, stalled match auto-abort, private-lobby proofs, HTTP co-signers with auth, reorg recovery. |
| TypeScript | Clean typecheck against real viem 2.57.7, React 19, Node types. |

**Not yet exercised:** the web app in a real browser with a live Privy app; `PgLedger` against a real Postgres; deployment to 46630. Privy's React types were shimmed for the typecheck (the sandbox had no npm access), so run `npm run build` in `apps/web` once and fix any API drift against your installed `@privy-io/react-auth`.

## Setup

Requires Node ≥ 22.18 (runs TypeScript natively), Foundry, and Postgres 15+.

```bash
npm install
git init && cd contracts && forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.1.0 && forge build && forge test
cd .. && npm run abi && npm test                     # shared + e2e (needs `anvil` on PATH)
```

### 1. Deploy to testnet (46630)

Get testnet ETH (Sepolia ETH bridged in, or the faucet on docs.robinhood.com/chain). Use a Foundry keystore, not a raw key in a file.

```bash
cd contracts
export RH_TESTNET_RPC_URL=https://rpc.testnet.chain.robinhood.com   # or your Alchemy URL
CHAIN_ID=46630 ADMIN=<your address> TREASURY=<house address> \
SIGNERS=<cosignerA>,<cosignerB>,<cosignerC> SIGNER_THRESHOLD=2 \
OPERATOR=<relayer address> GUARDIAN=<incident address> GRANT_ROLES_NOW=true \
forge script script/Deploy.s.sol --rpc-url robinhood_testnet --broadcast --verify --account deployer
```

### 2. Privy dashboard

Create an app at dashboard.privy.io → enable email/Google/wallet login and **embedded Ethereum wallets** → add your web origins to allowed domains → copy App ID and Client ID into `apps/web/.env` (see `.env.example`). The app pins Privy to Robinhood Chain only (`defaultChain` + `supportedChains`), and re-checks the wallet's chain before every deposit.

### 3. Services

```bash
cd services/settlement && cp .env.example .env    # fill in
psql "$DATABASE_URL" -f db/schema.sql
node src/cosignerMain.ts      # run 2+ of these, each on separate infra with its own key
node src/main.ts              # coordinator: indexer + settlement worker
```

Wire `MATCH_DIRECTOR_URL` to your authoritative game server's `GET /matches/:id/evidence` (shape: `MatchEvidence` in `packages/shared/src/evidence.ts`). Use `LobbyEscrow` (`open` / `lockIfReady` / `cancel`) from your LobbyService.

### 4. Web

```bash
cd apps/web && cp .env.example .env && npm run dev
```

The three components — `WalletPanel`, `StakeConfirm`, `SettlementStatus` — are what the game client embeds on the Wallet, Lobby and Match-end screens.

## Trust assumptions (say these out loud to players and auditors)

- **Admin multisig** can rotate result signers and change the treasury. A malicious signer set could name any roster player champion. Put the admin Safe behind an on-chain timelock (e.g. OpenZeppelin `TimelockController`, ≥ 48 h) so players can see signer changes coming and leave lobbies.
- **Guardian** can veto a result during its dispute window or abort a locked match. That can deny a legitimate champion (everyone is refunded instead) but can never take funds. With instant payout (the default, DISPUTE_WINDOW=0) there is no veto window: the co-signers' replay check is the protection.
- **Co-signers** collectively decide the champion. Run them on separate infrastructure with separate keys and RPC providers.
- A player who deposits from an L1 contract via a retryable ticket is recorded under its aliased L2 address. Normal Privy/EOA/smart-wallet users are unaffected.

## Before mainnet (4663)

The code refuses some unsafe mainnet configs on its own (raw private keys, fewer than 2 co-signers, non-multisig admin). The rest is on you:

- **Keys:** operator and co-signer keys in a KMS/HSM (`services/settlement/src/keys.ts` → `kmsAccount`). Admin = Safe multisig with 2-person approval; treasury = Safe.
- **Audit:** independent third-party audit of `HotShotsEscrow.sol`, plus the fuzz/invariant suites in CI.
- **Run on testnet** with real Privy wallets end to end, including a smart-contract wallet as champion (confirms the 100k push-gas limit or falls back to `claim()`).

## Launch-blocking decisions (spec §23, plus what research turned up)

1. **Legality of paid-entry prize play.** Real-money skill contests are regulated differently per country and US state; some treat them as gambling. Needs a gaming lawyer, geofencing and age/eligibility checks before any cash lobby. Not something code can settle.
2. **Privy's acceptable use policy.** Privy (privy.io) prohibits illegal activity and use "as a custodian, payment services institution, money transmitter… without appropriate licensure." The escrow is non-custodial by design (funds sit in the contract, not with Hot Shots or Privy), but get written confirmation from Privy for this use case.
3. **Robinhood Chain availability.** Robinhood describes the chain as permissionless "in supported jurisdictions" — confirm where your players can access it.
4. Who pays gas (this build: players for deposits, house for everything else), dispute arbitration terms, 16-player server costs, mobile/browser coverage.

## Match format

**Best 2 out of 3.** The first player to win 2 rounds is champion. Each round is a 30-second mini game. With 3+ players, if rounds 1–3 produce three different winners, those three play one deciding final. A match is therefore 2–4 rounds, about 3 minutes at most. Co-signers enforce these rules when they verify a result (`packages/shared/src/matchRules.ts`).
