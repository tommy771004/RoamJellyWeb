CREATE TABLE "trip_travel_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" varchar(128) NOT NULL,
	"fact_type" varchar(64) NOT NULL,
	"source" varchar(64) DEFAULT 'manual' NOT NULL,
	"title" varchar(255) NOT NULL,
	"start_at" timestamp,
	"end_at" timestamp,
	"location_name" varchar(255),
	"lat" real,
	"lng" real,
	"reference_code" varchar(128),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trip_travel_facts" ADD CONSTRAINT "trip_travel_facts_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;
