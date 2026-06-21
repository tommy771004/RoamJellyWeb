import type { Express } from 'express';
import type { AppRepository } from '../repositories/appRepository';
import type { EnsureTripRole } from '../auth/requestAuth';

export type GeocodeSpot = (title: string, city?: string) => Promise<{ lat: number; lng: number } | null>;

export interface FavoritesRoutesDeps {
  repo: AppRepository;
  ensureTripRole: EnsureTripRole;
  geocodeSpot: GeocodeSpot;
}

/** Registers /api/favorites routes (trip-scoped spot bookmarks). */
export function registerFavoritesRoutes(app: Express, deps: FavoritesRoutesDeps): void {
  const { repo, ensureTripRole, geocodeSpot } = deps;

  app.get('/api/favorites', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const rows = await repo.getFavoritesByTrip(tripId);
    res.json(
      rows.map((row) => ({
        id: row.id,
        trip_id: row.tripId,
        title: row.title,
        emoji: row.emoji,
        lat: row.lat,
        lng: row.lng,
      })),
    );
  });

  app.post('/api/favorites', async (req, res) => {
    const { trip_id, title, emoji } = req.body as { trip_id?: string; title?: string; emoji?: string };
    if (!trip_id || !title?.trim()) {
      res.status(400).json({ status: 'error', message: 'trip_id and title required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, trip_id, 'editor');
    if (!allowed) return;

    const trip = await repo.getTripById(trip_id);
    if (!trip) {
      res.status(404).json({ status: 'error', message: 'trip not found' });
      return;
    }

    const coords = await geocodeSpot(title.trim(), trip.destination);
    const favorite = await repo.createFavorite(trip_id, {
      id: `fav_${Date.now()}`,
      title: title.trim(),
      emoji: emoji ?? '📍',
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });

    res.status(201).json({
      id: favorite.id,
      trip_id: favorite.tripId,
      title: favorite.title,
      emoji: favorite.emoji,
      lat: favorite.lat,
      lng: favorite.lng,
    });
  });

  app.delete('/api/favorites/:id', async (req, res) => {
    const id = String(req.params.id ?? '').trim();
    const favorite = await repo.getFavoriteById(id);
    if (!favorite) {
      res.status(404).json({ status: 'error', message: 'favorite not found' });
      return;
    }

    const allowed = await ensureTripRole(req, res, favorite.tripId, 'editor');
    if (!allowed) return;

    const removed = await repo.deleteFavorite(id);
    if (!removed) {
      res.status(404).json({ status: 'error', message: 'favorite not found' });
      return;
    }

    res.json({ status: 'success' });
  });
}
