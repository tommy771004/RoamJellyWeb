import type { Express } from 'express';
import type { AppRepository } from '../repositories/appRepository';
import { getRequestUserId } from '../auth/requestAuth';

export interface UserRoutesDeps {
  repo: AppRepository;
}

/** Registers /api/user/* routes. All require an authenticated user. */
export function registerUserRoutes(app: Express, deps: UserRoutesDeps): void {
  const { repo } = deps;

  // ── User Subscriptions ──────────────────────────────────────────────────────
  app.get('/api/user/subscriptions', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    try {
      const subs = await repo.getUserSubscriptions(userId);
      res.json({ status: 'success', data: subs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Failed to fetch subscriptions' });
    }
  });

  app.post('/api/user/subscriptions/toggle', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const { destination, channel } = req.body || {};
    if (!destination || !channel) {
      res.status(400).json({ status: 'error', message: 'Missing destination or channel' });
      return;
    }
    try {
      const result = await repo.toggleUserSubscription(userId, destination, channel);
      res.json({ status: 'success', data: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Failed to toggle subscription' });
    }
  });

  // ── User Preferences ────────────────────────────────────────────────────────
  app.get('/api/user/preferences', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    try {
      const [savedItems, trackedPrices, aiProfile] = await Promise.all([
        repo.getUserSavedItems(userId).catch((err) => {
          console.error('[UserPref DB Error] getUserSavedItems failed:', err);
          return [];
        }),
        repo.getUserTrackedPrices(userId).catch((err) => {
          console.error('[UserPref DB Error] getUserTrackedPrices failed:', err);
          return [];
        }),
        repo.getUserAiProfile(userId).catch((err) => {
          console.error('[UserPref DB Error] getUserAiProfile failed:', err);
          return null;
        }),
      ]);
      res.json({
        saved_items: (savedItems || []).map((item: any) => item.itemId),
        tracked_prices: (trackedPrices || []).map((item: any) => item.itemId),
        ai_profile: aiProfile ? {
          departure: aiProfile.preferredDeparture ?? '',
          companions: aiProfile.preferredCompanions ?? '',
          vibes: Array.isArray(aiProfile.preferredVibes) ? aiProfile.preferredVibes : [],
          interests: Array.isArray(aiProfile.preferredInterests) ? aiProfile.preferredInterests : [],
          dietary: Array.isArray(aiProfile.preferredDietary) ? aiProfile.preferredDietary : [],
          transport: Array.isArray(aiProfile.preferredTransport) ? aiProfile.preferredTransport : [],
          budget: aiProfile.preferredBudget ?? '',
        } : null,
      });
    } catch (err) {
      console.error('[UserPref Endpoint Error] Failed to get preferences:', err);
      res.json({
        saved_items: [],
        tracked_prices: [],
        ai_profile: null,
      });
    }
  });

  app.patch('/api/user/preferences/profile', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }

    const profile = {
      departure: String(req.body?.departure ?? '').trim(),
      companions: String(req.body?.companions ?? '').trim(),
      vibes: Array.isArray(req.body?.vibes) ? req.body.vibes : [],
      interests: Array.isArray(req.body?.interests) ? req.body.interests : [],
      dietary: Array.isArray(req.body?.dietary) ? req.body.dietary : [],
      transport: Array.isArray(req.body?.transport) ? req.body.transport : [],
      budget: String(req.body?.budget ?? '').trim(),
    };

    try {
      const row = await repo.upsertUserAiProfile(userId, profile);
      res.json({
        departure: row?.preferredDeparture ?? profile.departure,
        companions: row?.preferredCompanions ?? profile.companions,
        vibes: Array.isArray(row?.preferredVibes) ? row.preferredVibes : profile.vibes,
        interests: Array.isArray(row?.preferredInterests) ? row.preferredInterests : profile.interests,
        dietary: Array.isArray(row?.preferredDietary) ? row.preferredDietary : profile.dietary,
        transport: Array.isArray(row?.preferredTransport) ? row.preferredTransport : profile.transport,
        budget: row?.preferredBudget ?? profile.budget,
      });
    } catch (err) {
      console.error('[UserPref Endpoint Error] Failed to upsert profile:', err);
      res.json({
        departure: profile.departure,
        companions: profile.companions,
        vibes: profile.vibes,
        interests: profile.interests,
        dietary: profile.dietary,
        transport: profile.transport,
        budget: profile.budget,
      });
    }
  });

  app.post('/api/user/saves', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const itemId = String(req.body?.item_id ?? '').trim();
    if (!itemId) {
      res.status(400).json({ status: 'error', message: 'item_id is required' });
      return;
    }
    await repo.saveUserItem(userId, itemId);
    res.status(201).json({ status: 'success' });
  });

  app.delete('/api/user/saves/:item_id', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    await repo.unsaveUserItem(userId, req.params.item_id);
    res.json({ status: 'success' });
  });

  app.post('/api/user/tracks', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const itemId = String(req.body?.item_id ?? '').trim();
    if (!itemId) {
      res.status(400).json({ status: 'error', message: 'item_id is required' });
      return;
    }
    await repo.trackUserPrice(userId, itemId);
    res.status(201).json({ status: 'success' });
  });

  app.delete('/api/user/tracks/:item_id', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    await repo.untrackUserPrice(userId, req.params.item_id);
    res.json({ status: 'success' });
  });

  // ── User Trips ──────────────────────────────────────────────────────────────
  app.get('/api/user/trips', async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const tripRows = await repo.getTripsByUser(userId);
    res.json(
      tripRows.map((trip) => ({
        tripId: trip.id,
        name: trip.name,
        destination: trip.destination ?? '',
      })),
    );
  });
}
