import { useNav } from '../navigation';
import { useSaveData } from '../hooks/useSaveData';
import { PageHeader } from './LevelSelect';
import { dailyChallengeNumber } from '../data/daily';
import { getDaily, currentStreak } from '../utils/storage';
import { dayNumber } from '../utils/rng';
import { formatTime } from '../utils/format';
import { playSound } from '../utils/audio';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DailyChallenge() {
  const nav = useNav();
  useSaveData();
  const daily = getDaily();
  const today = dayNumber();
  const doneToday = daily.completed && daily.day === today;
  const num = dailyChallengeNumber(today);
  const streak = currentStreak();
  const now = new Date();
  const month = MONTHS[now.getMonth()];
  const day = now.getDate();

  return (
    <div className="screen">
      <PageHeader title="Daily Challenge" onBack={() => nav.back()} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        {/* Real date badge — emoji calendars are stuck on July 17 */}
        <div
          className="w-[5.5rem] overflow-hidden rounded-2xl border border-line/80 bg-white shadow-card"
          aria-label={`${month} ${day}`}
        >
          <div className="bg-danger px-2 py-1.5 text-center text-[11px] font-800 uppercase tracking-[0.18em] text-white">
            {month}
          </div>
          <div className="bg-white py-2 text-center font-display text-4xl font-800 leading-none text-[#12141f]">
            {day}
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-800">Challenge #{num}</h2>
          <p className="mt-1 text-sm text-muted">
            {month} {day} · A fresh chain every day. Same for everyone.
          </p>
        </div>

        <div className="grid w-full max-w-xs grid-cols-2 gap-3">
          <div className="stat-pill py-3">
            <span className="text-[11px] uppercase tracking-wide text-muted">Your Best</span>
            <span className="font-display text-xl font-800">
              {doneToday && daily.bestTimeSec >= 0 ? formatTime(daily.bestTimeSec) : '-'}
            </span>
          </div>
          <div className="stat-pill py-3">
            <span className="text-[11px] uppercase tracking-wide text-muted">Streak</span>
            <span className="font-display text-xl font-800">{streak} 🔥</span>
          </div>
        </div>

        {doneToday && (
          <p className="text-sm text-accent">✓ Completed today - play again to beat your time.</p>
        )}

        <button
          className="btn-primary w-full max-w-xs py-4 text-lg"
          onClick={() => {
            playSound('click');
            nav.go({ name: 'game', levelId: 9000 + today, mode: 'daily' });
          }}
        >
          {doneToday ? 'PLAY AGAIN' : 'PLAY TODAY'}
        </button>
      </div>
    </div>
  );
}
