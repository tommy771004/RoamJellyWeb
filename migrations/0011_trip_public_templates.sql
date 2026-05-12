ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "fork_count" integer DEFAULT 0 NOT NULL;
