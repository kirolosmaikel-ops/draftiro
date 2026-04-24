-- Add Stripe billing columns to firms table
ALTER TABLE firms ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS subscription_status TEXT
  NOT NULL DEFAULT 'trial'
  CHECK (subscription_status IN ('trial','active','past_due','canceled','paused'));
ALTER TABLE firms ADD COLUMN IF NOT EXISTS stripe_plan TEXT
  CHECK (stripe_plan IN ('solo','practice','firm'));
ALTER TABLE firms ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ
  NOT NULL DEFAULT (NOW() + INTERVAL '14 days');
ALTER TABLE firms ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Index for fast Stripe customer lookups in webhook handler
CREATE INDEX IF NOT EXISTS firms_stripe_customer_idx ON firms (stripe_customer_id);
CREATE INDEX IF NOT EXISTS firms_subscription_status_idx ON firms (subscription_status);
