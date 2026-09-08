import { useNav } from '../navigation';
import { useSaveData } from '../hooks/useSaveData';
import { PageHeader } from './LevelSelect';
import { TOTAL_LEVELS } from '../data/levels';
import { ACHIEVEMENTS } from '../data/achievements';
import { currentStreak } from '../utils/storage';
import { formatTime } from '../utils/format';

export function Statistics() {
  const nav = useNav();
  const save = useSaveData();
  const levels = Object.values(save.levels);
  const completed = levels.filter((l) => l.completed).length;
  const stars = levels.reduce((a, l) => a + l.stars, 0);
  const perfect = levels.filter((l) => l.stars === 3).length;
  const achUnlocked = ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length;

  const rows: [string, string][] = [
    ['Levels completed', `${completed} / ${TOTAL_LEVELS}`],
    ['Total stars', `${stars} / ${TOTAL_LEVELS * 3}`],
    ['Perfect (3★) levels', `${perfect}`],
    ['Total attempts', `${save.stats.totalAttempts}`],
    ['Total mistakes', `${save.stats.totalMistakes}`],
    ['Best time', save.stats.bestTimeSec >= 0 ? formatTime(save.stats.bestTimeSec) : '-'],
    ['Longest chain', `${save.stats.longestChain} links`],
    ['No-mistake clears', `${save.stats.levelsNoMistake}`],
    ['Hint-free clears', `${save.stats.levelsNoHint}`],
    ['Daily challenges', `${save.stats.dailyCompletions}`],
    ['Current streak', `${currentStreak()} days`],
    ['Achievements', `${achUnlocked} / ${ACHIEVEMENTS.length}`],
  ];

  return (
    <div className="screen">
      <PageHeader title="Statistics" onBack={() => nav.back()} />
      <div className="scroll-area">
        <div className="grid grid-cols-3 gap-2 pb-4">
          <Big label="Cleared" value={`${completed}`} />
          <Big label="Stars" value={`${stars}`} />
          <Big label="Perfect" value={`${perfect}`} />
        </div>
        <div className="card divide-y divide-line p-0">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted">{k}</span>
              <span className="font-display text-sm font-700">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-surface2 py-4">
      <span className="font-display text-2xl font-800">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}
