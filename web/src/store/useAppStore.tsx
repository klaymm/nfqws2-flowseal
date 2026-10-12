import { create } from 'zustand';

type AppStore = {
  auth: boolean | undefined;
  setAuth: (v: boolean) => void;

  needSave: boolean;
  setNeedSave: (v: boolean) => void;

  onSave: () => Promise<void>;
  setOnSave: (v: () => Promise<void>) => void;

  updating: boolean;
  setUpdating: (v: boolean) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  auth: undefined,
  setAuth: (auth) => set({ auth }),

  needSave: false,
  setNeedSave: (needSave) => set({ needSave }),

  onSave: async () => {},
  setOnSave: (onSave: () => Promise<void>) => set({ onSave }),

  updating: false,
  setUpdating: (updating) => set({ updating }),
}));
