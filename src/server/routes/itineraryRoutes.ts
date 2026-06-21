import type { Express } from 'express';
import type { Server as IOServer } from 'socket.io';
import type { AppRepository } from '../repositories/appRepository';
import type { EnsureTripRole } from '../auth/requestAuth';

export interface ItineraryRoutesDeps {
  repo: AppRepository;
  ensureTripRole: EnsureTripRole;
  io: IOServer;
  mapItineraryNodeRow: (node: any, index: number) => any;
  normalizeItineraryPatchChanges: (existingNode: any, rawChanges: any) => any;
  validateLinkedFactId: (repo: AppRepository, tripId: string, linkedFactId?: string | null) => Promise<boolean>;
  buildNodeTimestamp: (valueDate: unknown, valueTime: unknown) => Date | null;
  normalizeDateOnlyInput: (value: unknown) => string | null;
  appendPlanningRecord: (record: any) => Promise<void>;
  updatePlanningSnapshot: (repo: AppRepository, tripId: string) => Promise<void>;
  getPlanningRecords: (tripId: string, limit: number) => Promise<any[]>;
  getPlanningSnapshot: (tripId: string) => Promise<unknown[] | null>;
}

/** Registers /api/itinerary/* routes (node CRUD/sync + planning log/snapshot). */
export function registerItineraryRoutes(app: Express, deps: ItineraryRoutesDeps): void {
  const {
    repo,
    ensureTripRole,
    io,
    mapItineraryNodeRow,
    normalizeItineraryPatchChanges,
    validateLinkedFactId,
    buildNodeTimestamp,
    normalizeDateOnlyInput,
    appendPlanningRecord,
    updatePlanningSnapshot,
    getPlanningRecords,
    getPlanningSnapshot,
  } = deps;

  app.get('/api/itinerary', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const day = Number(req.query.day ?? NaN);
    const safeDay = Number.isFinite(day) && day > 0 ? day : undefined;
    const nodes = await repo.getItineraryNodes(tripId, { day: safeDay });
    const formatted = nodes.map((node, index) => mapItineraryNodeRow(node, index));

    res.json(formatted);
  });

  app.post('/api/itinerary/sync', async (req, res) => {
    const { trip_id, action, payload } = req.body as {
      trip_id?: string;
      action?: string;
      payload?: { node_id?: string; day?: number; date?: string; time?: string; timestamp?: string; sort_order?: number; title?: string; emoji?: string; category?: string; lat?: number | null; lng?: number | null; description?: string; ai_note?: string; intensity?: string; is_visited?: boolean; transport_to_next?: string; image_url?: string; attachments?: Array<{ id?: string; name?: string; type?: string; url?: string }>; linkedFactId?: string; changes?: Record<string, unknown> };
    };

    if (!trip_id || !action || !payload?.node_id) {
      res.status(400).json({ status: 'error', message: 'invalid sync payload' });
      return;
    }

    const allowed = await ensureTripRole(req, res, trip_id, 'editor');
    if (!allowed) return;

    if (action === 'patch_node') {
      if (!payload.changes || typeof payload.changes !== 'object') {
        res.status(400).json({ status: 'error', message: 'invalid patch payload' });
        return;
      }

      const existing = await repo.findItineraryNode(payload.node_id);
      if (!existing || existing.tripId !== trip_id) {
        res.status(404).json({ status: 'error', message: 'node not found' });
        return;
      }

      const existingNode = mapItineraryNodeRow(existing, 0);
      const normalizedChanges = normalizeItineraryPatchChanges(existingNode, payload.changes);
      const nextLinkedFactId = 'linkedFactId' in normalizedChanges
        ? String(normalizedChanges.linkedFactId ?? '')
        : String(existingNode.linkedFactId ?? '');

      const linkedFactAllowed = await validateLinkedFactId(repo, trip_id, nextLinkedFactId);
      if (!linkedFactAllowed) {
        res.status(400).json({ status: 'error', message: 'linked travel fact is invalid' });
        return;
      }

      const mergedNode = {
        ...existingNode,
        ...normalizedChanges,
        linkedFactId: nextLinkedFactId,
      };

      await repo.upsertItineraryNode(trip_id, mergedNode);

      await appendPlanningRecord({
        trip_id,
        action: 'patch_node',
        node_id: payload.node_id,
        day: Number(mergedNode.day ?? 1),
        time: String(mergedNode.time ?? ''),
        title: String(mergedNode.title ?? ''),
        category: String(mergedNode.category ?? 'other'),
        source: 'api',
        timestamp: new Date().toISOString(),
      });
      await updatePlanningSnapshot(repo, trip_id);

      io.to(trip_id).emit('sync_itinerary', {
        trip_id,
        action: 'patch_node',
        payload: {
          node_id: payload.node_id,
          changes: normalizedChanges,
        },
      });

      res.json({ status: 'success' });
      return;
    }

    if (action !== 'add_node' || !payload.time || !payload.title) {
      res.status(400).json({ status: 'error', message: 'invalid sync payload' });
      return;
    }

    const linkedFactAllowed = await validateLinkedFactId(repo, trip_id, payload.linkedFactId);
    if (!linkedFactAllowed) {
      res.status(400).json({ status: 'error', message: 'linked travel fact is invalid' });
      return;
    }

    await repo.upsertItineraryNode(trip_id, {
      node_id: payload.node_id,
      day: payload.day,
      date: normalizeDateOnlyInput(payload.date) ?? undefined,
      time: payload.time,
      timestamp: payload.timestamp ?? buildNodeTimestamp(payload.date, payload.time)?.toISOString(),
      sort_order: payload.sort_order,
      title: payload.title,
      emoji: payload.emoji,
      category: payload.category,
      lat: payload.lat,
      lng: payload.lng,
      is_visited: payload.is_visited,
      description: payload.description,
      ai_note: payload.ai_note,
      intensity: payload.intensity,
      transport_to_next: payload.transport_to_next,
      image_url: payload.image_url,
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      linkedFactId: payload.linkedFactId,
    });

    await appendPlanningRecord({
      trip_id,
      action: 'add_node',
      node_id: payload.node_id,
      day: Number(payload.day ?? 1),
      time: payload.time,
      title: payload.title,
      category: payload.category ?? 'other',
      source: 'api',
      timestamp: new Date().toISOString(),
    });
    await updatePlanningSnapshot(repo, trip_id);

    io.to(trip_id).emit('sync_itinerary', {
      trip_id,
      action: 'add_node',
      payload: {
        node_id: payload.node_id,
        day: Number(payload.day ?? 1),
        date: normalizeDateOnlyInput(payload.date) ?? null,
        time: payload.time,
        timestamp: payload.timestamp ?? buildNodeTimestamp(payload.date, payload.time)?.toISOString() ?? null,
        sort_order: Number(payload.sort_order ?? 0),
        title: payload.title,
        emoji: payload.emoji ?? '📍',
        category: payload.category ?? 'other',
        lat: payload.lat ?? null,
        lng: payload.lng ?? null,
        is_visited: payload.is_visited ?? false,
        description: payload.description ?? '',
        ai_note: payload.ai_note ?? null,
        intensity: payload.intensity ?? null,
        transport_to_next: payload.transport_to_next ?? null,
        image_url: payload.image_url ?? null,
        linkedFactId: payload.linkedFactId,
      },
    });

    res.json({ status: 'success' });
  });

  app.delete('/api/itinerary/:node_id', async (req, res) => {
    const nodeId = String(req.params.node_id ?? '').trim();
    if (!nodeId) {
      res.status(400).json({ status: 'error', message: 'node_id required' });
      return;
    }

    const existed = await repo.findItineraryNode(nodeId);
    if (!existed) {
      res.status(404).json({ status: 'error', message: 'node not found' });
      return;
    }

    const allowed = await ensureTripRole(req, res, existed.tripId, 'editor');
    if (!allowed) return;

    const deleted = await repo.deleteItineraryNode(nodeId);
    if (!deleted) {
      res.status(404).json({ status: 'error', message: 'node not found' });
      return;
    }

    io.to(existed.tripId).emit('sync_itinerary', {
      trip_id: existed.tripId,
      action: 'remove_node',
      payload: { node_id: nodeId },
    });

    await appendPlanningRecord({
      trip_id: existed.tripId,
      action: 'remove_node',
      node_id: nodeId,
      source: 'api',
      timestamp: new Date().toISOString(),
    });
    await updatePlanningSnapshot(repo, existed.tripId);

    res.json({ status: 'success' });
  });

  app.get('/api/itinerary/planning-log', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const limit = Number(req.query.limit ?? 100);
    const data = await getPlanningRecords(tripId, Number.isFinite(limit) ? limit : 100);
    res.json({ status: 'success', data });
  });

  app.get('/api/itinerary/planning-snapshot', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const snapshot = await getPlanningSnapshot(tripId);
    res.set('Cache-Control', 'private, max-age=300');
    res.json({ status: 'success', data: snapshot ?? [] });
  });
}
