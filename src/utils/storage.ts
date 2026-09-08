// ---------------------------------------------------------------------------
// Centralized, offline-first persistence. Every localStorage read/write in the
// game goes through this module. Corrupted or missing data falls back to a
// clean default save - the game never crashes on bad storage.
// ---------------------------------------------------------------------------

import { dayNumber } from './rng';

const KEY = 'dbtc.save.v1';
const SCHEMA_VERSION = 1;

export interface Settings {
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
}

export interface LevelRecord {
  completed: boolean;
  stars: number; // 0..3
  bestTimeSec: number; // Infinity-safe -> stored as number, -1 means none
  bestMistakes: number; // -1 means none
  attempts: number;
  hintsUsed: number;
}

export interface DailyRecord {
  day: number; // dayNumber
  bestTimeSec: number; // -1 none
  completed: boolean;
}

export interface Stats {
  totalAttempts: number;
  totalMistakes: number;
  totalCompletions: number;
  longestChain: number;
  bestTimeSec: number; // -1 none
  dailyCompletions: number;
  levelsNoMistake: number;
  levelsNoHint: number;
}

export interface Streak {
  count: number;
  lastDay: number; // dayNumber of last daily completion, -1 none
}

export interface SaveData {
  version: number;
  settings: Settings;
  currentLevel: number; // highest unlocked level (1-based)
  levels: Record<number, LevelRecord>;
  achievements: Record<string, number>; // id -> unlock timestamp
  daily: DailyRecord;
  streak: Streak;
  stats: Stats;
  /** Spendable hint tokens. New players start with 3 free. */
  hintBalance: number;
}

function defaultSave(): SaveData {
  return {
    version: SCHEMA_VERSION,
    settings: { sound: true, haptics: true, reducedMotion: false },
    currentLevel: 1,
    levels: {},
    achievements: {},
    daily: { day: -1, bestTimeSec: -1, completed: false },
    streak: { count: 0, lastDay: -1 },
    hintBalance: 3,
    stats: {
      totalAttempts: 0,
      totalMistakes: 0,
      totalCompletions: 0,
      longestChain: 0,
      bestTimeSec: -1,
      dailyCompletions: 0,
      levelsNoMistake: 0,
      levelsNoHint: 0,
    },
  };
}

function migrate(raw: unknown): SaveData {
  const base = defaultSave();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SaveData>;
  const hadBalance = typeof (r as { hintBalance?: unknown }).hintBalance === 'number';
  return {
    ...base,
    ...r,
    version: SCHEMA_VERSION,
    settings: { ...base.settings, ...(r.settings ?? {}) },
    daily: { ...base.daily, ...(r.daily ?? {}) },
    streak: { ...base.streak, ...(r.streak ?? {}) },
    stats: { ...base.stats, ...(r.stats ?? {}) },
    levels: sanitizeLevels(r.levels),
    achievements: sanitizeAch(r.achievements),
    currentLevel: clampInt(r.currentLevel, 1, 100, 1),
    // Existing saves without a balance get the same 3 free starter hints.
    hintBalance: hadBalance
      ? clampInt((r as SaveData).hintBalance, 0, 999, 3)
      : 3,
  };
}

function clampInt(v: unknown, lo: number, hi: number, dflt: number): number {
  const n = typeof v === 'number' && isFinite(v) ? Math.floor(v) : dflt;
  return Math.min(hi, Math.max(lo, n));
}

function sanitizeLevels(v: unknown): Record<number, LevelRecord> {
  const out: Record<number, LevelRecord> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const id = Number(k);
    if (!Number.isInteger(id) || id < 1 || id > 999) continue;
    const rec = val as Partial<LevelRecord>;
    out[id] = {
      completed: !!rec.completed,
      stars: clampInt(rec.stars, 0, 3, 0),
      bestTimeSec: typeof rec.bestTimeSec === 'number' ? rec.bestTimeSec : -1,
      bestMistakes: typeof rec.bestMistakes === 'number' ? rec.bestMistakes : -1,
      attempts: clampInt(rec.attempts, 0, 1e6, 0),
      hintsUsed: clampInt(rec.hintsUsed, 0, 999, 0),
    };
  }
  return out;
}

function sanitizeAch(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'number') out[k] = val;
  }
  return out;
}

// --- store -----------------------------------------------------------------

let cache: SaveData | null = null;
const listeners = new Set<() => void>();

export function load(): SaveData {
  if (cache) return cache;
  try {
    const rawStr = localStorage.getItem(KEY);
    cache = rawStr ? migrate(JSON.parse(rawStr)) : defaultSave();
  } catch {
    cache = defaultSave();
  }
  return cache;
}

function persist() {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full / unavailable - keep running from memory */
  }
  listeners.forEach((l) => l());
}

/** Mutate the save via an updater and persist + notify. */
export function update(fn: (s: SaveData) => void): SaveData {
  const s = load();
  fn(s);
  // Fresh top-level identity so useSyncExternalStore detects the change.
  cache = {
    ...s,
    levels: { ...s.levels },
    achievements: { ...s.achievements },
  };
  persist();
  return cache;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSnapshot(): SaveData {
  return load();
}

export function resetProgress(): void {
  cache = defaultSave();
  persist();
}

// --- settings ------------------------------------------------------------

export function getSettings(): Settings {
  return load().settings;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  update((s) => {
    s.settings[key] = value;
  });
}

// --- levels -------------------------------------------------------------

export function getLevelRecord(id: number): LevelRecord {
  return (
    load().levels[id] ?? {
      completed: false,
      stars: 0,
      bestTimeSec: -1,
      bestMistakes: -1,
      attempts: 0,
      hintsUsed: 0,
    }
  );
}

export function isLevelUnlocked(id: number): boolean {
  return id <= load().currentLevel;
}

export interface LevelOutcome {
  id: number;
  won: boolean;
  timeSec: number;
  mistakes: number;
  stars: number;
  hintsUsed: number;
  chainLength: number;
  totalLevels: number;
}

export function recordAttempt(id: number): void {
  update((s) => {
    const rec = s.levels[id] ?? getLevelRecord(id);
    rec.attempts += 1;
    s.levels[id] = rec;
    s.stats.totalAttempts += 1;
  });
}

/** Records a finished level and unlocks the next one. Returns the merged record. */
export function recordOutcome(o: LevelOutcome): LevelRecord {
  return update((s) => {
    const prev = s.levels[o.id] ?? getLevelRecord(o.id);
    const rec: LevelRecord = { ...prev };

    s.stats.totalMistakes += o.mistakes;

    if (o.won) {
      rec.completed = true;
      rec.stars = Math.max(rec.stars, o.stars);
      if (rec.bestTimeSec < 0 || o.timeSec < rec.bestTimeSec) rec.bestTimeSec = o.timeSec;
      if (rec.bestMistakes < 0 || o.mistakes < rec.bestMistakes) rec.bestMistakes = o.mistakes;
      rec.hintsUsed = Math.min(rec.hintsUsed || 0, o.hintsUsed);

      s.stats.totalCompletions += 1;
      s.stats.longestChain = Math.max(s.stats.longestChain, o.chainLength);
      if (s.stats.bestTimeSec < 0 || o.timeSec < s.stats.bestTimeSec) s.stats.bestTimeSec = o.timeSec;
      if (o.mistakes === 0) s.stats.levelsNoMistake += 1;
      if (o.hintsUsed === 0) s.stats.levelsNoHint += 1;

      if (o.id >= s.currentLevel && o.id < o.totalLevels) {
        s.currentLevel = o.id + 1;
      }
    }
    s.levels[o.id] = rec;
  }).levels[o.id];
}

// --- daily + streak ----------------------------------------------------

export function getDaily(): DailyRecord {
  return load().daily;
}

export function recordDaily(timeSec: number): { newStreak: number; improved: boolean } {
  let newStreak = 0;
  let improved = false;
  update((s) => {
    const today = dayNumber();
    if (s.daily.day !== today) {
      s.daily = { day: today, bestTimeSec: timeSec, completed: true };
      improved = true;
    } else {
      if (!s.daily.completed || timeSec < s.daily.bestTimeSec || s.daily.bestTimeSec < 0) {
        improved = s.daily.bestTimeSec < 0 || timeSec < s.daily.bestTimeSec;
        s.daily.bestTimeSec = improved ? timeSec : s.daily.bestTimeSec;
      }
      s.daily.completed = true;
    }

    // streak: only advance once per day, only if yesterday or same day
    if (s.streak.lastDay !== today) {
      if (s.streak.lastDay === today - 1) s.streak.count += 1;
      else s.streak.count = 1;
      s.streak.lastDay = today;
      s.stats.dailyCompletions += 1;
    }
    newStreak = s.streak.count;
  });
  return { newStreak, improved };
}

/** A streak is "broken" for display if the last completion was before yesterday. */
export function currentStreak(): number {
  const s = load();
  const today = dayNumber();
  if (s.streak.lastDay === today || s.streak.lastDay === today - 1) return s.streak.count;
  return 0;
}

// --- achievements -----------------------------------------------------

export function isAchievementUnlocked(id: string): boolean {
  return !!load().achievements[id];
}

/** Returns true if this call newly unlocked it. */
export function unlockAchievement(id: string): boolean {
  const s = load();
  if (s.achievements[id]) return false;
  update((d) => {
    d.achievements[id] = Date.now();
  });
  return true;
}

// --- hint wallet ------------------------------------------------------

export const HINTS_PER_AD = 2;

export function getHintBalance(): number {
  return load().hintBalance ?? 0;
}

/** Spend one hint token. Returns false if the wallet is empty. */
export function spendHint(): boolean {
  const bal = getHintBalance();
  if (bal <= 0) return false;
  update((s) => {
    s.hintBalance = Math.max(0, (s.hintBalance ?? 0) - 1);
  });
  return true;
}

/** Grant hint tokens (e.g. after a rewarded ad). */
export function addHints(amount: number): number {
  let next = 0;
  update((s) => {
    s.hintBalance = Math.min(999, (s.hintBalance ?? 0) + Math.max(0, Math.floor(amount)));
    next = s.hintBalance;
  });
  return next;
}
