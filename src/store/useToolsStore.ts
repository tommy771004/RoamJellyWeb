import { create } from 'zustand';

export const useToolsStore = create<any>((set) => ({
  tools: [],
  checklist: [],
  setChecklist: (checklist: any[]) => set({ checklist }),
  revertCheckItem: (id: string, checked: boolean) =>
    set((state: any) => ({
      checklist: state.checklist.map((i: any) => (i.id === id ? { ...i, checked } : i)),
    })),
  settlements: [],
  setSettlements: (settlements: any[]) => set({ settlements }),
  members: [],
  setMembers: (members: any[]) => set({ members }),
}));
