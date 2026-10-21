-- Hot Shots durable records (spec §14). PostgreSQL 15+.
-- Money columns are NUMERIC(78,0) wei — never floating point.

CREATE TABLE IF NOT EXISTS lobbies (
  lobby_id          TEXT PRIMARY KEY,
  region            TEXT NOT NULL,
  player_cap        SMALLINT NOT NULL CHECK (player_cap BETWEEN 2 AND 16),
  stake_wei         NUMERIC(78,0) NOT NULL CHECK (stake_wei > 0),
  chain_id          INTEGER NOT NULL CHECK (chain_id IN (4663, 46630)),
  status            TEXT NOT NULL,                     -- open | ready_check | locked | expired | cancelled
  ready_deadline    TIMESTAMPTZ NOT NULL,
  escrow_address    TEXT NOT NULL,
  escrow_match_id   TEXT NOT NULL UNIQUE,              -- bytes32 hex
  config_hash       TEXT NOT NULL,
  allowlist_root    TEXT,                              -- private lobbies
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matches (
  match_id           TEXT PRIMARY KEY,                 -- = lobbies.escrow_match_id
  lobby_id           TEXT NOT NULL REFERENCES lobbies(lobby_id),
  locked_roster_hash TEXT,
  roster             TEXT[],                           -- sorted, as locked on-chain
  rules_version      TEXT NOT NULL,
  current_round      SMALLINT NOT NULL DEFAULT 0,
  state              TEXT NOT NULL,                    -- mirrors on-chain status + off-chain phases
  winner_id          TEXT,
  result_hash        TEXT,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rounds (
  match_id              TEXT NOT NULL REFERENCES matches(match_id),
  round                 SMALLINT NOT NULL CHECK (round BETWEEN 1 AND 4),
  stage_id              SMALLINT NOT NULL CHECK (stage_id BETWEEN 1 AND 50),
  stage_revision        INTEGER NOT NULL,
  seed_commitment       TEXT NOT NULL,
  seed_reveal           TEXT,
  starts_at             TIMESTAMPTZ,
  ends_at               TIMESTAMPTZ,
  winner_id             TEXT,
  signed_score_evidence JSONB,
  score_evidence_hash   TEXT,
  PRIMARY KEY (match_id, round)
);

-- Indexed escrow events (WalletLedger). Idempotent on (tx_hash, log_index).
CREATE TABLE IF NOT EXISTS wallet_ledger (
  tx_hash          TEXT NOT NULL,
  log_index        INTEGER NOT NULL,
  match_id         TEXT NOT NULL,
  kind             TEXT NOT NULL CHECK (kind IN ('deposit','leave','refund','settled','credit','claim','pushed')),
  account          TEXT,
  amount_wei       NUMERIC(78,0) NOT NULL,
  escrow_delta_wei NUMERIC(78,0) NOT NULL,
  block_number     BIGINT NOT NULL,
  block_hash       TEXT NOT NULL,
  finality         TEXT NOT NULL DEFAULT 'included',  -- included | safe | finalized
  PRIMARY KEY (tx_hash, log_index)
);
CREATE INDEX IF NOT EXISTS wallet_ledger_match ON wallet_ledger(match_id);
CREATE INDEX IF NOT EXISTS wallet_ledger_block ON wallet_ledger(block_number);

-- Transactions the service sent (payout tx, refund tx, etc.) and their tracked finality.
CREATE TABLE IF NOT EXISTS settlement_txs (
  tx_hash     TEXT PRIMARY KEY,
  match_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  subject     TEXT,
  progress    TEXT NOT NULL,   -- broadcast | included | safe | finalized | reverted | dropped
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS settlement_txs_match ON settlement_txs(match_id);

CREATE TABLE IF NOT EXISTS indexer_cursor (
  id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  block       BIGINT NOT NULL,
  block_hash  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dispute_log (
  report_id          TEXT PRIMARY KEY,
  match_id           TEXT NOT NULL,
  reporter           TEXT NOT NULL,
  reason             TEXT NOT NULL,
  telemetry_snapshot JSONB,
  reviewer           TEXT,
  resolution         TEXT,         -- upheld_veto | upheld_abort | rejected
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at        TIMESTAMPTZ
);

-- Append-only, hash-chained audit log. Application role gets INSERT/SELECT only.
CREATE TABLE IF NOT EXISTS audit_events (
  seq             BIGINT PRIMARY KEY,
  actor           TEXT NOT NULL,
  event           TEXT NOT NULL,
  match_id        TEXT,
  payload         TEXT NOT NULL,     -- exact JSON text that was hashed (JSONB would reorder keys)
  policy_version  TEXT NOT NULL,
  at              BIGINT NOT NULL,
  prev_hash       TEXT NOT NULL,
  integrity_hash  TEXT NOT NULL UNIQUE
);

CREATE OR REPLACE FUNCTION audit_events_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_events is append-only'; END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_events_no_update ON audit_events;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();
