import { useNav } from '../navigation';
import { useSaveData } from '../hooks/useSaveData';
import { PageHeader } from './LevelSelect';
import { ACHIEVEMENTS } from '../data/achievements';
import { ProgressBar } from '../components/ProgressBar';

export function Achievements() {
  const nav = useNav();
  const save = useSaveData();
  const unlocked = ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length;

  return (
    <div className="screen">
      <PageHeader title="Achievements" subtitle="Milestones along the chain" onBack={() => nav.back()} />
      <div className="px-4 pb-3">
        <div className="glass-panel p-3.5">
          <ProgressBar value={unlocked} max={ACHIEVEMENTS.length} label="Unlocked" tone="gold" />
        </div>
      </div>
      <div className="scroll-area">
        <div className="flex flex-col gap-2.5">
          {ACHIEVEMENTS.map((a) => {
            const has = !!save.achievements[a.id];
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 ${
                  has
                    ? 'border-gold/35 bg-gradient-to-r from-gold/10 to-surface2'
                    : 'border-line/70 bg-surface/50'
                }`}
              >
                <div
                  className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl text-2xl ${
                    has ? 'bg-gold/15 shadow-glow-gold' : 'bg-surface2 grayscale opacity-40'
                  }`}
                >
                  {a.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-display text-sm font-700 ${has ? 'text-white' : 'text-muted'}`}>
                    {a.title}
                  </div>
                  <div className="text-xs text-muted">{a.desc}</div>
                </div>
                {has && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-700 text-accent">
                    DONE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
