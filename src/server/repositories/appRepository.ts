import { eq, and, inArray, asc, isNull, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import * as schema from '../db/schema';

let hasWarnedMissingAttachmentsColumn = false;

function coerceNodeTimestamp(node: any) {
  if (node.timestamp) {
    const parsed = new Date(node.timestamp);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (node.date && node.time) {
    const parsed = new Date(`${node.date}T${node.time}:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function normalizeAttachments(attachments: any) {
  return Array.isArray(attachments) ? attachments : [];
}

function normalizeStringArray(values: any) {
  return Array.isArray(values)
    ? values.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];
}

function collectErrorMetadata(error: any) {
  const codes = new Set<string>();
  const messages: string[] = [];
  const visited = new Set<any>();

  let current = error;
  while (current && !visited.has(current)) {
    visited.add(current);
    if (typeof current.code === 'string') {
      codes.add(current.code);
    }
    if (typeof current.message === 'string') {
      messages.push(current.message);
    }
    current = current.cause;
  }

  return { codes, messages };
}

function isMissingColumnError(error: any, columnName: string) {
  const { codes, messages } = collectErrorMetadata(error);
  const loweredColumn = columnName.toLowerCase();

  if (codes.has('42703')) {
    return true;
  }

  return messages.some((message) => {
    const lowered = message.toLowerCase();
    return lowered.includes('does not exist') && lowered.includes(loweredColumn);
  });
}

function warnMissingAttachmentsColumnOnce() {
  if (hasWarnedMissingAttachmentsColumn) return;
  hasWarnedMissingAttachmentsColumn = true;
  console.warn('itinerary_nodes.attachments column is missing in the current database schema; retrying without attachments support. Run the latest DB migrations to restore full functionality.');
}

const itineraryNodeSelectBase = {
  nodeId: schema.itineraryNodes.nodeId,
  tripId: schema.itineraryNodes.tripId,
  day: schema.itineraryNodes.day,
  date: schema.itineraryNodes.date,
  time: schema.itineraryNodes.time,
  timestamp: schema.itineraryNodes.timestamp,
  sortOrder: schema.itineraryNodes.sortOrder,
  title: schema.itineraryNodes.title,
  emoji: schema.itineraryNodes.emoji,
  category: schema.itineraryNodes.category,
  lat: schema.itineraryNodes.lat,
  lng: schema.itineraryNodes.lng,
  description: schema.itineraryNodes.description,
  aiNote: schema.itineraryNodes.aiNote,
  intensity: schema.itineraryNodes.intensity,
  isVisited: schema.itineraryNodes.isVisited,
  transportToNext: schema.itineraryNodes.transportToNext,
  imageUrl: schema.itineraryNodes.imageUrl,
  linkedFactId: schema.itineraryNodes.linkedFactId,
  createdAt: schema.itineraryNodes.createdAt,
};

function buildItineraryNodeWritePayload(tripId: string, node: any, includeAttachments: boolean) {
  const ts = coerceNodeTimestamp(node);
  const sortOrder = Number.isFinite(Number(node.sort_order ?? node.sortOrder))
    ? Number(node.sort_order ?? node.sortOrder)
    : 0;
  const attachments = normalizeAttachments(node.attachments);

  const values: Record<string, any> = {
    nodeId: node.node_id,
    tripId,
    day: node.day,
    date: node.date ?? (ts ? ts.toISOString().slice(0, 10) : null),
    time: node.time,
    timestamp: ts,
    sortOrder,
    title: node.title,
    emoji: node.emoji,
    category: node.category,
    lat: node.lat,
    lng: node.lng,
    description: node.description,
    aiNote: node.ai_note ?? node.aiNote,
    intensity: node.intensity,
    isVisited: node.is_visited ?? false,
    transportToNext: node.transport_to_next,
    imageUrl: node.image_url,
    linkedFactId: node.linkedFactId || node.linked_fact_id,
  };

  const updateSet: Record<string, any> = {
    day: values.day,
    date: values.date,
    time: values.time,
    timestamp: values.timestamp,
    sortOrder: values.sortOrder,
    title: values.title,
    emoji: values.emoji,
    category: values.category,
    lat: values.lat,
    lng: values.lng,
    description: values.description,
    aiNote: values.aiNote,
    intensity: values.intensity,
    isVisited: values.isVisited,
    transportToNext: values.transportToNext,
    imageUrl: values.imageUrl,
    linkedFactId: values.linkedFactId,
  };

  if (includeAttachments) {
    values.attachments = attachments;
    updateSet.attachments = attachments;
  }

  return { values, updateSet };
}

function withNormalizedAttachments<T extends Record<string, any>>(row: T) {
  return {
    ...row,
    attachments: normalizeAttachments(row.attachments),
  };
}

type MemoryUser = {
  userId: string;
  username: string;
  displayName: string;
  name: string;
  avatar?: string | null;
  passwordHash?: string;
  createdAt: Date;
};

type MemoryTrip = {
  id: string;
  name: string;
  destination?: string | null;
  isPublic: boolean;
  forkCount: number;
  createdAt: Date;
};

type MemoryTripMember = {
  tripId: string;
  userId: string;
  role: string;
};

type MemoryChecklistItem = {
  id: string;
  tripId: string;
  content: string;
  completed: boolean;
  category: string;
};

type MemoryExpense = {
  id: string;
  tripId: string;
  payerId: string;
  amount: number;
  currency: string;
  description?: string | null;
  members: string[];
  createdAt: Date;
  clearedAt: Date | null;
};

export class AppRepository {

  private db: any;
  private memoryUsers = new Map<string, MemoryUser>();
  private memoryTrips = new Map<string, MemoryTrip>();
  private memoryTripMembers: MemoryTripMember[] = [];
  private memoryChecklistItems: MemoryChecklistItem[] = [];
  private memoryExpenses: MemoryExpense[] = [];

  constructor(dbClient: any) {
    this.db = dbClient;
  }

  private upsertMemoryUser(user: {
    userId: string;
    username?: string;
    displayName?: string;
    name?: string;
    avatar?: string | null;
    passwordHash?: string;
  }) {
    const existing = this.memoryUsers.get(user.userId);
    const displayName = user.displayName ?? user.name ?? existing?.displayName ?? user.username ?? user.userId;
    const next: MemoryUser = {
      userId: user.userId,
      username: user.username ?? existing?.username ?? user.userId,
      displayName,
      name: user.name ?? displayName,
      avatar: user.avatar ?? existing?.avatar ?? null,
      passwordHash: user.passwordHash ?? existing?.passwordHash,
      createdAt: existing?.createdAt ?? new Date(),
    };
    this.memoryUsers.set(user.userId, next);
    return next;
  }

  private ensureMemoryTripMember(tripId: string, userId: string, role: string) {
    const existing = this.memoryTripMembers.find(
      (member) => member.tripId === tripId && member.userId === userId,
    );
    if (existing) {
      existing.role = role;
      return existing;
    }
    const next = { tripId, userId, role };
    this.memoryTripMembers.push(next);
    return next;
  }

  private getMemoryTripMembers(tripId: string) {
    return this.memoryTripMembers.filter((member) => member.tripId === tripId);
  }

  async healthCheck() {
    if (!this.db) return true;
    await this.db.execute('SELECT 1');
    return true;
  }

  async getUserByUsername(username: string) {
    if (!this.db) {
      return Array.from(this.memoryUsers.values()).find((user) => user.username === username) ?? null;
    }
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.username, username));
    return user || null;
  }

  async getUserById(userId: string) {
    if (!this.db) return this.memoryUsers.get(userId) ?? null;
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.userId, userId));
    return user || null;
  }

  async createUserWithPassword(username: string, displayName: string, passwordHash: string, avatar?: string) {
    if (!this.db) {
      this.upsertMemoryUser({
        userId: username,
        username,
        displayName,
        name: displayName,
        avatar: avatar ?? null,
        passwordHash,
      });
      return;
    }
    await this.db.insert(schema.users).values({
      userId: username, // using username as ID for simplicity
      username,
      displayName,
      passwordHash,
      avatar,
    }).onConflictDoNothing();
  }

  async ensureUser(userId: string, username: string, displayName?: string) {
    if (!this.db) {
      this.upsertMemoryUser({
        userId,
        username,
        displayName: displayName || username,
        name: displayName || username,
      });
      return;
    }
    await this.db.insert(schema.users).values({
      userId,
      username,
      displayName: displayName || username,
    }).onConflictDoNothing();
  }

  async ensureTripMember({ tripId, userId, role }: { tripId: string, userId: string, role: string }) {
    if (!this.db) {
      this.ensureMemoryTripMember(tripId, userId, role);
      return;
    }
    const [existing] = await this.db.select().from(schema.tripMembers)
      .where(and(eq(schema.tripMembers.tripId, tripId), eq(schema.tripMembers.userId, userId)));
    if (!existing) {
      await this.db.insert(schema.tripMembers).values({ tripId, userId, role });
    }
  }

  async getTripMemberRole(tripId: string, userId: string) {
    if (!this.db) {
      const member = this.memoryTripMembers.find(
        (item) => item.tripId === tripId && item.userId === userId,
      );
      return member?.role || null;
    }
    const [member] = await this.db.select().from(schema.tripMembers)
      .where(and(eq(schema.tripMembers.tripId, tripId), eq(schema.tripMembers.userId, userId)));
    return member?.role || null;
  }

  async getItineraryNodes(tripId: string, options?: { day?: number }) {
    if (!this.db) return [];
    const whereClause = Number.isFinite(Number(options?.day))
      ? and(eq(schema.itineraryNodes.tripId, tripId), eq(schema.itineraryNodes.day, Number(options?.day)))
      : eq(schema.itineraryNodes.tripId, tripId);

    try {
      const rows = await this.db
        .select({
          ...itineraryNodeSelectBase,
          attachments: schema.itineraryNodes.attachments,
        })
        .from(schema.itineraryNodes)
        .where(whereClause)
        .orderBy(
          asc(schema.itineraryNodes.date),
          asc(schema.itineraryNodes.day),
          asc(schema.itineraryNodes.sortOrder),
          asc(schema.itineraryNodes.time),
          asc(schema.itineraryNodes.createdAt),
        );

      return rows.map(withNormalizedAttachments);
    } catch (error) {
      if (!isMissingColumnError(error, 'attachments')) {
        throw error;
      }

      warnMissingAttachmentsColumnOnce();

      const rows = await this.db
        .select(itineraryNodeSelectBase)
        .from(schema.itineraryNodes)
        .where(whereClause)
        .orderBy(
          asc(schema.itineraryNodes.date),
          asc(schema.itineraryNodes.day),
          asc(schema.itineraryNodes.sortOrder),
          asc(schema.itineraryNodes.time),
          asc(schema.itineraryNodes.createdAt),
        );

      return rows.map(withNormalizedAttachments);
    }
  }

  async upsertItineraryNode(tripId: string, node: any) {
    if (!this.db) return;
    const withAttachments = buildItineraryNodeWritePayload(tripId, node, true);

    try {
      await this.db.insert(schema.itineraryNodes).values(withAttachments.values).onConflictDoUpdate({
        target: schema.itineraryNodes.nodeId,
        set: withAttachments.updateSet,
      });
    } catch (error) {
      if (!isMissingColumnError(error, 'attachments')) {
        throw error;
      }

      warnMissingAttachmentsColumnOnce();
      const fallback = buildItineraryNodeWritePayload(tripId, node, false);

      await this.db.insert(schema.itineraryNodes).values(fallback.values).onConflictDoUpdate({
        target: schema.itineraryNodes.nodeId,
        set: fallback.updateSet,
      });
    }
  }

  async reorderItineraryNodes(tripId: string, nodes: Array<{ node_id: string; day?: number; date?: string | null; time?: string | null; timestamp?: string | null; sort_order?: number | null }>) {
    if (!this.db) return;

    for (const node of nodes) {
      const ts = coerceNodeTimestamp(node);
      const sortOrder = Number.isFinite(Number(node.sort_order))
        ? Number(node.sort_order)
        : 0;

      await this.db
        .update(schema.itineraryNodes)
        .set({
          day: node.day,
          date: node.date ?? (ts ? ts.toISOString().slice(0, 10) : null),
          time: node.time ?? undefined,
          timestamp: ts,
          sortOrder,
        })
        .where(and(eq(schema.itineraryNodes.tripId, tripId), eq(schema.itineraryNodes.nodeId, node.node_id)));
    }
  }

  async getPublicTrips(limit: number) {
    if (!this.db) return [];
    const rows = await this.db
      .select({
        id: schema.trips.id,
        title: schema.trips.name,
        destination: schema.trips.destination,
        forkCount: schema.trips.forkCount,
        author: schema.users.displayName,
        createdAt: schema.trips.createdAt,
      })
      .from(schema.trips)
      .leftJoin(schema.tripMembers, eq(schema.trips.id, schema.tripMembers.tripId))
      .leftJoin(schema.users, eq(schema.tripMembers.userId, schema.users.userId))
      .where(and(eq(schema.tripMembers.role, 'owner'), eq(schema.trips.isPublic, true)))
      .limit(limit);
      
    const idHash = (s: string) => [...s].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const DEST_COVERS: [string, string][] = [
      ['tokyo', 'photo-1542051841857-5f90071e7989'],
      ['osaka', 'photo-1590484512398-33fb39eff960'],
      ['kyoto', 'photo-1493976040374-85c8e12f0c0e'],
      ['seoul', 'photo-1538669715315-155098f0fb1d'],
      ['paris', 'photo-1502602898657-3e91760cbb34'],
      ['bali',  'photo-1537996194471-e657df975ab4'],
    ];
    const getCover = (dest: string) => {
      const lower = (dest ?? '').toLowerCase();
      const match = DEST_COVERS.find(([k]) => lower.includes(k));
      const photoId = match ? match[1] : DEST_COVERS[0][1];
      return `https://images.unsplash.com/${photoId}?w=800&auto=format&fit=crop`;
    };
    return rows.map((r: any) => ({
       id: r.id,
       title: r.title,
       author: r.author || 'Anonymous',
       forkCount: Number(r.forkCount ?? 0),
       likes: Number(r.forkCount ?? 0),
       cover: getCover(r.destination ?? ''),
    }));
  }

  async getTopFlights(limit: number) {
    if (!this.db) return [];
    return await this.db.select().from(schema.flights).limit(limit);
  }

  async getAllFlights() {
    if (!this.db) return [];
    return await this.db.select().from(schema.flights);
  }

  async getCollaborators() {
    if (!this.db) return Array.from(this.memoryUsers.values()).slice(0, 10);
    return await this.db.select().from(schema.users).limit(10);
  }

  async getCollaboratorsByTrip(tripId: string) {
    if (!this.db) {
      const collaborators = this.getMemoryTripMembers(tripId).map((member) => {
        return (
          this.memoryUsers.get(member.userId) ??
          this.upsertMemoryUser({
            userId: member.userId,
            username: member.userId,
            displayName: member.userId,
            name: member.userId,
          })
        );
      });

      if (collaborators.some((user) => !user.userId.startsWith('guest_'))) {
        return collaborators.filter((user) => !user.userId.startsWith('guest_'));
      }

      return collaborators;
    }
    const members = await this.db.select().from(schema.tripMembers).where(eq(schema.tripMembers.tripId, tripId));
    const userIds = members.map((m: any) => m.userId);
    if (userIds.length === 0) return [];
    return await this.db.select().from(schema.users).where(inArray(schema.users.userId, userIds));
  }

  async getUserSavedItems(userId: string) {
    if (!this.db) return [];
    return await this.db.select().from(schema.userSavedItems).where(eq(schema.userSavedItems.userId, userId));
  }

  async getUserTrackedPrices(userId: string) {
    if (!this.db) return [];
    return await this.db.select().from(schema.userTrackedPrices).where(eq(schema.userTrackedPrices.userId, userId));
  }

  async getUserAiProfile(userId: string) {
    if (!this.db) return null;
    const [profile] = await this.db.select().from(schema.userAiProfiles).where(eq(schema.userAiProfiles.userId, userId));
    return profile || null;
  }

  async upsertUserAiProfile(userId: string, profile: {
    departure?: string;
    companions?: string;
    vibes?: string[];
    interests?: string[];
    dietary?: string[];
    transport?: string[];
    budget?: string;
  }) {
    if (!this.db) return null;

    const values = {
      userId,
      preferredDeparture: profile.departure?.trim() || null,
      preferredCompanions: profile.companions?.trim() || null,
      preferredVibes: normalizeStringArray(profile.vibes),
      preferredInterests: normalizeStringArray(profile.interests),
      preferredDietary: normalizeStringArray(profile.dietary),
      preferredTransport: normalizeStringArray(profile.transport),
      preferredBudget: profile.budget?.trim() || null,
      updatedAt: new Date(),
    };

    const [row] = await this.db.insert(schema.userAiProfiles).values(values).onConflictDoUpdate({
      target: schema.userAiProfiles.userId,
      set: values,
    }).returning();

    return row || null;
  }

  async deleteTrip(tripId: string) {
    if (!this.db) {
      this.memoryTrips.delete(tripId);
      this.memoryTripMembers = this.memoryTripMembers.filter((member) => member.tripId !== tripId);
      this.memoryChecklistItems = this.memoryChecklistItems.filter((item) => item.tripId !== tripId);
      this.memoryExpenses = this.memoryExpenses.filter((expense) => expense.tripId !== tripId);
      return;
    }
    return await this.db.transaction(async (tx: any) => {
      // Delete all related records
      await tx.delete(schema.checklistItems).where(eq(schema.checklistItems.tripId, tripId)).catch(() => {});
      await tx.delete(schema.expenses).where(eq(schema.expenses.tripId, tripId)).catch(() => {});
      await tx.delete(schema.tripTravelFacts).where(eq(schema.tripTravelFacts.tripId, tripId)).catch(() => {});
      await tx.delete(schema.favorites).where(eq(schema.favorites.tripId, tripId)).catch(() => {});
      await tx.delete(schema.itineraryNodes).where(eq(schema.itineraryNodes.tripId, tripId)).catch(() => {});
      await tx.delete(schema.tripMembers).where(eq(schema.tripMembers.tripId, tripId)).catch(() => {});
      await tx.delete(schema.trips).where(eq(schema.trips.id, tripId)).catch(() => {});
    });
  }

  async getTripsByUser(userId: string) {
    if (!this.db) {
      const tripIds = this.memoryTripMembers
        .filter((member) => member.userId === userId)
        .map((member) => member.tripId);
      return tripIds
        .map((tripId) => this.memoryTrips.get(tripId))
        .filter(Boolean);
    }
    const members = await this.db.select().from(schema.tripMembers).where(eq(schema.tripMembers.userId, userId));
    const tripIds = members.map((m: any) => m.tripId);
    if (tripIds.length === 0) return [];
    return await this.db.select().from(schema.trips).where(inArray(schema.trips.id, tripIds));
  }

  async getTripById(tripId: string) {
    if (!this.db) return this.memoryTrips.get(tripId) ?? null;
    const [trip] = await this.db.select().from(schema.trips).where(eq(schema.trips.id, tripId));
    return trip || null;
  }

  async createTrip(data: { id: string, name: string, destination?: string, isPublic?: boolean, forkCount?: number }) {
    if (!this.db) {
      this.memoryTrips.set(data.id, {
        id: data.id,
        name: data.name,
        destination: data.destination ?? null,
        isPublic: Boolean(data.isPublic),
        forkCount: Number(data.forkCount ?? 0),
        createdAt: new Date(),
      });
      return;
    }
    await this.db.insert(schema.trips).values(data);
  }

  async updateTripPublicState(tripId: string, isPublic: boolean) {
    if (!this.db) {
      const trip = this.memoryTrips.get(tripId);
      if (!trip) return null;
      trip.isPublic = isPublic;
      return trip;
    }
    const [row] = await this.db
      .update(schema.trips)
      .set({ isPublic })
      .where(eq(schema.trips.id, tripId))
      .returning();
    return row || null;
  }

  async incrementTripForkCount(tripId: string) {
    if (!this.db) {
      const trip = this.memoryTrips.get(tripId);
      if (!trip) return null;
      trip.forkCount = Number(trip.forkCount ?? 0) + 1;
      return trip;
    }
    const trip = await this.getTripById(tripId);
    if (!trip) return null;
    const [row] = await this.db
      .update(schema.trips)
      .set({ forkCount: Number(trip.forkCount ?? 0) + 1 })
      .where(eq(schema.trips.id, tripId))
      .returning();
    return row || null;
  }

  async addTripMember(tripId: string, userId: string, role: string) {
    if (!this.db) {
      this.ensureMemoryTripMember(tripId, userId, role);
      return;
    }
    await this.db.insert(schema.tripMembers).values({ tripId, userId, role });
  }

  async trackUserPrice(userId: string, itemId: string) {
    if (!this.db) return;
    await this.db.insert(schema.userTrackedPrices).values({ userId, itemId }).onConflictDoNothing();
  }

  async untrackUserPrice(userId: string, itemId: string) {
    if (!this.db) return;
    await this.db.delete(schema.userTrackedPrices).where(and(eq(schema.userTrackedPrices.userId, userId), eq(schema.userTrackedPrices.itemId, itemId)));
  }

  async findItineraryNode(nodeId: string) {
    if (!this.db) return null;
    const [node] = await this.db.select().from(schema.itineraryNodes).where(eq(schema.itineraryNodes.nodeId, nodeId));
    return node || null;
  }

  async deleteItineraryNode(nodeId: string) {
    if (!this.db) return false;
    await this.db.delete(schema.itineraryNodes).where(eq(schema.itineraryNodes.nodeId, nodeId));
    return true;
  }

  async addClickoutLog(_data: any) {
    // Placeholder or implement if schema exists
  }

  async getChecklist(tripId: string) {
    if (!this.db) {
      let rows = this.memoryChecklistItems.filter((row) => row.tripId === tripId);
      if (rows.length === 0 && this.memoryTrips.has(tripId)) {
        rows = [
          { id: `default_${tripId}_1`, tripId, content: '護照 / 簽證', completed: false, category: 'documents' },
          { id: `default_${tripId}_2`, tripId, content: '手機 / 充電線', completed: false, category: 'electronics' },
        ];
        this.memoryChecklistItems.push(...rows);
      }
      return rows;
    }
    let rows = await this.db.select().from(schema.checklistItems).where(eq(schema.checklistItems.tripId, tripId));
    
    if (rows.length === 0) {
      try {
        // Only insert defaults if the trip actually exists
        const tripExists = await this.db.select({ id: schema.trips.id }).from(schema.trips).where(eq(schema.trips.id, tripId));
        if (tripExists.length === 0) {
          console.warn(`Trip ${tripId} not found when generating default checklist, skipping insert`);
          return [];
        }

        const defaults = [
          { tripId, content: '護照 / 簽證', completed: false, category: 'documents' },
          { tripId, content: '當地貨幣 / 信用卡', completed: false, category: 'documents' },
          { tripId, content: '手機 / 充電線', completed: false, category: 'electronics' },
          { tripId, content: '轉換插頭', completed: false, category: 'electronics' },
          { tripId, content: '行動電源', completed: false, category: 'electronics' },
          { tripId, content: '換洗衣物', completed: false, category: 'clothing' },
          { tripId, content: '舒適步行鞋', completed: false, category: 'clothing' },
          { tripId, content: '盥洗用品', completed: false, category: 'toiletries' },
          { tripId, content: '防曬乳', completed: false, category: 'toiletries' },
          { tripId, content: '常備藥品', completed: false, category: 'other' },
        ];
        await this.db.insert(schema.checklistItems).values(defaults);
        rows = await this.db.select().from(schema.checklistItems).where(eq(schema.checklistItems.tripId, tripId));
      } catch (e) {
        console.error('Failed to insert default checklist item:', e);
        return [
          { id: 'default-1', tripId, content: '護照 / 簽證', completed: false },
          { id: 'default-2', tripId, content: '手機 / 充電線', completed: false }
        ];
      }
    }
    return rows;
  }

  async updateChecklist(tripId: string, items: any[]) {
    if (!this.db) {
      this.memoryChecklistItems = this.memoryChecklistItems.filter((item) => item.tripId !== tripId);
      this.memoryChecklistItems.push(
        ...items.map((item) => ({
          id: String(item.id ?? `check_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
          tripId,
          content: String(item.content || item.text || '').trim(),
          completed: Boolean(item.completed ?? item.checked ?? false),
          category: String(item.category ?? 'other'),
        })),
      );
      return true;
    }
    await this.db.delete(schema.checklistItems).where(eq(schema.checklistItems.tripId, tripId));
    if (items.length > 0) {
      await this.db.insert(schema.checklistItems).values(items.map(it => ({
        tripId,
        content: it.content || it.text || '',
        completed: it.completed ?? it.checked ?? false,
        category: it.category ?? 'other',
      })));
    }
    return true;
  }

  async addLedgerExpense(tripId: string, expense: any) {
    if (!this.db) {
      const payerId = String(expense.payer_id ?? '').trim();
      const members = Array.from(
        new Set([...normalizeStringArray(expense.members), payerId].filter(Boolean)),
      );

      for (const memberId of members) {
        this.upsertMemoryUser({
          userId: memberId,
          username: memberId,
          displayName: memberId,
          name: memberId,
        });
        this.ensureMemoryTripMember(tripId, memberId, memberId === payerId ? 'editor' : 'viewer');
      }

      this.memoryExpenses.push({
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        tripId,
        payerId,
        amount: Number(expense.amount),
        currency: String(expense.currency ?? 'TWD'),
        description: expense.description ?? null,
        members,
        createdAt: new Date(),
        clearedAt: null,
      });
      return true;
    }
    await this.db.insert(schema.expenses).values({
      tripId,
      payerId: expense.payer_id,
      amount: Number(expense.amount),
      description: expense.description,
    });
    return true;
  }

  async getAggregatedSettlements(tripId: string) {
    if (!this.db) {
      const rows = this.memoryExpenses.filter((expense) => expense.tripId === tripId && !expense.clearedAt);
      if (rows.length === 0) return [];

      const balancesByCurrency: Record<string, Record<string, number>> = {};

      for (const row of rows) {
        const currency = row.currency || 'TWD';
        const participants = row.members.length > 0
          ? row.members
          : this.getMemoryTripMembers(tripId).map((member) => member.userId);
        if (participants.length === 0) continue;
        if (!balancesByCurrency[currency]) balancesByCurrency[currency] = {};
        const balances = balancesByCurrency[currency];

        for (const participant of participants) {
          if (!(participant in balances)) balances[participant] = 0;
        }

        const splitAmount = row.amount / participants.length;
        for (const participant of participants) {
          if (participant === row.payerId) {
            balances[participant] += row.amount - splitAmount;
          } else {
            balances[participant] -= splitAmount;
          }
        }
      }

      const settlements: { id: string, from: string, to: string, amount: number, currency: string }[] = [];

      for (const [currency, balances] of Object.entries(balancesByCurrency)) {
        const debtors = Object.entries(balances)
          .filter(([, bal]) => bal < -0.01)
          .map(([userId, bal]) => ({ userId, bal: -bal }))
          .sort((a, b) => b.bal - a.bal);

        const creditors = Object.entries(balances)
          .filter(([, bal]) => bal > 0.01)
          .map(([userId, bal]) => ({ userId, bal }))
          .sort((a, b) => b.bal - a.bal);

        let debtorIndex = 0;
        let creditorIndex = 0;
        while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
          const debtor = debtors[debtorIndex];
          const creditor = creditors[creditorIndex];
          const amount = Math.min(debtor.bal, creditor.bal);
          settlements.push({
            id: `stl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            from: debtor.userId,
            to: creditor.userId,
            amount: Math.round(amount),
            currency,
          });
          debtor.bal -= amount;
          creditor.bal -= amount;
          if (debtor.bal < 0.01) debtorIndex += 1;
          if (creditor.bal < 0.01) creditorIndex += 1;
        }
      }

      return settlements;
    }
    const rows = await this.db.select().from(schema.expenses).where(
      and(eq(schema.expenses.tripId, tripId), isNull(schema.expenses.clearedAt))
    );
    const members = await this.db.select().from(schema.tripMembers).where(eq(schema.tripMembers.tripId, tripId));
    
    if (members.length === 0 || rows.length === 0) return [];
    
    const balances: Record<string, number> = {};
    for (const m of members) balances[m.userId] = 0;
    
    for (const r of rows) {
      const splitAmount = r.amount / members.length;
      for (const m of members) {
        if (m.userId === r.payerId) {
          balances[m.userId] += (r.amount - splitAmount);
        } else {
          balances[m.userId] -= splitAmount;
        }
      }
    }
    
    const debtors = Object.entries(balances)
      .filter(([_, bal]) => bal < -0.01)
      .map(([userId, bal]) => ({ userId, bal: -bal }))
      .sort((a, b) => b.bal - a.bal);
      
    const creditors = Object.entries(balances)
      .filter(([_, bal]) => bal > 0.01)
      .map(([userId, bal]) => ({ userId, bal }))
      .sort((a, b) => b.bal - a.bal);

    const settlements: { id: string, from: string, to: string, amount: number, currency: string }[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.bal, creditor.bal);
      
      settlements.push({
        id: `stl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        from: debtor.userId,
        to: creditor.userId,
        amount: Math.round(amount),
        currency: 'TWD',
      });
      
      debtor.bal -= amount;
      creditor.bal -= amount;
      if (debtor.bal < 0.01) i++;
      if (creditor.bal < 0.01) j++;
    }
    
    return settlements;
  }

  async clearSettlements(tripId: string) {
    if (!this.db) {
      const clearedAt = new Date();
      this.memoryExpenses = this.memoryExpenses.map((expense) =>
        expense.tripId === tripId && !expense.clearedAt
          ? { ...expense, clearedAt }
          : expense,
      );
      return true;
    }
    await this.db
      .update(schema.expenses)
      .set({ clearedAt: new Date() })
      .where(and(eq(schema.expenses.tripId, tripId), isNull(schema.expenses.clearedAt)));
    return true;
  }

  async getSettlementHistory(tripId: string) {
    if (!this.db) {
      const rows = this.memoryExpenses
        .filter((expense) => expense.tripId === tripId && expense.clearedAt)
        .sort((a, b) => (a.clearedAt?.getTime() ?? 0) - (b.clearedAt?.getTime() ?? 0));

      const grouped: Record<string, { clearedAt: string; count: number; payers: string[]; currencyTotals: Record<string, number> }> = {};
      for (const row of rows) {
        if (!row.clearedAt) continue;
        const key = row.clearedAt.toISOString().slice(0, 10);
        if (!grouped[key]) {
          grouped[key] = {
            clearedAt: row.clearedAt.toISOString(),
            count: 0,
            payers: [],
            currencyTotals: {},
          };
        }
        grouped[key].count += 1;
        if (!grouped[key].payers.includes(row.payerId)) grouped[key].payers.push(row.payerId);
        grouped[key].currencyTotals[row.currency] = (grouped[key].currencyTotals[row.currency] ?? 0) + row.amount;
      }

      return Object.entries(grouped).map(([date, g]) => ({ date, ...g })).reverse();
    }
    const rows = await this.db
      .select()
      .from(schema.expenses)
      .where(and(eq(schema.expenses.tripId, tripId), isNotNull(schema.expenses.clearedAt)))
      .orderBy(asc(schema.expenses.clearedAt));

    const grouped: Record<string, { clearedAt: string; count: number; payers: string[]; currencyTotals: Record<string, number> }> = {};
    for (const r of rows) {
      const utc8 = new Date(r.clearedAt!.getTime() + 8 * 60 * 60 * 1000);
      const key = utc8.toISOString().slice(0, 10);
      if (!grouped[key]) grouped[key] = { clearedAt: r.clearedAt!.toISOString(), count: 0, payers: [], currencyTotals: {} };
      grouped[key].count += 1;
      if (!grouped[key].payers.includes(r.payerId)) grouped[key].payers.push(r.payerId);
      const cur = r.currency ?? 'TWD';
      grouped[key].currencyTotals[cur] = (grouped[key].currencyTotals[cur] ?? 0) + r.amount;
    }
    return Object.entries(grouped).map(([date, g]) => ({ date, ...g })).reverse();
  }

  async getFavoritesByTrip(tripId: string) {
    if (!this.db) return [];
    return await this.db.select().from(schema.favorites).where(eq(schema.favorites.tripId, tripId));
  }

  async getTripTravelFacts(tripId: string) {
    if (!this.db) return [];
    return await this.db.select().from(schema.tripTravelFacts).where(eq(schema.tripTravelFacts.tripId, tripId));
  }

  async getTripTravelFactById(id: string) {
    if (!this.db) return null;
    const [row] = await this.db.select().from(schema.tripTravelFacts).where(eq(schema.tripTravelFacts.id, id));
    return row || null;
  }

  async createTripTravelFact(tripId: string, data: any) {
    if (!this.db) return null;
    const [row] = await this.db
      .insert(schema.tripTravelFacts)
      .values({
        tripId,
        factType: data.factType,
        source: data.source ?? 'manual',
        title: data.title,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
        locationName: data.locationName,
        lat: data.lat,
        lng: data.lng,
        referenceCode: data.referenceCode,
        metadata: data.metadata ?? null,
      })
      .returning();
    return row || null;
  }

  async updateTripTravelFact(id: string, data: any) {
    if (!this.db) return null;
    const [row] = await this.db
      .update(schema.tripTravelFacts)
      .set({
        factType: data.factType,
        source: data.source,
        title: data.title,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
        locationName: data.locationName,
        lat: data.lat,
        lng: data.lng,
        referenceCode: data.referenceCode,
        metadata: data.metadata ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.tripTravelFacts.id, id))
      .returning();
    return row || null;
  }

  async deleteTripTravelFact(id: string) {
    if (!this.db) return false;
    await this.db.delete(schema.tripTravelFacts).where(eq(schema.tripTravelFacts.id, id));
    return true;
  }

  async createFavorite(tripId: string, data: any) {
    if (!this.db) return null;
    const [row] = await this.db.insert(schema.favorites).values({
      id: data.id,
      tripId: tripId,
      title: data.title,
      emoji: data.emoji,
      lat: data.lat,
      lng: data.lng,
    }).returning();
    return row;
  }

  async getFavoriteById(id: string) {
    if (!this.db) return null;
    const [row] = await this.db.select().from(schema.favorites).where(eq(schema.favorites.id, id));
    return row || null;
  }

  async deleteFavorite(id: string) {
    if (!this.db) return false;
    const res = await this.db.delete(schema.favorites).where(eq(schema.favorites.id, id));
    return true;
  }

  async saveUserItem(userId: string, itemId: string) {
    if (!this.db) return;
    await this.db.insert(schema.userSavedItems).values({ userId, itemId }).onConflictDoNothing();
  }

  async unsaveUserItem(userId: string, itemId: string) {
    if (!this.db) return;
    await this.db.delete(schema.userSavedItems).where(and(eq(schema.userSavedItems.userId, userId), eq(schema.userSavedItems.itemId, itemId)));
  }

  async getRouteSearchDemand(fromVariants: string[], toVariants: string[]): Promise<{ month: number; count: number }[]> {
    if (!this.db) return [];
    const rows = await this.db.execute(sql`
      SELECT
        EXTRACT(MONTH FROM timestamp)::int AS month,
        COUNT(*)::int AS count
      FROM search_history
      WHERE query_from = ANY(${fromVariants}::text[])
        AND query_to = ANY(${toVariants}::text[])
        AND timestamp > NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `);
    return (rows.rows as { month: number; count: number }[]);
  }

  async getPublicTripsByDestination(dbVariants: string[]): Promise<{
    id: string;
    name: string;
    fork_count: number;
    day: number;
    time: string | null;
    title: string;
    category: string | null;
    description: string | null;
    sort_order: number;
  }[]> {
    if (!this.db) return [];
    const rows = await this.db.execute(sql`
      SELECT
        t.id,
        t.name,
        t.fork_count,
        n.day,
        n.time,
        n.title,
        n.category,
        n.description,
        n.sort_order
      FROM trips t
      JOIN itinerary_nodes n ON n.trip_id = t.id
      WHERE t.is_public = true
        AND t.destination = ANY(${dbVariants}::text[])
      ORDER BY t.fork_count DESC, n.day ASC, n.sort_order ASC
      LIMIT 200
    `);
    return rows.rows as any[];
  }

}

