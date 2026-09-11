-- 沐尘 PostgreSQL 基础表结构
-- 在配置 DATABASE_URL 后执行：psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MEMBER', 'ADMIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invite_redemptions (
  invite_code TEXT NOT NULL REFERENCES invite_codes(code) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (invite_code, user_id)
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, code)
);

CREATE TABLE IF NOT EXISTS paper_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  shares INTEGER NOT NULL CHECK (shares > 0 AND shares % 100 = 0),
  price NUMERIC(16, 4) NOT NULL CHECK (price > 0),
  status TEXT NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  question TEXT,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invite_codes_created_at_idx ON invite_codes(created_at DESC);
CREATE INDEX IF NOT EXISTS paper_orders_user_created_idx ON paper_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS research_reports_user_created_idx ON research_reports(user_id, created_at DESC);

-- 增量升级可以重复执行；旧版本用户会话在应用升级后失效。
CREATE TABLE IF NOT EXISTS email_login_codes (
  email TEXT PRIMARY KEY, digest TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, sent_at TIMESTAMPTZ NOT NULL,
  window_at TIMESTAMPTZ NOT NULL, sent_count INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS paper_accounts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cash_cents BIGINT NOT NULL CHECK (cash_cents >= 0)
);
CREATE TABLE IF NOT EXISTS paper_positions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, shares INTEGER NOT NULL CHECK (shares > 0),
  cost_cents BIGINT NOT NULL CHECK (cost_cents >= 0), PRIMARY KEY (user_id, code)
);
ALTER TABLE paper_orders ADD COLUMN IF NOT EXISTS amount_cents BIGINT;
ALTER TABLE paper_orders ADD COLUMN IF NOT EXISTS quote_as_of TEXT;
ALTER TABLE paper_orders ADD COLUMN IF NOT EXISTS source TEXT;
