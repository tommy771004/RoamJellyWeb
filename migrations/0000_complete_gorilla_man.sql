CREATE TABLE "flights" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"provider" varchar(255) NOT NULL,
	"time" varchar(64),
	"price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itinerary_nodes" (
	"node_id" varchar(128) PRIMARY KEY NOT NULL,
	"trip_id" varchar(128) NOT NULL,
	"day" integer NOT NULL,
	"time" varchar(64),
	"title" varchar(255) NOT NULL,
	"emoji" varchar(32),
	"category" varchar(64),
	"lat" real,
	"lng" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" varchar(128) NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"role" varchar(64) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"destination" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_saved_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"item_id" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tracked_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(128) NOT NULL,
	"item_id" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" varchar(128) PRIMARY KEY NOT NULL,
	"username" varchar(128) NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"password_hash" varchar(128),
	"avatar" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "itinerary_nodes" ADD CONSTRAINT "itinerary_nodes_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_items" ADD CONSTRAINT "user_saved_items_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tracked_prices" ADD CONSTRAINT "user_tracked_prices_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;