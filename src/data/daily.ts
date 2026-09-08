import { compileRecipe, type LayoutKind, type Recipe } from '../game/levels/builder';
import { mulberry32, dayNumber } from '../utils/rng';
import type { LevelDef } from '../game/types';

// Deterministic Daily Challenge: the same day yields the same board for every
// player on the same game version, with no network. Challenge # is the day
// number offset so it reads as a friendly incrementing count.

const EPOCH_DAY = 20089; // ~ 2025-01-01, so challenge #1 lands near launch

export function dailyChallengeNumber(day = dayNumber()): number {
  return Math.max(1, day - EPOCH_DAY + 1);
}

const LAYOUTS: LayoutKind[] = ['line', 'zig', 'circle', 'vshape', 'spiral', 'tree', 'diamond', 'grid'];

export function buildDailyLevel(day = dayNumber()): LevelDef {
  const rand = mulberry32(day * 2654435761);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const layout = pick(LAYOUTS);

  let count = 7 + Math.floor(rand() * 4); // 7–10
  const types: Recipe['types'] = {};
  const moving: Recipe['moving'] = {};
  const decoy: number[] = [];
  const edges: [number, number][] = [];
  let starts = [0];
  let timeLimit: number | undefined;
  let maxTaps: number | undefined;
  const maxMistakes = 1;

  if (layout === 'tree') count = 6;
  if (layout === 'diamond') {
    count = 6;
    types[3] = { type: 'merger' };
  }
  if (layout === 'grid') count = 9;

  // Pure reverse days - no type/moving overrides (those break reverse flow).
  const reverse = layout !== 'tree' && layout !== 'diamond' && rand() < 0.36;
  if (reverse) starts = [count - 1];

  const fakeEdges: [number, number][] = [];
  const hiddenEdges: [number, number][] = [];
  const fakes: Recipe['fakes'] = [];
  let order: number[] | undefined;

  if (!reverse && (layout === 'circle' || layout === 'grid') && rand() < 0.6) {
    order = scrambleOrder(count, rand);
  }

  if (!reverse && layout !== 'tree' && layout !== 'diamond') {
    const roll = rand();
    if (roll < 0.28) {
      types[Math.min(count - 2, 1 + Math.floor(rand() * 2))] = {
        type: 'delay',
        delayMs: 1100 + Math.floor(rand() * 500),
      };
      if (rand() < 0.5) {
        const d2 = Math.min(count - 2, 3 + Math.floor(rand() * 2));
        if (!types[d2]) {
          types[d2] = { type: 'delay', delayMs: 900 + Math.floor(rand() * 400) };
        }
      }
    } else if (roll < 0.52) {
      const mi = 1 + Math.floor(rand() * (count - 2));
      moving[mi] = {
        path: [
          { x: 0.5, y: 0.14 },
          { x: 0.5, y: 0.86 },
        ],
        speed: 0.22 + rand() * 0.08,
      };
      if (rand() < 0.55) {
        moving[0] = {
          path: [
            { x: 0.12, y: 0.2 },
            { x: 0.12, y: 0.8 },
          ],
          speed: 0.2,
        };
      }
    } else if (roll < 0.72) {
      maxTaps = 1;
    } else {
      types[count - 1] = { type: 'timer', before: 2.2 + Math.floor(rand() * 2) };
    }

    // Dual-start first (rewrites topology) so later fakes/hiddens see final bombs.
    let dual = false;
    if (rand() < 0.3 && count >= 8) {
      const mid = Math.floor(count / 2);
      types[mid] = { type: 'bomb' };
      if (mid + 1 < count - 1) types[mid + 1] = { type: 'bomb' };
      decoy.push(mid);
      if (types[mid + 1]) decoy.push(mid + 1);

      const left = Array.from({ length: mid }, (_, i) => i);
      const rightStart = mid + (types[mid + 1] ? 2 : 1);
      const right = Array.from({ length: count - rightStart }, (_, i) => rightStart + i);
      if (left.length >= 2 && right.length >= 2) {
        dual = true;
        order = left;
        for (let i = 0; i < right.length - 1; i++) edges.push([right[i], right[i + 1]]);
        starts = [left[0], right[0]];
        maxTaps = 2;
        fakeEdges.push([left[left.length - 1], mid], [right[0], mid]);
        if (types[mid + 1]) fakeEdges.push([mid, mid + 1], [mid + 1, right[0]]);
        fakes.push({ x: 0.5, y: 0.08 }, { x: 0.16 + rand() * 0.18, y: 0.88 });
      } else {
        delete types[mid];
        delete types[mid + 1];
        decoy.length = 0;
      }
    }

    // Tip bomb beside the real end (skip dual days).
    if (!dual && rand() < 0.75 && count >= 7 && !types[count - 1]) {
      const bombIdx = count - 1;
      types[bombIdx] = { type: 'bomb' };
      decoy.push(bombIdx);
      const live = (order ?? Array.from({ length: count }, (_, i) => i)).filter((i) => i !== bombIdx);
      order = live;
      fakeEdges.push([live[live.length - 1], bombIdx], [0, bombIdx]);
      fakes.push({ x: 0.5, y: 0.08 }, { x: 0.16 + rand() * 0.18, y: 0.88 });
    } else if (!dual) {
      fakes.push({ x: 0.5, y: 0.1 });
      if (rand() < 0.75) fakes.push({ x: 0.18 + rand() * 0.2, y: 0.86 });
    }

    // Dense fake shortcuts
    if (count >= 5) {
      const a = Math.floor(rand() * (count - 3));
      fakeEdges.push([a, Math.min(count - 1, a + 2 + Math.floor(rand() * 2))]);
      fakeEdges.push([0, count - 1]);
      if (rand() < 0.75) fakeEdges.push([1, Math.max(2, count - 2)]);
      if (rand() < 0.55) fakeEdges.push([0, Math.floor(count / 2)]);
    }

    // Hidden gaps on the live path only - never touch bombs
    if (rand() < 0.55 && count >= 6) {
      const path = (order ?? Array.from({ length: count }, (_, i) => i)).filter(
        (i) => types[i]?.type !== 'bomb',
      );
      const mid = Math.floor(path.length / 2);
      const a = path[mid - 1];
      const b = path[mid];
      if (a !== undefined && b !== undefined && !types[b]) hiddenEdges.push([a, b]);
      if (rand() < 0.45 && path[mid + 1] !== undefined && !types[path[mid + 1]]) {
        hiddenEdges.push([b, path[mid + 1]]);
      }
    }
  } else if (layout === 'tree' || layout === 'diamond') {
    if (rand() < 0.7) {
      types[1] = {
        type: layout === 'tree' ? 'splitter' : 'delay',
        delayMs: 1000 + Math.floor(rand() * 400),
      };
    }
    if (layout === 'diamond' && rand() < 0.55) {
      types[1] = { type: 'delay', delayMs: 1100 + Math.floor(rand() * 400) };
    }
    fakeEdges.push([0, count - 1]);
    if (rand() < 0.7) fakeEdges.push([0, Math.floor(count / 2)]);
    fakes.push({ x: 0.5, y: 0.95 }, { x: 0.16, y: 0.5 });
    maxTaps = 1;
    if (layout === 'diamond' && rand() < 0.45) {
      types[count - 1] = { type: 'timer', before: 2.3 + Math.floor(rand() * 2) };
    }
  }

  for (const [idx, t] of Object.entries(types)) {
    if (t.type === 'bomb' && !decoy.includes(Number(idx))) decoy.push(Number(idx));
  }

  const par = Math.round(count * 0.62 + 1.1);
  const delayBudget = Object.values(types).filter((t) => t.type === 'delay').length * 0.85;
  const tapPenalty = maxTaps && maxTaps > 1 ? 0.82 : maxTaps === 1 ? 0.88 : 0.95;
  timeLimit = Math.max(2.2, Math.round((par * 0.85 * tapPenalty + delayBudget * 0.3) * 10) / 10);

  if (types[count - 1]?.type === 'timer' && types[count - 1].before) {
    timeLimit = Math.min(timeLimit, (types[count - 1].before as number) + 0.35);
  }

  const recipe: Recipe = {
    name: 'Daily Challenge',
    layout,
    count,
    starts,
    order,
    edges: edges.length ? edges : undefined,
    allReverse: reverse || undefined,
    types: Object.keys(types).length ? types : undefined,
    moving: Object.keys(moving).length ? moving : undefined,
    decoy: decoy.length ? decoy : undefined,
    fakeEdges: fakeEdges.length ? fakeEdges : undefined,
    hiddenEdges: hiddenEdges.length ? hiddenEdges : undefined,
    fakes: fakes.length ? fakes : undefined,
    timeLimit,
    maxTaps,
    maxMistakes,
    par,
    hints: [
      'One wrong tap ends it. Read every arrow.',
      'Ignore fakes, bombs, and grey stubs.',
      reverse
        ? 'The chain runs backwards today - start at the tip.'
        : maxTaps && maxTaps > 1
          ? 'Multiple starts. Spend every tap.'
          : 'Start at the true source, then survive the clock.',
    ],
  };

  return compileRecipe(9000 + day, 0, recipe);
}

function scrambleOrder(n: number, rand: () => number): number[] {
  const step = 2 + Math.floor(rand() * Math.min(3, Math.floor(n / 3)));
  const out: number[] = [];
  const seen = new Set<number>();
  let cur = 0;
  while (out.length < n) {
    if (!seen.has(cur)) {
      out.push(cur);
      seen.add(cur);
    }
    cur = (cur + step) % n;
    if (out.length < n && seen.has(cur)) {
      for (let i = 0; i < n; i++) {
        if (!seen.has(i)) {
          cur = i;
          break;
        }
      }
    }
  }
  return out;
}
