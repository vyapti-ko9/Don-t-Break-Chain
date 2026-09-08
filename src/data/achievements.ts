import type { SaveData } from '../utils/storage';
import { TOTAL_LEVELS } from './levels';

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  /** returns true when earned, given the current save */
  check: (s: SaveData) => boolean;
  secret?: boolean;
}

function completedCount(s: SaveData): number {
  return Object.values(s.levels).filter((l) => l.completed).length;
}
function totalStars(s: SaveData): number {
  return Object.values(s.levels).reduce((a, l) => a + l.stars, 0);
}
function perfectCount(s: SaveData): number {
  return Object.values(s.levels).filter((l) => l.stars === 3).length;
}
function worldCleared(s: SaveData, world: number): boolean {
  const lo = (world - 1) * 20 + 1;
  for (let i = lo; i < lo + 20; i++) if (!s.levels[i]?.completed) return false;
  return true;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-link', title: 'First Link', desc: 'Complete your first level.', icon: '🔗', check: (s) => completedCount(s) >= 1 },
  { id: 'chain-starter', title: 'Chain Starter', desc: 'Complete 5 levels.', icon: '⛓️', check: (s) => completedCount(s) >= 5 },
  { id: 'chain-builder', title: 'Chain Builder', desc: 'Complete 25 levels.', icon: '🏗️', check: (s) => completedCount(s) >= 25 },
  { id: 'chain-master', title: 'Chain Master', desc: 'Complete 50 levels.', icon: '👑', check: (s) => completedCount(s) >= 50 },
  { id: 'chain-legend', title: 'Chain Legend', desc: 'Complete 75 levels.', icon: '🌟', check: (s) => completedCount(s) >= 75 },
  { id: 'unbreakable', title: 'Unbreakable', desc: `Complete all ${TOTAL_LEVELS} levels.`, icon: '💎', check: (s) => completedCount(s) >= TOTAL_LEVELS },
  { id: 'world-1', title: 'First Link Cleared', desc: 'Finish World 1.', icon: '1️⃣', check: (s) => worldCleared(s, 1) },
  { id: 'world-2', title: 'Moving Links Cleared', desc: 'Finish World 2.', icon: '2️⃣', check: (s) => worldCleared(s, 2) },
  { id: 'world-3', title: 'Split & Merge Cleared', desc: 'Finish World 3.', icon: '3️⃣', check: (s) => worldCleared(s, 3) },
  { id: 'world-4', title: 'Chaos Cleared', desc: 'Finish World 4.', icon: '4️⃣', check: (s) => worldCleared(s, 4) },
  { id: 'world-5', title: 'The Impossible', desc: 'Finish World 5.', icon: '5️⃣', check: (s) => worldCleared(s, 5) },
  { id: 'perfect-chain', title: 'Perfect Chain', desc: 'Earn 3 stars on a level.', icon: '⭐', check: (s) => perfectCount(s) >= 1 },
  { id: 'flawless-10', title: 'Flawless Ten', desc: 'Earn 3 stars on 10 levels.', icon: '✨', check: (s) => perfectCount(s) >= 10 },
  { id: 'star-collector', title: 'Star Collector', desc: 'Collect 50 stars.', icon: '🌠', check: (s) => totalStars(s) >= 50 },
  { id: 'star-hoarder', title: 'Star Hoarder', desc: 'Collect 150 stars.', icon: '🏆', check: (s) => totalStars(s) >= 150 },
  { id: 'no-mistakes-10', title: 'Steady Hands', desc: 'Complete 10 levels with no mistakes.', icon: '🎯', check: (s) => s.stats.levelsNoMistake >= 10 },
  { id: 'no-hint-20', title: 'Hintless', desc: 'Complete 20 levels without a hint.', icon: '🧠', check: (s) => s.stats.levelsNoHint >= 20 },
  { id: 'speed-demon', title: 'Speed Demon', desc: 'Finish any level in under 3 seconds.', icon: '⚡', check: (s) => s.stats.bestTimeSec >= 0 && s.stats.bestTimeSec < 3 },
  { id: 'long-chain', title: 'The Long Haul', desc: 'Activate a chain of 10+ links.', icon: '📏', check: (s) => s.stats.longestChain >= 10 },
  { id: 'daily-1', title: 'Daily Habit', desc: 'Complete a Daily Challenge.', icon: '📅', check: (s) => s.stats.dailyCompletions >= 1 },
  { id: 'daily-7', title: 'Daily Player', desc: 'Complete 7 Daily Challenges.', icon: '🗓️', check: (s) => s.stats.dailyCompletions >= 7 },
  { id: 'streak-3', title: 'On a Roll', desc: 'Reach a 3-day streak.', icon: '🔥', check: (s) => s.streak.count >= 3 },
  { id: 'streak-7', title: 'Week Warrior', desc: 'Reach a 7-day streak.', icon: '🔥', check: (s) => s.streak.count >= 7 },
  { id: 'persistent', title: 'Persistent', desc: 'Make 100 total attempts.', icon: '🔁', check: (s) => s.stats.totalAttempts >= 100 },
];

/** Runs all checks against the current save, unlocking any newly earned. */
export function evaluateAchievements(save: SaveData, unlock: (id: string) => boolean): Achievement[] {
  const fresh: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements[a.id]) continue;
    if (a.check(save)) {
      if (unlock(a.id)) fresh.push(a);
    }
  }
  return fresh;
}
