CREATE TABLE "user_ai_profiles" (
	"user_id" varchar(128) PRIMARY KEY NOT NULL,
	"preferred_departure" varchar(255),
	"preferred_companions" varchar(64),
	"preferred_vibes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_dietary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_transport" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_budget" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN "category" varchar(64) DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "cleared_at" timestamp;--> statement-breakpoint
ALTER TABLE "itinerary_nodes" ADD COLUMN "ai_note" text;--> statement-breakpoint
ALTER TABLE "itinerary_nodes" ADD COLUMN "intensity" varchar(32);--> statement-breakpoint
ALTER TABLE "itinerary_nodes" ADD COLUMN "attachments" jsonb;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "fork_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_ai_profiles" ADD CONSTRAINT "user_ai_profiles_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checklist_items_trip_id_idx" ON "checklist_items" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "expenses_trip_id_idx" ON "expenses" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "expenses_payer_id_idx" ON "expenses" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "favorites_trip_id_idx" ON "favorites" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "flights_provider_idx" ON "flights" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "itinerary_nodes_trip_id_idx" ON "itinerary_nodes" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "itinerary_nodes_trip_day_idx" ON "itinerary_nodes" USING btree ("trip_id","day");--> statement-breakpoint
CREATE INDEX "itinerary_nodes_trip_sort_idx" ON "itinerary_nodes" USING btree ("trip_id","sort_order");--> statement-breakpoint
CREATE INDEX "search_history_user_id_idx" ON "search_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "search_history_from_to_idx" ON "search_history" USING btree ("query_from","query_to","timestamp");--> statement-breakpoint
CREATE INDEX "trip_members_trip_id_idx" ON "trip_members" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_members_user_id_idx" ON "trip_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trip_travel_facts_trip_id_idx" ON "trip_travel_facts" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trips_destination_idx" ON "trips" USING btree ("destination");--> statement-breakpoint
CREATE INDEX "trips_public_dest_fork_idx" ON "trips" USING btree ("is_public","destination","fork_count");--> statement-breakpoint
CREATE INDEX "user_saved_items_user_id_idx" ON "user_saved_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tracked_prices_user_id_idx" ON "user_tracked_prices" USING btree ("user_id");