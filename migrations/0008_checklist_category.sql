ALTER TABLE "checklist_items" ADD COLUMN IF NOT EXISTS "category" varchar(64) DEFAULT 'other';
