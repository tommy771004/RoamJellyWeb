import { pgTable, text, varchar, timestamp, uuid, integer, real, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  userId: varchar('user_id', { length: 128 }).primaryKey(),
  username: varchar('username', { length: 128 }).notNull().unique(),
  displayName: varchar('display_name', { length: 128 }).notNull(),
  passwordHash: varchar('password_hash', { length: 256 }),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const trips = pgTable('trips', {
  id: varchar('id', { length: 128 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  destination: varchar('destination', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tripMembers = pgTable('trip_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  role: varchar('role', { length: 64 }).notNull(),
});

export const itineraryNodes = pgTable('itinerary_nodes', {
  nodeId: varchar('node_id', { length: 128 }).primaryKey(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  day: integer('day').notNull(),
  time: varchar('time', { length: 64 }),
  timestamp: timestamp('timestamp'),
  title: varchar('title', { length: 255 }).notNull(),
  emoji: varchar('emoji', { length: 32 }),
  category: varchar('category', { length: 64 }),
  lat: real('lat'),
  lng: real('lng'),
  description: text('description'),
  isVisited: boolean('is_visited').default(false).notNull(),
  transportToNext: text('transport_to_next'),
  imageUrl: text('image_url'),
  linkedFactId: text('linked_fact_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const flights = pgTable('flights', {
  id: varchar('id', { length: 128 }).primaryKey(),
  provider: varchar('provider', { length: 255 }).notNull(),
  time: varchar('time', { length: 64 }),
  price: integer('price').notNull(),
});

export const userSavedItems = pgTable('user_saved_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  itemId: varchar('item_id', { length: 128 }).notNull(),
});

export const userTrackedPrices = pgTable('user_tracked_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  itemId: varchar('item_id', { length: 128 }).notNull(),
});

export const favorites = pgTable('favorites', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  title: varchar('title', { length: 255 }).notNull(),
  emoji: varchar('emoji', { length: 32 }),
  lat: real('lat'),
  lng: real('lng'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tripTravelFacts = pgTable('trip_travel_facts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  factType: varchar('fact_type', { length: 64 }).notNull(),
  source: varchar('source', { length: 64 }).notNull().default('manual'),
  title: varchar('title', { length: 255 }).notNull(),
  startAt: timestamp('start_at'),
  endAt: timestamp('end_at'),
  locationName: varchar('location_name', { length: 255 }),
  lat: real('lat'),
  lng: real('lng'),
  referenceCode: varchar('reference_code', { length: 128 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  content: text('content').notNull(),
  completed: boolean('completed').default(false).notNull(),
});

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  payerId: varchar('payer_id', { length: 128 }).notNull(),
  amount: real('amount').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const searchHistory = pgTable('search_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }),
  query_from: varchar('query_from', { length: 128 }),
  query_to: varchar('query_to', { length: 128 }),
  query_date: varchar('query_date', { length: 64 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
