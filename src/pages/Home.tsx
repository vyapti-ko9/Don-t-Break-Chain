import { useNav } from '../navigation';
import { useSaveData } from '../hooks/useSaveData';
import { TOTAL_LEVELS } from '../data/levels';
import { NODE_PALETTE } from '../game/types';
import { currentStreak } from '../utils/storage';
import { playSound, unlockAudio } from '../utils/audio';
import { haptic } from '../utils/haptics';

// A real, playful color per feature instead of one monochrome accent — the
// home screen borrows straight from the in-game node palette.
const COLOR = {
  red: '#ff5a6a',
  gold: '#ffd24a',
  blue: '#5b8cff',
  teal: '#00e6c3',
  purple: '#b06bff',
  orange: '#ff8a3d',
  green: '#4ade80',
};

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
    <div className="screen justify-between overflow-hidden px-6 pb-6 pt-6">
      {/* soft color wash, purely decorative */}
      <div
        className="pointer-events-none absolute -left-20 top-8 h-56 w-56 rounded-full opacity-20 blur-3xl"
        style={{ background: COLOR.blue }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-52 h-48 w-48 rounded-full opacity-[0.14] blur-3xl"
        style={{ background: COLOR.purple }}
        aria-hidden
      />

      <button
        className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-line/70 bg-surface2/70 text-lg backdrop-blur-sm transition-transform active:scale-90"
        onClick={() => go(() => nav.go({ name: 'settings' }))}
        aria-label="Settings"
      >
        ⚙️
      </button>

      {/* hero */}
      <div className="relative z-10 pt-3 text-center">
        <h1 className="text-[2.6rem] font-800 leading-[0.95] tracking-tight text-white">DON'T BREAK</h1>
        <h1
          className="bg-clip-text text-[2.6rem] font-800 leading-[0.95] tracking-tight text-transparent"
          style={{
            backgroundImage: `linear-gradient(90deg, ${COLOR.red}, ${COLOR.gold}, ${COLOR.blue}, ${COLOR.purple})`,
          }}
        >
          THE CHAIN
        </h1>
        <p className="mx-auto mt-3 max-w-[15rem] text-sm text-muted">
          One mistake. Everything falls apart.
        </p>

        <div className="mx-auto mt-5 flex items-center justify-center gap-2.5">
          {NODE_PALETTE.slice(0, 5).map((c, i) => (
            <span
              key={c}
              className="block h-3 w-3 rounded-full animate-float"
              style={{ background: c, boxShadow: `0 0 10px ${c}aa`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* one clean, colorful stat strip */}
      <div className="relative z-10 grid grid-cols-4 divide-x divide-line/60 overflow-hidden rounded-2xl border border-line/60 bg-surface/50 py-3 backdrop-blur-sm">
        <MiniStat value={`${playLevel}`} label="Level" color={COLOR.blue} />
        <MiniStat value={`${completed}`} label="Cleared" color={COLOR.green} />
        <MiniStat value={`${stars}`} label="Stars" color={COLOR.gold} />
        <MiniStat value={`${streak}`} label="Streak 🔥" color={COLOR.orange} />
      </div>

      {/* actions */}
      <div className="relative z-10 flex flex-col gap-3">
        <button
          className="w-full rounded-2xl py-4 text-center font-display text-xl font-800 text-white shadow-glow-accent transition-transform active:scale-[0.97]"
          style={{ backgroundImage: `linear-gradient(135deg, ${COLOR.teal}, ${COLOR.blue})` }}
          onClick={() => go(() => nav.go({ name: 'game', levelId: playLevel, mode: 'level' }))}
        >
          {completed > 0 ? 'CONTINUE' : 'PLAY'}
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <ColorTile
            icon="🔗"
            title="Levels"
            subtitle={`${progress}% complete`}
            color={COLOR.blue}
            onClick={() => go(() => nav.go({ name: 'levels' }))}
          />
          <ColorTile
            icon="📅"
            title="Daily"
            subtitle="New board today"
            color={COLOR.orange}
            onClick={() => go(() => nav.go({ name: 'daily' }))}
          />
          <ColorTile
            icon="🏆"
            title="Achievements"
            subtitle="24 to unlock"
            color={COLOR.gold}
            onClick={() => go(() => nav.go({ name: 'achievements' }))}
          />
          <ColorTile
            icon="📊"
            title="Statistics"
            subtitle="Your records"
            color={COLOR.purple}
            onClick={() => go(() => nav.go({ name: 'stats' }))}
          />
        </div>
      </div>

      <p className="relative z-10 text-center text-[10px] text-muted/70">v1.0.0 · Plays fully offline</p>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-2">
      <span className="font-display text-lg font-800" style={{ color }}>
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

function ColorTile({
  icon,
  title,
  subtitle,
  color,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex flex-col items-start gap-2.5 rounded-2xl border p-4 text-left transition-transform active:scale-95"
      style={{ borderColor: `${color}4d`, backgroundImage: `linear-gradient(160deg, ${color}26, transparent 65%)` }}
      onClick={onClick}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl text-base"
        style={{ background: color, boxShadow: `0 0 16px ${color}88` }}
      >
        {icon}
      </span>
      <div>
        <div className="font-display text-base font-800 leading-none text-white">{title}</div>
        <div className="mt-1 text-[11px] text-muted">{subtitle}</div>
      </div>
    </button>
  );
}
