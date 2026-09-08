import { useEffect } from 'react';

/** Icon-only achievement pop — sits above the board, not inside the result card. */
export function AchievementBurst({
  items,
  onDone,
}: {
  items: { icon: string; title: string }[];
  onDone: () => void;
}) {
  useEffect(() => {
    if (!items.length) return;
    const t = window.setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [items, onDone]);

  if (!items.length) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-3 z-[45] flex justify-center px-4"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full border border-gold/40 bg-black/70 px-3 py-2 shadow-glow-gold backdrop-blur-md animate-slide-down">
        {items.map((a) => (
          <span
            key={a.title}
            title={a.title}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-xl animate-pop-in"
          >
            {a.icon}
          </span>
        ))}
      </div>
    </div>
  );
}
