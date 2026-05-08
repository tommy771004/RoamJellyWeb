import { create } from 'zustand';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  payer: string;
  splitWith: string[];
  date: string;
}

export interface Settlement {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
}

function calculateSettlements(expenses: Expense[]): Settlement[] {
  const balances: Record<string, Record<string, number>> = {}; // currency -> member -> balance (positive means they are owed, negative means they owe)
  
  for (const exp of expenses) {
    if (!balances[exp.currency]) balances[exp.currency] = {};
    const curBalances = balances[exp.currency];
    
    // Payer gets credited
    curBalances[exp.payer] = (curBalances[exp.payer] || 0) + exp.amount;
    
    // Splitters get debited
    const splitAmount = exp.amount / exp.splitWith.length;
    for (const member of exp.splitWith) {
      curBalances[member] = (curBalances[member] || 0) - splitAmount;
    }
  }

  const settlements: Settlement[] = [];
  
  for (const currency in balances) {
    const curBalances = balances[currency];
    // Separate into debtors and creditors
    const debtors = Object.entries(curBalances).filter(([, bal]) => bal < -0.01).map(([name, bal]) => ({ name, bal: -bal })).sort((a, b) => b.bal - a.bal);
    const creditors = Object.entries(curBalances).filter(([, bal]) => bal > 0.01).map(([name, bal]) => ({ name, bal })).sort((a, b) => b.bal - a.bal);
    
    let d = 0;
    let c = 0;
    
    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      
      const minAmount = Math.min(debtor.bal, creditor.bal);
      
      settlements.push({
        id: `${debtor.name}-${creditor.name}-${currency}-${Date.now()}-${Math.random()}`,
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(minAmount),
        currency,
      });
      
      debtor.bal -= minAmount;
      creditor.bal -= minAmount;
      
      if (debtor.bal < 0.01) d++;
      if (creditor.bal < 0.01) c++;
    }
  }
  
  return settlements;
}

export const useToolsStore = create<any>((set, get) => ({
  tools: [],
  checklist: [],
  setChecklist: (checklist: any[]) => set({ checklist }),
  revertCheckItem: (id: string, checked: boolean) =>
    set((state: any) => ({
      checklist: state.checklist.map((i: any) => (i.id === id ? { ...i, checked } : i)),
    })),
    
  expenses: [],
  addExpense: (expense: Expense) => set((state: any) => {
    const newExpenses = [...state.expenses, expense];
    return { expenses: newExpenses, settlements: calculateSettlements(newExpenses) };
  }),
  
  settlements: [],
  setSettlements: (settlements: any[]) => set({ settlements }),
  
  clearSettlementRecord: (from: string, to: string, currency: string) => set((state: any) => {
    // A simplified clear that just adds a compensating expense to offset the debt
    const existingSettlement = state.settlements.find((s: Settlement) => s.from === from && s.to === to && s.currency === currency);
    if (!existingSettlement) return state;
    
    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      title: '結清款項',
      amount: existingSettlement.amount,
      currency,
      payer: from,
      splitWith: [to],
      date: new Date().toISOString()
    };
    const newExpenses = [...state.expenses, newExpense];
    return { expenses: newExpenses, settlements: calculateSettlements(newExpenses) };
  }),

  members: [],
  setMembers: (members: any[]) => set({ members }),
}));
