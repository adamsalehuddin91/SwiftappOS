-- Brute-force guard for the password gate on /api/auth/login.
-- Stores only failures, and only a hash of the client address.

CREATE TABLE IF NOT EXISTS "login_attempts" (
    "id" UUID NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "login_attempts_ip_hash_created_at_idx"
  ON "login_attempts"("ip_hash", "created_at");
