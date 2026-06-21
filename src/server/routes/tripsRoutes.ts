import type { Express } from 'express';
import type { Server as IOServer } from 'socket.io';
import type { AppRepository } from '../repositories/appRepository';
import { getRequestUserId, type EnsureTripRole } from '../auth/requestAuth';

export interface TripsRoutesDeps {
  repo: AppRepository;
  authRequired: boolean;
  ensureTripRole: EnsureTripRole;
  io: IOServer;
  buildTripInfo: (repo: AppRepository, tripId: string) => Promise<unknown>;
  mapTravelFactRow: (row: any) => unknown;
  summarizeTravelFacts: (rows: any[]) => unknown;
}

/** Registers collaborator + trip CRUD/clone/public + trip travel-fact routes. */
export function registerTripsRoutes(app: Express, deps: TripsRoutesDeps): void {
  const { repo, authRequired, ensureTripRole, io, buildTripInfo, mapTravelFactRow, summarizeTravelFacts } = deps;

  app.get('/api/collaborators', async (req, res) => {
    if (!getRequestUserId(req) && authRequired) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const tripId = String(req.query.trip_id ?? '').trim();
    const rows = tripId ? await repo.getCollaboratorsByTrip(tripId) : await repo.getCollaborators();
    res.json(rows.map((r) => ({ id: r.userId, name: r.name, avatar: r.avatar })));
  });

  app.delete('/api/trips/:trip_id', async (req, res) => {
    const userId = getRequestUserId(req);
    const { trip_id } = req.params;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    // Only owner can delete the trip
    const allowed = await ensureTripRole(req, res, trip_id, 'owner');
    if (!allowed) return;

    try {
      await repo.deleteTrip(trip_id);

      // Also broadcast to the room if needed, so clients connected to this trip can react
      io.to(`trip_${trip_id}`).emit('trip_deleted', { trip_id });

      res.json({ status: 'success' });
    } catch (error) {
      console.error('Delete trip error:', error);
      res.status(500).json({ status: 'error', message: 'failed to delete trip' });
    }
  });

  // ── Trip: Create new trip ────────────────────────────────────────────────────
  app.post('/api/trips', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const { name, destination } = req.body ?? {};
    if (!name?.trim()) {
      res.status(400).json({ status: 'error', message: 'name is required' });
      return;
    }
    const tripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await repo.createTrip({ id: tripId, name: String(name).trim(), destination: destination ? String(destination).trim() : undefined });
    await repo.addTripMember(tripId, userId, 'owner');
    res.status(201).json({ status: 'success', data: { id: tripId, name: String(name).trim(), destination: destination ?? null } });
  });

  // ── Trip: public preview (no auth required) ─────────────────────────────────
  app.get('/api/trips/:trip_id/preview', async (req, res) => {
    const info = await buildTripInfo(repo, req.params.trip_id);
    if (!info) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }
    res.json(info);
  });

  // ── Trip: Join via invite link ───────────────────────────────────────────────
  app.post('/api/trips/:trip_id/join', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const trip = await repo.getTripById(req.params.trip_id);
    if (!trip) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }
    await repo.ensureTripMember({ tripId: req.params.trip_id, userId, role: 'editor' });
    res.json({ status: 'success', trip_id: req.params.trip_id });
  });

  app.post('/api/trips/:trip_id/clone', async (req, res) => {
    const tripId = req.params.trip_id;
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }

    let trip = await repo.getTripById(tripId);
    let nodes = await repo.getItineraryNodes(tripId);
    const facts = await repo.getTripTravelFacts(tripId);

    if (!trip) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }

    const role = await repo.getTripMemberRole(tripId, userId);
    if (!role && !trip.isPublic) {
      res.status(403).json({ status: 'error', message: 'trip is not public' });
      return;
    }

    // Create new trip
    const newTripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await repo.createTrip({
      id: newTripId,
      name: `${trip.name} (複製)`,
      destination: trip.destination,
    });
    // Add user as owner
    await repo.addTripMember(newTripId, userId, 'owner');

    const factIdMap = new Map<string, string>();
    for (const fact of facts) {
      const createdFact = await repo.createTripTravelFact(newTripId, {
        factType: fact.factType,
        source: fact.source,
        title: fact.title,
        startAt: fact.startAt,
        endAt: fact.endAt,
        locationName: fact.locationName,
        lat: fact.lat,
        lng: fact.lng,
        referenceCode: fact.referenceCode,
        metadata: fact.metadata ?? null,
      });
      if (createdFact?.id) {
        factIdMap.set(fact.id, createdFact.id);
      }
    }

    // Copy nodes
    let cloneIdx = 0;
    for (const node of nodes) {
      const suffix = `${Date.now()}_clean_${cloneIdx++}_${Math.random().toString(36).substring(2, 10)}`;
      await repo.upsertItineraryNode(newTripId, {
        node_id: `node_cloned_${suffix}`,
        day: node.day,
        date: node.date,
        time: node.time || '10:00',
        timestamp: node.timestamp,
        sort_order: node.sortOrder,
        title: node.title,
        emoji: node.emoji || '📍',
        category: node.category || 'spot',
        description: node.description,
        ai_note: node.aiNote,
        intensity: node.intensity,
        is_visited: node.isVisited,
        lat: node.lat,
        lng: node.lng,
        transport_to_next: node.transportToNext,
        image_url: node.imageUrl,
        attachments: Array.isArray(node.attachments) ? node.attachments : [],
        linkedFactId: node.linkedFactId ? (factIdMap.get(node.linkedFactId) ?? undefined) : undefined,
      });
    }

    await repo.incrementTripForkCount(tripId);

    res.json({ status: 'success', data: { new_trip_id: newTripId } });
  });

  app.patch('/api/trips/:trip_id/public', async (req, res) => {
    const tripId = req.params.trip_id;
    const allowed = await ensureTripRole(req, res, tripId, 'owner');
    if (!allowed) return;

    const isPublic = Boolean(req.body?.isPublic);
    const updated = await repo.updateTripPublicState(tripId, isPublic);
    if (!updated) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }

    res.json({
      status: 'success',
      data: {
        trip_id: updated.id,
        isPublic: Boolean(updated.isPublic),
        forkCount: Number(updated.forkCount ?? 0),
      },
    });
  });

  app.get('/api/trips/:trip_id', async (req, res) => {
    const tripId = req.params.trip_id;
    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const info = await buildTripInfo(repo, tripId);
    if (!info) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }

    res.json(info);
  });

  app.get('/api/trips/:trip_id/facts', async (req, res) => {
    const tripId = req.params.trip_id;
    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const facts = await repo.getTripTravelFacts(tripId);
    res.json(summarizeTravelFacts(facts));
  });

  app.post('/api/trips/:trip_id/facts', async (req, res) => {
    const tripId = req.params.trip_id;
    const allowed = await ensureTripRole(req, res, tripId, 'editor');
    if (!allowed) return;

    const {
      factType,
      source = 'manual',
      title,
      startAt,
      endAt,
      locationName,
      lat,
      lng,
      referenceCode,
      metadata,
    } = req.body ?? {};

    if (!factType || !title?.trim()) {
      res.status(400).json({ status: 'error', message: 'factType and title are required' });
      return;
    }

    const created = await repo.createTripTravelFact(tripId, {
      factType: String(factType),
      source: String(source),
      title: String(title).trim(),
      startAt,
      endAt,
      locationName: locationName ? String(locationName).trim() : null,
      lat: Number.isFinite(Number(lat)) ? Number(lat) : null,
      lng: Number.isFinite(Number(lng)) ? Number(lng) : null,
      referenceCode: referenceCode ? String(referenceCode).trim() : null,
      metadata: metadata && typeof metadata === 'object' ? metadata : null,
    });

    res.status(201).json(mapTravelFactRow(created));
  });

  app.patch('/api/trips/:trip_id/facts/:fact_id', async (req, res) => {
    const tripId = req.params.trip_id;
    const factId = req.params.fact_id;
    const allowed = await ensureTripRole(req, res, tripId, 'editor');
    if (!allowed) return;

    const existing = await repo.getTripTravelFactById(factId);
    if (!existing || existing.tripId !== tripId) {
      res.status(404).json({ status: 'error', message: 'travel fact not found' });
      return;
    }

    const updated = await repo.updateTripTravelFact(factId, {
      factType: String(req.body?.factType ?? existing.factType),
      source: String(req.body?.source ?? existing.source),
      title: String(req.body?.title ?? existing.title).trim(),
      startAt: req.body?.startAt ?? existing.startAt,
      endAt: req.body?.endAt ?? existing.endAt,
      locationName: req.body?.locationName ?? existing.locationName,
      lat: req.body?.lat ?? existing.lat,
      lng: req.body?.lng ?? existing.lng,
      referenceCode: req.body?.referenceCode ?? existing.referenceCode,
      metadata: req.body?.metadata ?? existing.metadata,
    });

    res.json(mapTravelFactRow(updated));
  });

  app.delete('/api/trips/:trip_id/facts/:fact_id', async (req, res) => {
    const tripId = req.params.trip_id;
    const factId = req.params.fact_id;
    const allowed = await ensureTripRole(req, res, tripId, 'editor');
    if (!allowed) return;

    const existing = await repo.getTripTravelFactById(factId);
    if (!existing || existing.tripId !== tripId) {
      res.status(404).json({ status: 'error', message: 'travel fact not found' });
      return;
    }

    await repo.deleteTripTravelFact(factId);
    res.json({ status: 'success' });
  });
}
