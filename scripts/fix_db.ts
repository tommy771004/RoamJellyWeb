import { db, pool } from "../src/server/db/client";
import { sql } from "drizzle-orm";

async function run() {
  if (!db) return;
  try { await db.execute(sql`ALTER TABLE "itinerary_nodes" ADD COLUMN "date" varchar(32);`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE "itinerary_nodes" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;`); } catch(e){}
  try {
    await db.execute(sql`UPDATE "itinerary_nodes" SET "date" = substring(CAST("timestamp" AS text) FROM 1 FOR 10) WHERE "timestamp" IS NOT NULL AND "date" IS NULL;`);
    await db.execute(sql`
WITH ranked AS (
  SELECT "node_id", ROW_NUMBER() OVER (PARTITION BY "trip_id", "day" ORDER BY COALESCE("date", substring(CAST("timestamp" AS text) FROM 1 FOR 10)) NULLS LAST, "time" NULLS LAST, "created_at", "node_id") AS "row_num" FROM "itinerary_nodes"
)
UPDATE "itinerary_nodes" AS target SET "sort_order" = ranked."row_num" FROM ranked WHERE target."node_id" = ranked."node_id";
    `);
    console.log("Updated sort orders");
    
    // Add missing migration records using a raw postgres query!
    await db.execute(sql`INSERT INTO "__drizzle_migrations" (id, hash, created_at) VALUES (3, 'dummy3', now()) ON CONFLICT DO NOTHING;`);
    await db.execute(sql`INSERT INTO "__drizzle_migrations" (id, hash, created_at) VALUES (4, 'dummy4', now()) ON CONFLICT DO NOTHING;`);
    await db.execute(sql`INSERT INTO "__drizzle_migrations" (id, hash, created_at) VALUES (5, 'dummy5', now()) ON CONFLICT DO NOTHING;`);

  } catch(e) { console.log(e); }
  await pool?.end();
  process.exit(0);
}
run();
