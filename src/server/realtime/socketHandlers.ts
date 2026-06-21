import type { Server as IOServer } from 'socket.io';
import type { AppRepository } from '../repositories/appRepository';
import { verifyAccessToken } from '../auth/jwt';
import { hasRequiredRole } from '../auth/requestAuth';

export interface SocketHandlerDeps {
  repo: AppRepository;
  authRequired: boolean;
  mapItineraryNodeRow: (node: any, index: number) => any;
  normalizeItineraryPatchChanges: (existingNode: any, rawChanges: any) => any;
  validateLinkedFactId: (repo: AppRepository, tripId: string, linkedFactId?: string | null) => Promise<boolean>;
  buildNodeTimestamp: (valueDate: unknown, valueTime: unknown) => Date | null;
  normalizeDateOnlyInput: (value: unknown) => string | null;
  appendPlanningRecord: (record: any) => Promise<void>;
  updatePlanningSnapshot: (repo: AppRepository, tripId: string) => Promise<void>;
}

/** Wires Socket.io auth middleware + real-time itinerary co-editing handlers. */
export function registerSocketHandlers(io: IOServer, deps: SocketHandlerDeps): void {
  const {
    repo,
    authRequired,
    mapItineraryNodeRow,
    normalizeItineraryPatchChanges,
    validateLinkedFactId,
    buildNodeTimestamp,
    normalizeDateOnlyInput,
    appendPlanningRecord,
    updatePlanningSnapshot,
  } = deps;

  io.use(async (socket, next) => {
    try {
      const authHeader = typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : typeof socket.handshake.headers.authorization === 'string'
          ? socket.handshake.headers.authorization
          : '';

      const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : authHeader;
      if (!token) {
        if (authRequired) {
          next(new Error('missing token'));
          return;
        }
        socket.data.userId = 'demo_user';
        next();
        return;
      }

      const user = verifyAccessToken(token);
      if (!user) {
        next(new Error('invalid token'));
        return;
      }

      socket.data.userId = user.userId;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  const activeEditingLocks = new Map<
    string,
    {
      tripId: string;
      nodeId: string;
      day: number;
      userId: string;
      userName: string;
      socketId: string;
    }
  >();

  const releaseLocksForSocket = (socketId: string) => {
    for (const [lockKey, lock] of activeEditingLocks.entries()) {
      if (lock.socketId !== socketId) continue;
      activeEditingLocks.delete(lockKey);
      io.to(lock.tripId).emit('editing_stop', { nodeId: lock.nodeId, day: lock.day });
    }
  };

  io.on('connection', (socket) => {
    socket.on('join_room', async (payload: { trip_id?: string }) => {
      if (!payload?.trip_id) return;
      const userId = String(socket.data.userId ?? '');
      if (!userId) return;

      const role = await repo.getTripMemberRole(payload.trip_id, userId);
      if (!role) {
        socket.emit('error', { message: 'forbidden: not a trip member' });
        return;
      }

      socket.join(payload.trip_id);

      for (const lock of activeEditingLocks.values()) {
        if (lock.tripId !== payload.trip_id || lock.userId === userId) continue;
        socket.emit('editing_start', {
          userName: lock.userName,
          nodeId: lock.nodeId,
          day: lock.day,
        });
      }
    });

    socket.on(
      'sync_itinerary',
      async (event: {
        trip_id?: string;
        action?: string;
        payload?: { node_id?: string; day?: number; date?: string; time?: string; timestamp?: string; sort_order?: number; title?: string; emoji?: string; category?: string; lat?: number | null; lng?: number | null; description?: string; ai_note?: string; intensity?: string; is_visited?: boolean; transport_to_next?: string; image_url?: string; attachments?: Array<{ id?: string; name?: string; type?: string; url?: string }>; linkedFactId?: string; changes?: Record<string, unknown> };
      }) => {
        if (!event?.trip_id || !event.action || !event.payload?.node_id) {
          return;
        }

        const userId = String(socket.data.userId ?? '');
        if (!userId) return;

        const role = await repo.getTripMemberRole(event.trip_id, userId);
        if (!role || !hasRequiredRole(role, 'editor')) {
          socket.emit('error', { message: 'forbidden: editor role required' });
          return;
        }

        if (event.action === 'patch_node') {
          if (!event.payload.changes || typeof event.payload.changes !== 'object') {
            return;
          }

          const existing = await repo.findItineraryNode(event.payload.node_id);
          if (!existing || existing.tripId !== event.trip_id) {
            socket.emit('error', { message: 'node not found' });
            return;
          }

          const existingNode = mapItineraryNodeRow(existing, 0);
          const normalizedChanges = normalizeItineraryPatchChanges(existingNode, event.payload.changes);
          const nextLinkedFactId = 'linkedFactId' in normalizedChanges
            ? String(normalizedChanges.linkedFactId ?? '')
            : String(existingNode.linkedFactId ?? '');

          const linkedFactAllowed = await validateLinkedFactId(repo, event.trip_id, nextLinkedFactId);
          if (!linkedFactAllowed) {
            socket.emit('error', { message: 'invalid linked travel fact' });
            return;
          }

          const mergedNode = {
            ...existingNode,
            ...normalizedChanges,
            linkedFactId: nextLinkedFactId,
          };

          await repo.upsertItineraryNode(event.trip_id, mergedNode);

          await appendPlanningRecord({
            trip_id: event.trip_id,
            action: 'patch_node',
            node_id: event.payload.node_id,
            day: Number(mergedNode.day ?? 1),
            time: String(mergedNode.time ?? ''),
            title: String(mergedNode.title ?? ''),
            category: String(mergedNode.category ?? 'other'),
            source: 'socket',
            timestamp: new Date().toISOString(),
          });
          await updatePlanningSnapshot(repo, event.trip_id);

          socket.to(event.trip_id).emit('sync_itinerary', {
            trip_id: event.trip_id,
            action: 'patch_node',
            payload: {
              node_id: event.payload.node_id,
              changes: normalizedChanges,
            },
          });
          return;
        }

        if (
          event.action !== 'add_node' ||
          !event.payload.time ||
          !event.payload.title
        ) {
          return;
        }

        const linkedFactAllowed = await validateLinkedFactId(repo, event.trip_id, event.payload.linkedFactId);
        if (!linkedFactAllowed) {
          socket.emit('error', { message: 'invalid linked travel fact' });
          return;
        }

        await repo.upsertItineraryNode(event.trip_id, {
          node_id: event.payload.node_id,
          day: event.payload.day,
          date: normalizeDateOnlyInput(event.payload.date) ?? undefined,
          time: event.payload.time,
          timestamp: event.payload.timestamp ?? buildNodeTimestamp(event.payload.date, event.payload.time)?.toISOString(),
          sort_order: event.payload.sort_order,
          title: event.payload.title,
          emoji: event.payload.emoji,
          category: event.payload.category,
          lat: event.payload.lat,
          lng: event.payload.lng,
          is_visited: event.payload.is_visited,
          description: event.payload.description,
          ai_note: event.payload.ai_note,
          intensity: event.payload.intensity,
          transport_to_next: event.payload.transport_to_next,
          image_url: event.payload.image_url,
          attachments: Array.isArray(event.payload.attachments) ? event.payload.attachments : [],
          linkedFactId: event.payload.linkedFactId,
        });

        await appendPlanningRecord({
          trip_id: event.trip_id,
          action: 'add_node',
          node_id: event.payload.node_id,
          day: Number(event.payload.day ?? 1),
          time: event.payload.time,
          title: event.payload.title,
          category: event.payload.category ?? 'other',
          source: 'socket',
          timestamp: new Date().toISOString(),
        });
        await updatePlanningSnapshot(repo, event.trip_id);

        socket.to(event.trip_id).emit('sync_itinerary', {
          trip_id: event.trip_id,
          action: 'add_node',
          payload: {
            node_id: event.payload.node_id,
            day: Number(event.payload.day ?? 1),
            date: normalizeDateOnlyInput(event.payload.date) ?? null,
            time: event.payload.time,
            timestamp: event.payload.timestamp ?? buildNodeTimestamp(event.payload.date, event.payload.time)?.toISOString() ?? null,
            sort_order: Number(event.payload.sort_order ?? 0),
            title: event.payload.title,
            emoji: event.payload.emoji ?? '📍',
            category: event.payload.category ?? 'other',
            lat: event.payload.lat ?? null,
            lng: event.payload.lng ?? null,
            is_visited: event.payload.is_visited ?? false,
            description: event.payload.description ?? '',
            ai_note: event.payload.ai_note ?? null,
            intensity: event.payload.intensity ?? null,
            transport_to_next: event.payload.transport_to_next ?? null,
            image_url: event.payload.image_url ?? null,
            attachments: Array.isArray(event.payload.attachments) ? event.payload.attachments : [],
            linkedFactId: event.payload.linkedFactId ?? null,
          },
        });
      },
    );

    socket.on('editing_start', async (payload: { trip_id?: string; nodeId?: string; day?: number }) => {
      const tripId = String(payload?.trip_id ?? '');
      const nodeId = String(payload?.nodeId ?? '');
      const day = Number(payload?.day ?? 1);
      if (!tripId || !socket.data?.userId) return;

      // Verify the user is a trip member before broadcasting
      const role = await repo.getTripMemberRole(tripId, socket.data.userId).catch(() => null);
      if (!role) return;

      const userRecord = await repo.getUserById(socket.data.userId).catch(() => null);
      const userName = userRecord?.displayName || String(socket.data.userId);
      const lockKey = `${tripId}:${nodeId}`;
      const existingLock = activeEditingLocks.get(lockKey);

      if (existingLock && existingLock.userId !== socket.data.userId) {
        socket.emit('editing_denied', {
          nodeId,
          day: existingLock.day,
          userName: existingLock.userName,
        });
        return;
      }

      activeEditingLocks.set(lockKey, {
        tripId,
        nodeId,
        day,
        userId: String(socket.data.userId),
        userName,
        socketId: socket.id,
      });

      // Broadcast to all other members in the trip room
      socket.to(tripId).emit('editing_start', { userName, nodeId, day });
    });

    socket.on('editing_stop', async (payload: { trip_id?: string; nodeId?: string }) => {
      const tripId = String(payload?.trip_id ?? '');
      const nodeId = String(payload?.nodeId ?? '');
      if (!tripId || !socket.data?.userId) return;

      const role = await repo.getTripMemberRole(tripId, socket.data.userId).catch(() => null);
      if (!role) return;

      if (!nodeId) return;

      const lockKey = `${tripId}:${nodeId}`;
      const existingLock = activeEditingLocks.get(lockKey);
      if (existingLock && existingLock.userId === socket.data.userId) {
        activeEditingLocks.delete(lockKey);
      }

      socket.to(tripId).emit('editing_stop', { nodeId });
    });

    socket.on('disconnect', () => {
      releaseLocksForSocket(socket.id);
    });
  });
}
