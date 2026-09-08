import { createContext, useContext } from 'react';

export type Route =
  | { name: 'splash' }
  | { name: 'home' }
  | { name: 'levels' }
  | { name: 'game'; levelId: number; mode: 'level' | 'daily' }
  | { name: 'daily' }
  | { name: 'achievements' }
  | { name: 'stats' }
  | { name: 'settings' };

export interface Nav {
  route: Route;
  go: (r: Route) => void;
  back: () => void;
  replace: (r: Route) => void;
  canBack: boolean;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used inside NavContext');
  return ctx;
}
