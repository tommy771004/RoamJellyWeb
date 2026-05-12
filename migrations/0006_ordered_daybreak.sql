ALTER TABLE "itinerary_nodes" ADD COLUMN "date" varchar(32);--> statement-breakpoint
ALTER TABLE "itinerary_nodes" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "itinerary_nodes"
SET "date" = substring(CAST("timestamp" AS text) FROM 1 FOR 10)
WHERE "timestamp" IS NOT NULL AND "date" IS NULL;--> statement-breakpoint
WITH ranked AS (
  SELECT
    "node_id",
    ROW_NUMBER() OVER (
      PARTITION BY "trip_id", "day"
      ORDER BY COALESCE("date", substring(CAST("timestamp" AS text) FROM 1 FOR 10)) NULLS LAST, "time" NULLS LAST, "created_at", "node_id"
    ) AS "row_num"
  FROM "itinerary_nodes"
)
UPDATE "itinerary_nodes" AS target
SET "sort_order" = ranked."row_num"
FROM ranked
WHERE target."node_id" = ranked."node_id";
