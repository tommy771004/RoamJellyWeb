import { create } from 'zustand';

export const useItineraryStore = create<any>((set) => ({
  itineraries: [],
  setItineraries: (itineraries: any[]) => set({ itineraries }),

  nodes: [],
  setNodes: (nodes: any[]) => set({ nodes }),
  replaceDayNodes: (day: number, nextDayNodes: any[]) =>
    set((state: any) => ({
      nodes: [
        ...state.nodes.filter((n: any) => Number(n.day ?? 1) !== Number(day)),
        ...nextDayNodes,
      ],
    })),
  addNode: (node: any) =>
    set((state: any) => ({
      nodes: state.nodes.some((n: any) => n.node_id === node.node_id)
        ? state.nodes.map((n: any) => (n.node_id === node.node_id ? { ...n, ...node } : n))
        : [...state.nodes, node],
    })),
  updateNode: (node: any) =>
    set((state: any) => ({
      nodes: state.nodes.map((n: any) => (n.node_id === node.node_id ? node : n)),
    })),
  patchNode: (node_id: string, changes: any) =>
    set((state: any) => ({
      nodes: state.nodes.map((n: any) => (n.node_id === node_id ? { ...n, ...changes } : n)),
    })),
  removeNode: (node_id: string) =>
    set((state: any) => ({
      nodes: state.nodes.filter((n: any) => n.node_id !== node_id),
    })),

  collaborators: [],
  setCollaborators: (collaborators: any[]) => set({ collaborators }),

  isOffline: false,
  setOffline: (isOffline: boolean) => set({ isOffline }),
}));
