import { useNav } from '../navigation';
import { useSaveData } from '../hooks/useSaveData';
import { LEVELS, TOTAL_LEVELS, WORLDS } from '../data/levels';
import { StarRating } from '../components/StarRating';
import { ProgressBar } from '../components/ProgressBar';
import { playSound } from '../utils/audio';
import { haptic } from '../utils/haptics';

const WORLD_STYLE: Record<
  number,
  { accent: string; soft: string; label: string; ring: string }
> = {
  1: {
    accent: '#5b8cff',
    soft: 'rgba(91,140,255,0.16)',
    label: 'Learn under fire',
    ring: 'ring-primary/40',
  },
  2: {
    accent: '#00e6c3',
    soft: 'rgba(0,230,195,0.14)',
    label: 'Moving targets',
    ring: 'ring-accent/40',
  },
  3: {
    accent: '#b06bff',
    soft: 'rgba(176,107,255,0.16)',
    label: 'Split pressure',
    ring: 'ring-[#b06bff]/40',
  },
  4: {
    accent: '#ff8a3d',
    soft: 'rgba(255,138,61,0.14)',
    label: 'Chaos rules',
    ring: 'ring-[#ff8a3d]/40',
  },
  5: {
    accent: '#ff5a6a',
    soft: 'rgba(255,90,106,0.16)',
    label: 'Nearly impossible',
    ring: 'ring-danger/40',
  },
};

export function LevelSelect() {
  const nav = useNav();
  const save = useSaveData();
  const completed = Object.values(save.levels).filter((l) => l.completed).length;

  return (
    <div className="screen">
      <PageHeader title="Levels" subtitle="Pick your next chain" onBack={() => nav.back()} />
      <div className="px-4 pb-3">
        <div className="glass-panel p-3.5">
          <ProgressBar value={completed} max={TOTAL_LEVELS} label="Total progress" tone="accent" />
          <p className="mt-2 text-[11px] text-muted">
            Every world is timed. Most runs allow only one mistake.
          </p>
        </div>
      </div>

      <div className="scroll-area">
        {WORLDS.map((w) => {
          const levels = LEVELS.filter((l) => l.world === w.id);
          const cleared = levels.filter((l) => save.levels[l.id]?.completed).length;
          const style = WORLD_STYLE[w.id];
          return (
            <section key={w.id} className="mb-7">
              <div
                className="world-banner"
                style={{
                  borderColor: `${style.accent}55`,
                  backgroundImage: `linear-gradient(110deg, ${style.soft}, transparent 65%)`,
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-800 text-bg"
                      style={{ background: style.accent }}
                    >
                      {w.id}
                    </span>
                    <h3 className="text-lg font-800 leading-none">{w.name}</h3>
                  </div>
                  <p className="mt-1.5 pl-9 text-[11px] text-muted">{style.label}</p>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm font-800" style={{ color: style.accent }}>
                    {cleared}/{levels.length}
                  </div>
                  <div className="text-[10px] text-muted">
                    {w.range[0]}–{w.range[1]}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {levels.map((l) => {
                  const rec = save.levels[l.id];
                  const unlocked = l.id <= save.currentLevel;
                  const done = !!rec?.completed;
                  return (
                    <button
                      key={l.id}
                      disabled={!unlocked}
                      onClick={() => {
                        playSound('click');
                        haptic('light');
                        nav.go({ name: 'game', levelId: l.id, mode: 'level' });
                      }}
                      className={[
                        'level-tile',
                        unlocked ? 'border-line/80 bg-surface2/80' : 'border-line/40 bg-surface/30 opacity-45',
                        done ? `ring-1 ${style.ring}` : '',
                      ].join(' ')}
                      style={
                        done
                          ? {
                              backgroundImage: `radial-gradient(circle at 50% 0%, ${style.soft}, transparent 70%)`,
                            }
                          : undefined
                      }
                      aria-label={`Level ${l.id}${unlocked ? '' : ' locked'}`}
                    >
                      {!unlocked ? (
                        <span className="text-base opacity-70">🔒</span>
                      ) : (
                        <>
                          <span
                            className="font-display text-base font-800"
                            style={done ? { color: style.accent } : undefined}
                          >
                            {l.id}
                          </span>
                          <span className="mt-0.5 text-[10px] leading-none">
                            {done ? (
                              <StarRating value={rec!.stars} size={9} />
                            ) : (
                              <span className="text-muted">•</span>
                            )}
                          </span>
                          {l.id === save.currentLevel && !done && (
                            <span
                              className="absolute inset-x-2 bottom-1.5 h-0.5 rounded-full"
                              style={{ background: style.accent, boxShadow: `0 0 8px ${style.accent}` }}
                            />
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  onBack,
  subtitle,
}: {
  title: string;
  onBack: () => void;
  subtitle?: string;
}) {
  return (
    <header className="flex items-center gap-3 px-3 py-3">
      <button
        className="rounded-xl border border-line/80 bg-surface2/80 px-3 py-2 text-sm font-700 backdrop-blur-sm"
        onClick={onBack}
        aria-label="Back"
      >
        ‹ Back
      </button>
      <div>
        <h2 className="text-xl font-800 leading-none">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p>}
      </div>
    </header>
  );
}
