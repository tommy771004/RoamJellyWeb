ALTER TABLE "itinerary_nodes" ADD COLUMN "timestamp" timestamp;--> statement-breakpoint
ALTER TABLE "itinerary_nodes" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "itinerary_nodes" ADD COLUMN "is_visited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "itinerary_nodes" ADD COLUMN "transport_to_next" text;--> statement-breakpoint
ALTER TABLE "itinerary_nodes" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "trip_travel_facts" ADD CONSTRAINT "trip_travel_facts_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;