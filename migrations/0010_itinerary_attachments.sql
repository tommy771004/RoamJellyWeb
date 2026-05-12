ALTER TABLE "itinerary_nodes"
  ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb;
