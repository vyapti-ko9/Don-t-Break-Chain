import { useNav } from '../navigation';
import { useSaveData } from '../hooks/useSaveData';
import { TOTAL_LEVELS } from '../data/levels';
import { NODE_PALETTE } from '../game/types';
import { currentStreak } from '../utils/storage';
import { playSound, unlockAudio } from '../utils/audio';
import { haptic } from '../utils/haptics';

export function Home() {
  const nav = useNav();
  const save = useSaveData();

  const completed = Object.values(save.levels).filter((l) => l.completed).length;
  const stars = Object.values(save.levels).reduce((a, l) => a + l.stars, 0);
  const streak = currentStreak();
  const playLevel = Math.min(save.currentLevel, TOTAL_LEVELS);
  const progress = Math.round((completed / TOTAL_LEVELS) * 100);

  const go = (fn: () => void) => {
    unlockAudio();
    playSound('click');
    haptic('light');
    fn();
  };

  return (
    <div className="screen justify-between overflow-hidden px-5 pb-5 pt-6">
      {/* ambient orbs */}
      <div
        className="pointer-events-none absolute -left-16 top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl animate-pulse-glow"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-40 h-40 w-40 rounded-full bg-accent/15 blur-3xl animate-pulse-glow"
        aria-hidden
      />

      <div className="relative z-10 text-center">
        <p className="mb-3 text-[11px] font-700 uppercase tracking-[0.28em] text-primary/80">
          Offline puzzle
        </p>
        <h1 className="text-[2.65rem] font-800 leading-[0.92] tracking-tight">DON'T BREAK</h1>
        <h1 className="bg-gradient-to-r from-primary via-[#8eb4ff] to-accent bg-clip-text text-[2.65rem] font-800 leading-[0.92] tracking-tight text-transparent">
          THE CHAIN
        </h1>
        <p className="mx-auto mt-3 max-w-[16rem] text-sm text-muted">
          One mistake. Everything falls apart.
        </p>

        <div className="mx-auto mt-6 flex items-center justify-center gap-3">
          {NODE_PALETTE.slice(0, 5).map((c, i) => (
            <span
              key={c}
              className="block h-3.5 w-3.5 rounded-full animate-float"
              style={{
                background: c,
                boxShadow: `0 0 12px ${c}99`,
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-4 gap-2">
        <Stat label="Level" value={`${playLevel}`} accent />
        <Stat label="Cleared" value={`${completed}`} />
        <Stat label="Stars" value={`${stars}`} />
        <Stat label="Streak" value={`${streak}`} hot={streak > 0} />
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        <button
          className="btn-primary relative w-full overflow-hidden py-4 text-xl"
          onClick={() => go(() => nav.go({ name: 'game', levelId: playLevel, mode: 'level' }))}
        >
          <span className="relative z-10">{completed > 0 ? 'CONTINUE' : 'PLAY'}</span>
          <span className="absolute inset-x-6 bottom-2 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </button>

        <div className="glass-panel px-3.5 py-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
            <span>Campaign</span>
            <span className="font-700 text-accent">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted">
            Level {playLevel} of {TOTAL_LEVELS} · Brutal difficulty
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <MenuTile
            title="Levels"
            subtitle="100 handcrafted"
            onClick={() => go(() => nav.go({ name: 'levels' }))}
          />
          <MenuTile
            title="Daily"
            subtitle="New board each day"
            onClick={() => go(() => nav.go({ name: 'daily' }))}
            tone="accent"
          />
          <MenuTile
            title="Achievements"
            subtitle="24 to unlock"
            onClick={() => go(() => nav.go({ name: 'achievements' }))}
            tone="gold"
          />
          <MenuTile
            title="Statistics"
            subtitle="Your records"
            onClick={() => go(() => nav.go({ name: 'stats' }))}
          />
        </div>

        <button className="btn-ghost w-full py-2.5 text-sm" onClick={() => go(() => nav.go({ name: 'settings' }))}>
          SETTINGS
        </button>
      </div>

      <p className="relative z-10 text-center text-[11px] text-muted/80">v1.0.0 · Plays fully offline</p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  hot,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hot?: boolean;
}) {
  return (
    <div className="stat-pill relative overflow-hidden">
      {accent && (
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/15 to-transparent" />
      )}
      <span
        className={`relative font-display text-lg font-800 ${
          hot ? 'text-gold' : accent ? 'text-primary' : 'text-white'
        }`}
      >
        {value}
      </span>
      <span className="relative text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

function MenuTile({
  title,
  subtitle,
  onClick,
  tone = 'primary',
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  tone?: 'primary' | 'accent' | 'gold';
}) {
  const dot =
    tone === 'accent' ? 'bg-accent shadow-glow-accent' : tone === 'gold' ? 'bg-gold shadow-glow-gold' : 'bg-primary shadow-glow';
  return (
    <button className="menu-tile" onClick={onClick}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <div>
        <div className="font-display text-base font-800 leading-none">{title}</div>
        <div className="mt-1 text-[11px] text-muted">{subtitle}</div>
      </div>
    </button>
  );
}
