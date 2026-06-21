import type { Express } from 'express';
import type { AppRepository } from '../repositories/appRepository';
import { getRequestUserId, type EnsureTripRole } from '../auth/requestAuth';
import { normalizeMembers } from '../utils/serverHelpers';

export interface ToolsRoutesDeps {
  repo: AppRepository;
  authRequired: boolean;
  ensureTripRole: EnsureTripRole;
}

/** Registers the travel-toolkit routes: checklist, ledger, settlements. */
export function registerToolsRoutes(app: Express, deps: ToolsRoutesDeps): void {
  const { repo, authRequired, ensureTripRole } = deps;

  app.get('/api/checklist', async (req, res) => {
    if (!getRequestUserId(req) && authRequired) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const tripId = String(req.query.trip_id ?? '').trim();
    const rows = tripId ? await repo.getChecklist(tripId) : [];
    res.json(rows.map((row) => ({ id: row.id, text: row.content, checked: Boolean(row.completed), category: row.category ?? 'other' })));
  });

  app.post('/api/checklist', async (req, res) => {
    if (!getRequestUserId(req) && authRequired) {
      res.status(401).json({ status: 'error', message: 'unauthorized' });
      return;
    }
    const { trip_id, items } = req.body;
    if (!trip_id || !Array.isArray(items)) {
      res.status(400).json({ status: 'error', message: 'trip_id and items array required' });
      return;
    }
    await repo.updateChecklist(trip_id, items);
    res.json({ status: 'success' });
  });

  app.post('/api/ledger/expense', async (req, res) => {
    const { trip_id, title, amount, currency, payer, split_with } = req.body as {
      trip_id?: string;
      title?: string;
      amount?: number;
      currency?: string;
      payer?: string;
      split_with?: unknown;
    };

    const members = normalizeMembers(split_with);
    const safeAmount = Number(amount);
    if (!trip_id || !title || !payer || members.length === 0 || !Number.isFinite(safeAmount) || safeAmount <= 0) {
      res.status(400).json({ status: 'error', message: 'invalid ledger payload' });
      return;
    }

    const allowed = await ensureTripRole(req, res, trip_id, 'editor');
    if (!allowed) return;

    if (!members.includes(payer)) members.push(payer);

    await repo.addLedgerExpense(trip_id, {
      payer_id: payer,
      amount: safeAmount,
      currency,
      description: title,
      members,
    });

    const settlementRows = await repo.getAggregatedSettlements(trip_id);
    res.json({ status: 'success', settlements: settlementRows });
  });

  app.get('/api/ledger/expenses', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }
    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const cleared = req.query.cleared === 'true';
    const expensesList = await repo.getLedgerExpenses(tripId, cleared);
    res.json(expensesList);
  });

  app.get('/api/settlements', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;

    const rows = await repo.getAggregatedSettlements(tripId);
    res.json(rows);
  });

  app.post('/api/settlements/clear', async (req, res) => {
    const { trip_id, from_name, to_name, currency } = req.body as {
      trip_id?: string;
      from_name?: string;
      to_name?: string;
      currency?: string;
    };
    if (!trip_id || !from_name || !to_name) {
      res.status(400).json({ status: 'error', message: 'trip_id, from_name, to_name are required' });
      return;
    }

    const allowed = await ensureTripRole(req, res, trip_id, 'editor');
    if (!allowed) return;

    await repo.clearSettlements(trip_id);
    const rows = await repo.getAggregatedSettlements(trip_id);
    res.json({ status: 'success', settlements: rows });
  });

  app.get('/api/settlements/history', async (req, res) => {
    const tripId = String(req.query.trip_id ?? '').trim();
    if (!tripId) {
      res.status(400).json({ status: 'error', message: 'trip_id is required' });
      return;
    }
    const allowed = await ensureTripRole(req, res, tripId, 'viewer');
    if (!allowed) return;
    const history = await repo.getSettlementHistory(tripId);
    res.json(history);
  });
}
