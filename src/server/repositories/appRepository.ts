import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import * as schema from '../db/schema';

export class AppRepository {

  private db: any;
  constructor(dbClient: any) {
    this.db = dbClient;
  }

  async healthCheck() {
    if (!this.db) return true;
    await this.db.execute('SELECT 1');
    return true;
  }

  async getUserByUsername(username: string) {
    if (!this.db) return null;
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.username, username));
    return user || null;
  }

  async createUserWithPassword(username: string, displayName: string, passwordHash: string) {
    if (!this.db) return;
    await this.db.insert(schema.users).values({
      userId: username, // using username as ID for simplicity
      username,
      displayName,
      passwordHash,
    }).onConflictDoNothing();
  }

  async ensureUser(userId: string, username: string) {
    if (!this.db) return;
    await this.db.insert(schema.users).values({
      userId,
      username,
      displayName: username,
    }).onConflictDoNothing();
  }

  async ensureTripMember({ tripId, userId, role }: { tripId: string, userId: string, role: string }) {
    if (!this.db) return;
    const [existing] = await this.db.select().from(schema.tripMembers)
      .where(and(eq(schema.tripMembers.tripId, tripId), eq(schema.tripMembers.userId, userId)));
    if (!existing) {
      await this.db.insert(schema.tripMembers).values({ tripId, userId, role });
    }
  }

  async getTripMemberRole(tripId: string, userId: string) {
    if (!this.db) return 'owner'; // fallback
    const [member] = await this.db.select().from(schema.tripMembers)
      .where(and(eq(schema.tripMembers.tripId, tripId), eq(schema.tripMembers.userId, userId)));
    return member?.role || null;
  }

  async getItineraryNodes(tripId: string) {
    if (!this.db) return [];
    return await this.db.select().from(schema.itineraryNodes).where(eq(schema.itineraryNodes.tripId, tripId));
  }

  async upsertItineraryNode(tripId: string, node: any) {
    if (!this.db) return;
    const ts = node.timestamp ? new Date(node.timestamp) : null;
    await this.db.insert(schema.itineraryNodes).values({
      nodeId: node.node_id,
      tripId,
      day: node.day,
      time: node.time,
      timestamp: ts,
      title: node.title,
      emoji: node.emoji,
      category: node.category,
      lat: node.lat,
      lng: node.lng,
      description: node.description,
    }).onConflictDoUpdate({
      target: schema.itineraryNodes.nodeId,
      set: {
        day: node.day,
        time: node.time,
        timestamp: ts,
        title: node.title,
        emoji: node.emoji,
        category: node.category,
        lat: node.lat,
        lng: node.lng,
        description: node.description,
      }
    });
  }

  async getPublicTrips(limit: number) {
    if (!this.db) return [];
    // For demo purposes, we will treat all trips as public and join with users to get author names
    const rows = await this.db
      .select({
        id: schema.trips.id,
        title: schema.trips.name,
        destination: schema.trips.destination,
        author: schema.users.displayName,
        createdAt: schema.trips.createdAt,
      })
      .from(schema.trips)
      .leftJoin(schema.tripMembers, eq(schema.trips.id, schema.tripMembers.tripId))
      .leftJoin(schema.users, eq(schema.tripMembers.userId, schema.users.userId))
      .where(eq(schema.tripMembers.role, 'owner'))
      .limit(limit);
      
    // Transform to handbook format
    return rows.map((r: any) => ({
       id: r.id,
       title: r.title,
       author: r.author || 'Anonymous',
       likes: Math.floor(Math.random() * 1000), // Random likes for demo as we don't have likes count
       cover: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800'
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
    if (!this.db) return [];
    return await this.db.select().from(schema.users).limit(10);
  }

  async getCollaboratorsByTrip(tripId: string) {
    if (!this.db) return [];
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

  async getTripsByUser(userId: string) {
    if (!this.db) return [];
    const members = await this.db.select().from(schema.tripMembers).where(eq(schema.tripMembers.userId, userId));
    const tripIds = members.map((m: any) => m.tripId);
    if (tripIds.length === 0) return [];
    return await this.db.select().from(schema.trips).where(inArray(schema.trips.id, tripIds));
  }

  async getTripById(tripId: string) {
    if (!this.db) return null;
    const [trip] = await this.db.select().from(schema.trips).where(eq(schema.trips.id, tripId));
    return trip || null;
  }

  async createTrip(data: { id: string, name: string, destination?: string }) {
    if (!this.db) return;
    await this.db.insert(schema.trips).values(data);
  }

  async addTripMember(tripId: string, userId: string, role: string) {
    if (!this.db) return;
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
    if (!this.db) return [];
    return await this.db.select().from(schema.checklistItems).where(eq(schema.checklistItems.tripId, tripId));
  }

  async updateChecklist(tripId: string, items: any[]) {
    if (!this.db) return false;
    await this.db.delete(schema.checklistItems).where(eq(schema.checklistItems.tripId, tripId));
    if (items.length > 0) {
      await this.db.insert(schema.checklistItems).values(items.map(it => ({
        tripId,
        content: it.content,
        completed: it.completed ?? false
      })));
    }
    return true;
  }

  async addLedgerExpense(tripId: string, expense: any) {
    if (!this.db) return false;
    await this.db.insert(schema.expenses).values({
      tripId,
      payerId: expense.payer_id,
      amount: Number(expense.amount),
      description: expense.description,
    });
    return true;
  }

  async getAggregatedSettlements(tripId: string) {
    if (!this.db) return [];
    const rows = await this.db.select().from(schema.expenses).where(eq(schema.expenses.tripId, tripId));
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
    if (!this.db) return false;
    await this.db.delete(schema.expenses).where(eq(schema.expenses.tripId, tripId));
    return true;
  }

  async getFavoritesByTrip(tripId: string) {
    if (!this.db) return [];
    return await this.db.select().from(schema.favorites).where(eq(schema.favorites.tripId, tripId));
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

}

