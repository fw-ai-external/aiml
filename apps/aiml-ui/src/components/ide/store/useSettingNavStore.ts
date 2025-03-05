import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingNavState {
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

export const useSettingNavStore = create<SettingNavState>()(
  persist(
    (set) => ({
      activeNav: "Messages & media",
      setActiveNav: (nav) => set({ activeNav: nav }),
    }),
    {
      name: "setting-nav-active",
    }
  )
);
