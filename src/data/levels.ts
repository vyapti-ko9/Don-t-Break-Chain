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
// the run from World 1; derived clocks (and last-five squeeze) stay mean.
const WORLD_MAX_MISTAKES: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };
const WORLD_TIME_FACTOR: Record<number, number> = { 1: 0.95, 2: 0.88, 3: 0.82, 4: 0.76, 5: 0.7 };

export const LEVELS: LevelDef[] = RECIPES.map((r, i) => {
  const id = i + 1;
  const world = Math.min(5, Math.floor(i / 20) + 1);
  const def = compileRecipe(id, world, r);

  def.maxMistakes = Math.min(def.maxMistakes ?? WORLD_MAX_MISTAKES[world], WORLD_MAX_MISTAKES[world]);

  const factor = WORLD_TIME_FACTOR[world];
  if (def.timeLimit == null) {
    def.timeLimit = Math.max(2.2, Math.round(def.par * factor * 10) / 10);
  } else {
    // Recipe clocks still take a world-scaled trim so later worlds bite harder.
    def.timeLimit = Math.max(2.2, Math.round(def.timeLimit * factor * 10) / 10);
  }
  // last five of every world get an extra squeeze
  if (id % 20 >= 16 || id % 20 === 0) {
    if (def.timeLimit) def.timeLimit = Math.max(2.2, Math.round(def.timeLimit * 0.65 * 10) / 10);
    def.maxMistakes = 1;
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
