import { useEffect, useState } from 'react';
import { useNav } from '../navigation';
import { NODE_PALETTE } from '../game/types';
import { playSound } from '../utils/audio';

export function Splash() {
  const nav = useNav();
  const [lit, setLit] = useState(-1);

  useEffect(() => {
    const timers: number[] = [];
    for (let i = 0; i < 5; i++) {
      timers.push(
        window.setTimeout(() => {
          setLit(i);
          playSound(i === 4 ? 'complete' : 'energy');
        }, 500 + i * 260),
      );
    }
    timers.push(window.setTimeout(() => nav.replace({ name: 'home' }), 2400));
    return () => timers.forEach(clearTimeout);
  }, [nav]);

  return (
    <div
      className="screen items-center justify-center gap-10 bg-bg"
      onClick={() => nav.replace({ name: 'home' })}
    >
      <div className="text-center">
        <h1 className="text-4xl font-800 leading-none tracking-tight">DON'T BREAK</h1>
        <h1 className="text-4xl font-800 leading-none tracking-tight text-primary">THE CHAIN</h1>
      </div>

      <div className="flex items-center gap-3">
        {NODE_PALETTE.slice(0, 5).map((c, i) => (
          <span
            key={c}
            className="block h-6 w-6 rounded-full transition-all duration-300"
            style={{
              background: c,
              transform: lit >= i ? 'scale(1.15)' : 'scale(0.8)',
              opacity: lit >= i ? 1 : 0.3,
              boxShadow: lit >= i ? `0 0 16px ${c}` : 'none',
            }}
          />
        ))}
        <span
          className="ml-1 text-2xl transition-all duration-300"
          style={{ opacity: lit >= 4 ? 1 : 0, transform: lit >= 4 ? 'scale(1.2)' : 'scale(0.5)' }}
        >
          💥
        </span>
      </div>

      <p className="text-sm text-muted">One mistake. Everything falls apart.</p>
    </div>
  );
}
