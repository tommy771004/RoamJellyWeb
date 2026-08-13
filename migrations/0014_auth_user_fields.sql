ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "primary_email" varchar(320);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(32) DEFAULT 'active' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_primary_email_unique"
  ON "users" (lower("primary_email"))
  WHERE "primary_email" IS NOT NULL;
