import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TabsState {
  problemTab: string;
  workspaceTab: string;
  hydrated: boolean;
  setProblemTab: (value: string) => void;
  setWorkspaceTab: (value: string) => void;
  setHydrated: (value: boolean) => void;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set) => ({
      problemTab: "description",
      workspaceTab: "editor",
      hydrated: false,
      setProblemTab: (value) => set({ problemTab: value }),
      setWorkspaceTab: (value) => set({ workspaceTab: value }),
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: "tabs-active",
      partialize: (state) => ({
        problemTab: state.problemTab,
        workspaceTab: state.workspaceTab,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("hydrate error", error);
        } else if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
