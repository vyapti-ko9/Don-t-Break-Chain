import { useCallback } from 'react';
import { setSetting, type Settings } from '../utils/storage';
import { useSaveData } from './useSaveData';

export function useSettings(): {
  settings: Settings;
  toggle: (key: keyof Settings) => void;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
} {
  const save = useSaveData();
  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSetting(key, value);
  }, []);
  const toggle = useCallback(
    (key: keyof Settings) => {
      set(key, !save.settings[key] as never);
    },
    [save.settings, set],
  );
  return { settings: save.settings, toggle, set };
}
