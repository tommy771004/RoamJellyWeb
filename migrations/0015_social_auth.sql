CREATE TABLE IF NOT EXISTS "auth_identities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar(128) NOT NULL REFERENCES "users"("user_id"),
  "provider" varchar(32) NOT NULL,
  "provider_subject" varchar(255) NOT NULL,
  "provider_email" varchar(320),
  "provider_email_verified" boolean NOT NULL DEFAULT false,
  "display_name" varchar(128),
  "avatar_url" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "last_login_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_identities_provider_subject_unique" ON "auth_identities" ("provider", "provider_subject");
CREATE INDEX IF NOT EXISTS "auth_identities_user_id_idx" ON "auth_identities" ("user_id");

CREATE TABLE IF NOT EXISTS "auth_transactions" (
  "id" uuid PRIMARY KEY,
  "provider" varchar(32) NOT NULL,
  "state_hash" varchar(64) NOT NULL,
  "nonce_hash" varchar(64) NOT NULL,
  "app_code_challenge" varchar(128) NOT NULL,
  "provider_code_verifier_encrypted" text,
  "app_redirect_uri" text NOT NULL,
  "link_user_id" varchar(128) REFERENCES "users"("user_id"),
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_transactions_state_hash_unique" ON "auth_transactions" ("state_hash");
CREATE INDEX IF NOT EXISTS "auth_transactions_expires_at_idx" ON "auth_transactions" ("expires_at");

CREATE TABLE IF NOT EXISTS "auth_login_tickets" (
  "id" uuid PRIMARY KEY,
  "transaction_id" uuid NOT NULL REFERENCES "auth_transactions"("id"),
  "user_id" varchar(128) NOT NULL REFERENCES "users"("user_id"),
  "ticket_hash" varchar(64) NOT NULL,
  "kind" varchar(16) NOT NULL DEFAULT 'login',
  "provider" varchar(32) NOT NULL,
  "provider_subject" varchar(255) NOT NULL,
  "provider_email" varchar(320),
  "provider_email_verified" boolean NOT NULL DEFAULT false,
  "display_name" varchar(128),
  "avatar_url" text,
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_login_tickets_ticket_hash_unique" ON "auth_login_tickets" ("ticket_hash");
CREATE INDEX IF NOT EXISTS "auth_login_tickets_expires_at_idx" ON "auth_login_tickets" ("expires_at");

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" uuid PRIMARY KEY,
  "user_id" varchar(128) NOT NULL REFERENCES "users"("user_id"),
  "family_id" uuid NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "remember_me" boolean NOT NULL DEFAULT false,
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp,
  "revoked_at" timestamp,
  "last_used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_sessions_token_hash_unique" ON "auth_sessions" ("token_hash");
CREATE INDEX IF NOT EXISTS "auth_sessions_family_id_idx" ON "auth_sessions" ("family_id");
CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx" ON "auth_sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "auth_password_reset_tokens" (
  "id" uuid PRIMARY KEY,
  "user_id" varchar(128) NOT NULL REFERENCES "users"("user_id"),
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "auth_password_reset_token_hash_unique" ON "auth_password_reset_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "auth_password_reset_expires_at_idx" ON "auth_password_reset_tokens" ("expires_at");
