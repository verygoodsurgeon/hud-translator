import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_SETTINGS, type Settings } from './schema';

interface SettingsStore {
  s: Settings;
  set: (patch: Partial<Settings>) => void;
  setHud: (patch: Partial<Settings['hud']>) => void;
  setRefine: (patch: Partial<Settings['refine']>) => void;
  reset: () => void;
}

/** 깊은 병합: 저장된 옛 설정에 새로 생긴 키가 없어도 기본값으로 채운다 */
function mergeDefaults(saved: Partial<Settings> | undefined): Settings {
  const d = DEFAULT_SETTINGS;
  if (!saved) return d;
  return {
    ...d,
    ...saved,
    refine: { ...d.refine, ...saved.refine },
    history: { ...d.history, ...saved.history },
    hud: { ...d.hud, ...saved.hud },
    tts: { ...d.tts, ...saved.tts },
    summary: { ...d.summary, ...saved.summary },
    assist: { ...d.assist, ...saved.assist },
    teleprompter: { ...d.teleprompter, ...saved.teleprompter },
  };
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      s: DEFAULT_SETTINGS,
      set: (patch) => set((st) => ({ s: { ...st.s, ...patch } })),
      setHud: (patch) => set((st) => ({ s: { ...st.s, hud: { ...st.s.hud, ...patch } } })),
      setRefine: (patch) => set((st) => ({ s: { ...st.s, refine: { ...st.s.refine, ...patch } } })),
      reset: () => set({ s: DEFAULT_SETTINGS }),
    }),
    {
      name: 'hudtr.settings.v1',
      partialize: (st) => ({ s: st.s }),
      merge: (persisted, current) => ({
        ...current,
        s: mergeDefaults((persisted as { s?: Partial<Settings> } | undefined)?.s),
      }),
    },
  ),
);
