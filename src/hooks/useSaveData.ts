import { useSyncExternalStore } from 'react';
import { getSnapshot, subscribe, type SaveData } from '../utils/storage';

/** Reactive view of the persisted save. Re-renders on any storage mutation. */
export function useSaveData(): SaveData {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
