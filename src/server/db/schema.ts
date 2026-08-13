import { pgTable, text, varchar, timestamp, uuid, integer, real, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  userId: varchar('user_id', { length: 128 }).primaryKey(),
  username: varchar('username', { length: 128 }).notNull().unique(),
  primaryEmail: varchar('primary_email', { length: 320 }),
  emailVerified: boolean('email_verified').default(false).notNull(),
  status: varchar('status', { length: 32 }).default('active').notNull(),
  displayName: varchar('display_name', { length: 128 }).notNull(),
  passwordHash: varchar('password_hash', { length: 256 }),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_primary_email_unique').on(table.primaryEmail),
]);

export const authIdentities = pgTable('auth_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  provider: varchar('provider', { length: 32 }).notNull(),
  providerSubject: varchar('provider_subject', { length: 255 }).notNull(),
  providerEmail: varchar('provider_email', { length: 320 }),
  providerEmailVerified: boolean('provider_email_verified').default(false).notNull(),
  displayName: varchar('display_name', { length: 128 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('auth_identities_provider_subject_unique').on(table.provider, table.providerSubject),
  index('auth_identities_user_id_idx').on(table.userId),
]);

export const authTransactions = pgTable('auth_transactions', {
  id: uuid('id').primaryKey(),
  provider: varchar('provider', { length: 32 }).notNull(),
  stateHash: varchar('state_hash', { length: 64 }).notNull(),
  nonceHash: varchar('nonce_hash', { length: 64 }).notNull(),
  appCodeChallenge: varchar('app_code_challenge', { length: 128 }).notNull(),
  providerCodeVerifierEncrypted: text('provider_code_verifier_encrypted'),
  appRedirectUri: text('app_redirect_uri').notNull(),
  linkUserId: varchar('link_user_id', { length: 128 }).references(() => users.userId),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('auth_transactions_state_hash_unique').on(table.stateHash),
  index('auth_transactions_expires_at_idx').on(table.expiresAt),
]);

export const authLoginTickets = pgTable('auth_login_tickets', {
  id: uuid('id').primaryKey(),
  transactionId: uuid('transaction_id').notNull().references(() => authTransactions.id),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  ticketHash: varchar('ticket_hash', { length: 64 }).notNull(),
  kind: varchar('kind', { length: 16 }).default('login').notNull(),
  provider: varchar('provider', { length: 32 }).notNull(),
  providerSubject: varchar('provider_subject', { length: 255 }).notNull(),
  providerEmail: varchar('provider_email', { length: 320 }),
  providerEmailVerified: boolean('provider_email_verified').default(false).notNull(),
  displayName: varchar('display_name', { length: 128 }),
  avatarUrl: text('avatar_url'),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('auth_login_tickets_ticket_hash_unique').on(table.ticketHash),
  index('auth_login_tickets_expires_at_idx').on(table.expiresAt),
]);

export const authSessions = pgTable('auth_sessions', {
  id: uuid('id').primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  familyId: uuid('family_id').notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  rememberMe: boolean('remember_me').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  revokedAt: timestamp('revoked_at'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('auth_sessions_token_hash_unique').on(table.tokenHash),
  index('auth_sessions_family_id_idx').on(table.familyId),
  index('auth_sessions_user_id_idx').on(table.userId),
]);

export const authPasswordResetTokens = pgTable('auth_password_reset_tokens', {
  id: uuid('id').primaryKey(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('auth_password_reset_token_hash_unique').on(table.tokenHash),
  index('auth_password_reset_expires_at_idx').on(table.expiresAt),
]);

export const trips = pgTable('trips', {
  id: varchar('id', { length: 128 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  destination: varchar('destination', { length: 255 }),
  isPublic: boolean('is_public').default(false).notNull(),
  forkCount: integer('fork_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('trips_destination_idx').on(table.destination),
  index('trips_public_dest_fork_idx').on(table.isPublic, table.destination, table.forkCount),
]);

export const tripMembers = pgTable('trip_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  role: varchar('role', { length: 64 }).notNull(),
}, (table) => [
  index('trip_members_trip_id_idx').on(table.tripId),
  index('trip_members_user_id_idx').on(table.userId)
]);

export const itineraryNodes = pgTable('itinerary_nodes', {
  nodeId: varchar('node_id', { length: 128 }).primaryKey(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  day: integer('day').notNull(),
  date: varchar('date', { length: 32 }),
  time: varchar('time', { length: 64 }),
  timestamp: timestamp('timestamp'),
  sortOrder: integer('sort_order').default(0).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  emoji: varchar('emoji', { length: 32 }),
  category: varchar('category', { length: 64 }),
  lat: real('lat'),
  lng: real('lng'),
  description: text('description'),
  aiNote: text('ai_note'),
  intensity: varchar('intensity', { length: 32 }),
  isVisited: boolean('is_visited').default(false).notNull(),
  transportToNext: text('transport_to_next'),
  imageUrl: text('image_url'),
  attachments: jsonb('attachments'),
  linkedFactId: text('linked_fact_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('itinerary_nodes_trip_id_idx').on(table.tripId),
  index('itinerary_nodes_trip_day_idx').on(table.tripId, table.day),
  index('itinerary_nodes_trip_sort_idx').on(table.tripId, table.sortOrder)
]);

export const flights = pgTable('flights', {
  id: varchar('id', { length: 128 }).primaryKey(),
  provider: varchar('provider', { length: 255 }).notNull(),
  time: varchar('time', { length: 64 }),
  price: integer('price').notNull(),
}, (table) => [
  index('flights_provider_idx').on(table.provider)
]);

export const userSavedItems = pgTable('user_saved_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  itemId: varchar('item_id', { length: 128 }).notNull(),
}, (table) => [
  index('user_saved_items_user_id_idx').on(table.userId)
]);

export const userTrackedPrices = pgTable('user_tracked_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  itemId: varchar('item_id', { length: 128 }).notNull(),
}, (table) => [
  index('user_tracked_prices_user_id_idx').on(table.userId)
]);

export const userAiProfiles = pgTable('user_ai_profiles', {
  userId: varchar('user_id', { length: 128 }).primaryKey().references(() => users.userId),
  preferredDeparture: varchar('preferred_departure', { length: 255 }),
  preferredCompanions: varchar('preferred_companions', { length: 64 }),
  preferredVibes: jsonb('preferred_vibes').default([]).notNull(),
  preferredInterests: jsonb('preferred_interests').default([]).notNull(),
  preferredDietary: jsonb('preferred_dietary').default([]).notNull(),
  preferredTransport: jsonb('preferred_transport').default([]).notNull(),
  preferredBudget: varchar('preferred_budget', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const favorites = pgTable('favorites', {
  id: varchar('id', { length: 128 }).primaryKey(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  title: varchar('title', { length: 255 }).notNull(),
  emoji: varchar('emoji', { length: 32 }),
  lat: real('lat'),
  lng: real('lng'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('favorites_trip_id_idx').on(table.tripId)
]);

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
}, (table) => [
  index('trip_travel_facts_trip_id_idx').on(table.tripId)
]);

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  content: text('content').notNull(),
  completed: boolean('completed').default(false).notNull(),
  category: varchar('category', { length: 64 }).default('other'),
}, (table) => [
  index('checklist_items_trip_id_idx').on(table.tripId)
]);

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: varchar('trip_id', { length: 128 }).notNull().references(() => trips.id),
  payerId: varchar('payer_id', { length: 128 }).notNull(),
  amount: real('amount').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  clearedAt: timestamp('cleared_at'),
}, (table) => [
  index('expenses_trip_id_idx').on(table.tripId),
  index('expenses_payer_id_idx').on(table.payerId)
]);

export const searchHistory = pgTable('search_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }),
  query_from: varchar('query_from', { length: 128 }),
  query_to: varchar('query_to', { length: 128 }),
  query_date: varchar('query_date', { length: 64 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => [
  index('search_history_user_id_idx').on(table.userId),
  index('search_history_from_to_idx').on(table.query_from, table.query_to, table.timestamp),
]);

export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 128 }).notNull().references(() => users.userId),
  destination: varchar('destination', { length: 128 }).notNull(),
  channel: varchar('channel', { length: 64 }).notNull(), // 'web-push' | 'email' | 'rss'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('user_subscriptions_user_id_idx').on(table.userId),
  index('user_subscriptions_dest_idx').on(table.destination)
]);

