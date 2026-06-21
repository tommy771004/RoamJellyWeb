export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
}

/**
 * Greedy minimal-cash-flow settlement: turns a per-user signed balance map
 * (positive = owed money / creditor, negative = owes money / debtor) into a
 * minimal list of debtor -> creditor transfers for a single currency.
 *
 * Pure and deterministic except for the generated `id`; tests assert on
 * from/to/amount/currency.
 */
export function settleBalances(balances: Record<string, number>, currency: string): Settlement[] {
  const debtors = Object.entries(balances)
    .filter(([, bal]) => bal < -0.01)
    .map(([userId, bal]) => ({ userId, bal: -bal }))
    .sort((a, b) => b.bal - a.bal);

  const creditors = Object.entries(balances)
    .filter(([, bal]) => bal > 0.01)
    .map(([userId, bal]) => ({ userId, bal }))
    .sort((a, b) => b.bal - a.bal);

  const settlements: Settlement[] = [];
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

  return settlements;
}
