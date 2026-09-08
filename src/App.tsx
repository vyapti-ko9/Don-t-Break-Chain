import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavContext, type Nav, type Route } from './navigation';
import { Splash } from './pages/Splash';
import { Home } from './pages/Home';
import { LevelSelect } from './pages/LevelSelect';
import { Game } from './pages/Game';
import { DailyChallenge } from './pages/DailyChallenge';
import { Achievements } from './pages/Achievements';
import { Statistics } from './pages/Statistics';
import { Settings } from './pages/Settings';
import { initPlatform, setBackHandler } from './services/platform';
import { load } from './utils/storage';

export default function App() {
  const [stack, setStack] = useState<Route[]>([{ name: 'splash' }]);
  const route = stack[stack.length - 1];
  const [orientationWarn, setOrientationWarn] = useState(false);
  const stackRef = useRef(stack);
  stackRef.current = stack;

  useEffect(() => {
    load(); // hydrate + migrate the save once
    void initPlatform();
  }, []);

  const go = useCallback((r: Route) => {
    // Landing on home clears the stack so completion screens can't trap the user.
    if (r.name === 'home') {
      setStack([{ name: 'home' }]);
      return;
    }
    setStack((s) => [...s, r]);
  }, []);
  const replace = useCallback(
    (r: Route) => setStack((s) => [...s.slice(0, -1), r]),
    [],
  );
  const back = useCallback(() => {
    setStack((s) => {
      if (s.length <= 1) return s;
      // never navigate back into the splash
      const next = s.slice(0, -1);
      return next[next.length - 1]?.name === 'splash' ? [{ name: 'home' }] : next;
    });
  }, []);

  // Android hardware back button
  useEffect(() => {
    setBackHandler(() => {
      if (stackRef.current.length > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => setBackHandler(null);
  }, [back]);

  // browser back button support
  useEffect(() => {
    const onPop = () => back();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [back]);
  useEffect(() => {
    window.history.pushState(null, '', '');
  }, [stack.length]);

  // orientation guard - the board needs portrait to stay readable on phones
  useEffect(() => {
    const check = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setOrientationWarn(landscape && window.innerHeight < 520);
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  const nav = useMemo<Nav>(
    () => ({ route, go, back, replace, canBack: stack.length > 1 }),
    [route, go, back, replace, stack.length],
  );

  return (
    <NavContext.Provider value={nav}>
      <div className="app-shell">
        <Screen route={route} />
        {orientationWarn && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-bg p-8 text-center">
            <div className="text-5xl">📱↻</div>
            <p className="text-lg font-700">Please rotate your device</p>
            <p className="text-sm text-muted">Don't Break the Chain is played in portrait.</p>
          </div>
        )}
      </div>
    </NavContext.Provider>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'splash':
      return <Splash />;
    case 'home':
      return <Home />;
    case 'levels':
      return <LevelSelect />;
    case 'game':
      return <Game key={`${route.mode}-${route.levelId}`} levelId={route.levelId} mode={route.mode} />;
    case 'daily':
      return <DailyChallenge />;
    case 'achievements':
      return <Achievements />;
    case 'stats':
      return <Statistics />;
    case 'settings':
      return <Settings />;
    default:
      return <Home />;
  }
}
