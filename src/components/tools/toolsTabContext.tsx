import { createContext, use } from "react";
import type {
  TripInfo,
  WeatherData,
  ChecklistItem,
  Settlement,
  SettlementHistoryEntry,
} from "../../types/workflow";
import type { Expense } from "../../store/useToolsStore";

export interface ExpenseForm {
  title: string;
  amount: string;
  currency: string;
  payer: string;
  splitWith: string[];
}

export interface FormErrors {
  title?: string;
  amount?: string;
  payer?: string;
  splitWith?: string;
}

// ── Context interface ────────────────────────────────────────────────────────

export interface ToolsTabState {
  loading: boolean;
  tip: string;
  weather: WeatherData | null;
  tripInfo: TripInfo | null;
  destination: string;
  checklist: ChecklistItem[];
  settlements: Settlement[];
  settlementHistory: SettlementHistoryEntry[];
  expenses: Expense[];
  clearedExpenses: Expense[];
  members: string[];
  expenseByCurrency: Record<string, number>;
  form: ExpenseForm;
  errors: FormErrors;
  submitting: boolean;
  aiLoading: boolean;
  clearingId: string | null;
}

export interface ToolsTabActions {
  toggleCheck: (item: ChecklistItem) => void;
  handleAiPackingList: (customDest?: string, customSeason?: string, customPeople?: number, customDays?: number) => void;
  updateForm: (updater: (prev: ExpenseForm) => ExpenseForm) => void;
  clearFormError: (field: keyof FormErrors) => void;
  toggleSplitMember: (member: string) => void;
  submitExpense: () => void;
  handleClearSettlement: (settlement: {
    id: string;
    from: string;
    to: string;
    currency: string;
  }) => void;
  sendReminder: () => void;
  addCustomMember: (name: string) => void;
}

export interface ToolsTabContextValue {
  state: ToolsTabState;
  actions: ToolsTabActions;
}

export const ToolsTabContext = createContext<ToolsTabContextValue | null>(null);

export function useToolsTabContext() {
  const ctx = use(ToolsTabContext);
  if (!ctx)
    throw new Error("useToolsTabContext must be used inside ToolsTabProvider");
  return ctx;
}
