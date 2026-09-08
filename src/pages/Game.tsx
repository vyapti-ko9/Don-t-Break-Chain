import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameCanvas } from '../components/GameCanvas';
import { ResultOverlay } from '../components/ResultOverlay';
import { HintSheet } from '../components/HintSheet';
import { AchievementBurst } from '../components/AchievementBurst';
import { useNav } from '../navigation';
import { useSaveData } from '../hooks/useSaveData';
import type { EngineHud, EngineResult, EngineStatus, LevelDef } from '../game/types';
import { getLevel, TOTAL_LEVELS } from '../data/levels';
import { buildDailyLevel } from '../data/daily';
import {
  getLevelRecord,
  recordAttempt,
  recordOutcome,
  recordDaily,
  getDaily,
  unlockAchievement,
  getSnapshot,
  spendHint,
  addHints,
  HINTS_PER_AD,
} from '../utils/storage';
import { evaluateAchievements } from '../data/achievements';
import { formatTime } from '../utils/format';
import { playSound, unlockAudio } from '../utils/audio';
import { haptic } from '../utils/haptics';
import { shareResult, buildLevelShareText } from '../services/share';
import { monetization } from '../services/monetization';

interface Props {
  levelId: number;
  mode: 'level' | 'daily';
}

function starsFor(level: LevelDef, r: EngineResult): number {
  if (r.status !== 'won') return 0;
  if (r.mistakes === 0 && r.timeSec <= level.par) return 3;
  if (r.mistakes <= 1 && r.timeSec <= level.par * 1.9) return 2;
  return 1;
}

export function Game({ levelId, mode }: Props) {
  const nav = useNav();
  const save = useSaveData();

  const level = useMemo<LevelDef | null>(
    () => (mode === 'daily' ? buildDailyLevel() : getLevel(levelId)),
    [levelId, mode],
  );

  const [runId, setRunId] = useState(0);
  const [status, setStatus] = useState<EngineStatus>('ready');
  const [hud, setHud] = useState<EngineHud | null>(null);
  const [result, setResult] = useState<EngineResult | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintLoading, setHintLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(!!level?.intro);
  const [unlocked, setUnlocked] = useState<{ icon: string; title: string }[]>([]);
  const [shareLabel, setShareLabel] = useState('SHARE RESULT');
  const attemptCounted = useRef(false);
  const finalStars = useRef(0);
  const dailyInfo = useRef<{ newStreak: number } | null>(null);

  useEffect(() => {
    unlockAudio();
  }, []);

  // reset per-run transient state when the run changes
  useEffect(() => {
    setStatus('ready');
    setResult(null);
    setHintLevel(0);
    setHintOpen(false);
    setHintLoading(false);
    setUnlocked([]);
    setShareLabel('SHARE RESULT');
    attemptCounted.current = false;
    setShowIntro(!!level?.intro && runId === 0);
  }, [runId, level]);

  const handleStatus = useCallback(
    (s: EngineStatus) => {
      setStatus(s);
      if (s === 'running' && !attemptCounted.current && level) {
        attemptCounted.current = true;
        if (mode === 'level') recordAttempt(level.id);
      }
    },
    [level, mode],
  );

  const handleResult = useCallback(
    (r: EngineResult) => {
      if (!level) return;
      finalStars.current = starsFor(level, r);
      setResult(r);

      if (r.status === 'won') {
        haptic('success');
        if (mode === 'level') {
          recordOutcome({
            id: level.id,
            won: true,
            timeSec: r.timeSec,
            mistakes: r.mistakes,
            stars: finalStars.current,
            hintsUsed: hintLevel,
            chainLength: level.nodes.filter((n) => n.type !== 'fake' && n.type !== 'bomb').length,
            totalLevels: TOTAL_LEVELS,
          });
        } else {
          dailyInfo.current = recordDaily(r.timeSec);
        }
        const fresh = evaluateAchievements(getSnapshot(), unlockAchievement);
        if (fresh.length) {
          setUnlocked(fresh.map((a) => ({ icon: a.icon, title: a.title })));
          playSound('achievement');
        }
        void monetization.maybeShowInterstitial({
          levelId: level.id,
          attempts: getLevelRecord(level.id).attempts,
        });
      }
    },
    [level, mode, hintLevel],
  );

  const retry = useCallback(() => {
    playSound('click');
    setRunId((n) => n + 1);
  }, []);

  const next = useCallback(() => {
    playSound('click');
    if (!level) return;
    const n = level.id + 1;
    if (n <= TOTAL_LEVELS) nav.replace({ name: 'game', levelId: n, mode: 'level' });
    else nav.go({ name: 'home' });
  }, [level, nav]);

  const goHome = useCallback(() => {
    playSound('click');
    nav.go({ name: 'home' });
  }, [nav]);

  const revealHint = useCallback(() => {
    if (hintLoading || !level) return;
    if (hintLevel >= level.hints.length) return;
    playSound('click');
    if (!spendHint()) {
      haptic('error');
      return;
    }
    setHintLevel((n) => Math.min(level.hints.length, n + 1));
    haptic('light');
  }, [hintLoading, hintLevel, level]);

  const earnHints = useCallback(async () => {
    if (hintLoading) return;
    setHintLoading(true);
    playSound('click');
    try {
      const { rewarded } = await monetization.showRewardedAd('extra-hint');
      if (rewarded) {
        addHints(HINTS_PER_AD);
        haptic('success');
      }
    } finally {
      setHintLoading(false);
    }
  }, [hintLoading]);

  const doShare = useCallback(() => {
    if (!level || !result) return;
    void shareResult(buildLevelShareText(level.id, result.timeSec, finalStars.current)).then((res) => {
      if (res === 'copied') setShareLabel('COPIED ✓');
      else if (res === 'shared') setShareLabel('SHARED ✓');
    });
  }, [level, result]);

  if (!level) {
    return (
      <div className="screen items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg">That level could not be loaded.</p>
        <button className="btn-primary" onClick={() => nav.go({ name: 'home' })}>
          BACK TO MENU
        </button>
      </div>
    );
  }

  const rec = mode === 'level' ? getLevelRecord(level.id) : null;
  const daily = getDaily();
  const bestTime =
    mode === 'level' ? rec!.bestTimeSec : daily.completed ? daily.bestTimeSec : -1;

  const title =
    mode === 'daily'
      ? 'Daily Challenge'
      : `Level ${level.id} · World ${level.world}`;

  return (
    <div className="screen">
      <header className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          className="rounded-xl border border-line bg-surface2 px-3 py-2 text-sm font-700"
          onClick={() => nav.back()}
          aria-label="Back"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate font-display text-sm font-700">{title}</div>
          <div className="truncate text-[11px] text-muted">{level.name}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {status !== 'won' && (
            <button
              type="button"
              className="relative rounded-xl border border-line bg-surface2 px-2.5 py-2 text-sm font-700"
              onClick={() => {
                setHintOpen(true);
                playSound('click');
              }}
              aria-label={`Hints, ${save.hintBalance ?? 0} left`}
            >
              ?
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-0.5 text-[9px] font-800 text-bg">
                {save.hintBalance ?? 0}
              </span>
            </button>
          )}
          <button
            className="rounded-xl border border-line bg-surface2 px-2.5 py-2 text-sm font-700"
            onClick={retry}
            aria-label="Restart level"
          >
            ↻
          </button>
        </div>
      </header>

      {/* HUD */}
      <div className="flex items-center gap-2 px-3 pb-2 text-xs">
        <Hud label="Time" value={formatTime(hud?.timeSec ?? 0)} />
        {level.timeLimit && (
          <Hud
            label="Limit"
            value={`${Math.max(0, level.timeLimit - (hud?.timeSec ?? 0)).toFixed(1)}s`}
            tone={
              (hud?.timeSec ?? 0) > level.timeLimit * 0.7 ? 'danger' : 'default'
            }
          />
        )}
        {level.maxTaps != null && (
          <Hud
            label="Taps"
            value={`${hud?.tapsUsed ?? 0}/${level.maxTaps}`}
            tone={(hud?.tapsUsed ?? 0) >= level.maxTaps ? 'danger' : 'default'}
          />
        )}
        <Hud label="Links" value={`${hud?.activated ?? 0}/${hud?.required ?? level.nodes.length}`} />
        <Hud
          label="Mistakes"
          value={
            level.maxMistakes != null
              ? `${hud?.mistakes ?? 0}/${level.maxMistakes}`
              : `${hud?.mistakes ?? 0}`
          }
          tone={
            level.maxMistakes != null && (hud?.mistakes ?? 0) >= level.maxMistakes
              ? 'danger'
              : (hud?.mistakes ?? 0) > 0
                ? 'danger'
                : 'default'
          }
        />
      </div>

      {/* Board */}
      <div className="relative flex-1">
        <GameCanvas
          key={runId}
          level={level}
          reducedMotion={save.settings.reducedMotion}
          hintLevel={hintLevel}
          onStatus={handleStatus}
          onHud={setHud}
          onResult={handleResult}
        />

        {status === 'ready' && !showIntro && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-muted/80 animate-fade-in">
            Tap the correct link
          </div>
        )}

        {showIntro && level.intro && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-6 animate-fade-in"
            onClick={() => setShowIntro(false)}
            role="presentation"
          >
            <div className="relative max-w-xs overflow-hidden animate-pop-in rounded-3xl border border-primary/30 bg-surface p-5 text-center shadow-card">
              <div
                className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-primary/25 blur-2xl"
                aria-hidden
              />
              <div className="relative mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-2xl">
                💡
              </div>
              <p className="relative text-[11px] font-700 uppercase tracking-[0.2em] text-primary">Briefing</p>
              <p className="relative mt-2 text-sm text-white">{level.intro}</p>
              <button className="btn-primary relative mt-4 w-full" onClick={() => setShowIntro(false)}>
                GOT IT
              </button>
            </div>
          </div>
        )}
      </div>

      <HintSheet
        open={hintOpen}
        hints={level.hints}
        revealed={hintLevel}
        balance={save.hintBalance ?? 0}
        loading={hintLoading}
        onUseHint={revealHint}
        onEarnHints={() => {
          void earnHints();
        }}
        onClose={() => setHintOpen(false)}
      />

      {result && (
        <ResultOverlay
          status={result.status}
          levelLabel={mode === 'daily' ? 'Daily Challenge' : `Level ${level.id}`}
          timeSec={result.timeSec}
          bestTimeSec={bestTime}
          stars={finalStars.current}
          mistakes={result.mistakes}
          reason={result.reason}
          hasNext={mode === 'level' && level.id < TOTAL_LEVELS}
          onNext={next}
          onRetry={retry}
          onHome={goHome}
          onHint={
            result.status === 'lost'
              ? () => {
                setResult(null);
                setRunId((n) => n + 1);
                setTimeout(() => setHintOpen(true), 60);
              }
              : undefined
          }
          onShare={result.status === 'won' ? doShare : undefined}
          shareLabel={shareLabel}
          extraLine={
            result.status === 'won' && mode === 'daily' && dailyInfo.current
              ? `🔥${dailyInfo.current.newStreak}`
              : undefined
          }
        />
      )}

      <AchievementBurst items={unlocked} onDone={() => setUnlocked([])} />
    </div>
  );
}

function Hud({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-lg border border-line bg-surface2 px-1 py-1.5">
      <span className="text-[9px] uppercase tracking-wide text-muted">{label}</span>
      <span className={`font-display text-sm font-700 ${tone === 'danger' ? 'text-danger' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
