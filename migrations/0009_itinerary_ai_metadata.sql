ALTER TABLE itinerary_nodes
  ADD COLUMN IF NOT EXISTS ai_note text,
  ADD COLUMN IF NOT EXISTS intensity varchar(32);
