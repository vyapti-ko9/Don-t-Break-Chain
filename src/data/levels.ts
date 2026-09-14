import { compileRecipe, type Recipe } from '../game/levels/builder';
import { world1 } from '../game/levels/world1';
import { world2 } from '../game/levels/world2';
import { world3 } from '../game/levels/world3';
import { world4 } from '../game/levels/world4';
import { world5 } from '../game/levels/world5';
import type { LevelDef } from '../game/types';
import { WORLDS } from '../game/types';

const RECIPES: Recipe[] = [...world1, ...world2, ...world3, ...world4, ...world5];

export const TOTAL_LEVELS = RECIPES.length;

// Global difficulty curve applied on top of every level. One wrong tap ends
// the run — everywhere, from level 1. Every level carries a clock; a level
// that already authored its own clock keeps it exactly (no double-shrinking),
// everything else derives one from its (already-tightened) par.
const WORLD_MAX_MISTAKES = 1;
const WORLD_TIME_FACTOR: Record<number, number> = { 1: 1.75, 2: 1.6, 3: 1.5, 4: 1.4, 5: 1.3 };
const MIN_TIME_LIMIT = 2.4;

export const LEVELS: LevelDef[] = RECIPES.map((r, i) => {
  const id = i + 1;
  const world = Math.min(5, Math.floor(i / 20) + 1);
  const def = compileRecipe(id, world, r);

  def.maxMistakes = Math.min(def.maxMistakes ?? WORLD_MAX_MISTAKES, WORLD_MAX_MISTAKES);

  if (def.timeLimit == null) {
    const factor = WORLD_TIME_FACTOR[world];
    def.timeLimit = Math.max(MIN_TIME_LIMIT, Math.round(def.par * factor * 10) / 10);
  }
  // last five of every world get a light extra squeeze
  if ((id % 20 >= 16 || id % 20 === 0) && def.timeLimit) {
    def.timeLimit = Math.max(MIN_TIME_LIMIT, Math.round(def.timeLimit * 0.88 * 10) / 10);
  }
  return def;
});

export function getLevel(id: number): LevelDef | null {
  return LEVELS[id - 1] ?? null;
}

export function worldOf(id: number): number {
  return Math.min(5, Math.floor((id - 1) / 20) + 1);
}

export function levelsForWorld(world: number): LevelDef[] {
  return LEVELS.filter((l) => l.world === world);
}

export { WORLDS };
