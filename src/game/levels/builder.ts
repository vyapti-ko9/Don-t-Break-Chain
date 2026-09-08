// ---------------------------------------------------------------------------
// Level builder. Recipes describe a level compactly; `compile()` turns one into
// a concrete LevelDef with normalized node positions + edges. This keeps the
// 100 level files terse while every level stays real, hand-authored data.
// ---------------------------------------------------------------------------

import type { EdgeDef, LevelDef, NodeDef, NodeType, Vec2 } from '../types';
import { NODE_PALETTE } from '../types';

export type LayoutKind =
  | 'line'
  | 'vert'
  | 'circle'
  | 'grid'
  | 'zig'
  | 'vshape'
  | 'spiral'
  | 'star'
  | 'tree'
  | 'diamond'
  | 'dual'
  | 'cross'
  | 'custom';

export interface TypeOverride {
  type: NodeType;
  radius?: number;
  delayMs?: number;
  before?: number;
}

export interface MovingSpec {
  path: Vec2[];
  speed?: number;
}

export interface Recipe {
  name: string;
  layout: LayoutKind;
  count?: number;
  cols?: number;
  rows?: number;
  /** for layout 'custom': explicit normalized node positions */
  points?: Vec2[];
  /** custom sequential path through node indices; replaces the default chain */
  order?: number[];
  /** flip the default chain direction (last -> first) */
  reverseChain?: boolean;
  /** make every generated node a 'reverse' link (energy flows against the arrows) */
  allReverse?: boolean;
  /** indices (into the generated node list) that are valid starting nodes */
  starts: number[];
  /** node indices whose `required` flag is forced off (decoy paths) */
  decoy?: number[];
  /** override a node's type / params */
  types?: Record<number, TypeOverride>;
  /** free-floating fake nodes: {x,y} normalized, optional inbound edge from index */
  fakes?: { x: number; y: number; from?: number; color?: string }[];
  /** extra real edges by index pair */
  edges?: [number, number][];
  /** fake edges (drawn, carry nothing) */
  fakeEdges?: [number, number][];
  /** hidden edges (revealed on traverse / full hint) */
  hiddenEdges?: [number, number][];
  /** moving nodes by index */
  moving?: Record<number, MovingSpec>;
  maxTaps?: number;
  maxMistakes?: number;
  timeLimit?: number;
  par: number;
  hints: [string, string, string];
  intro?: string;
}

function spread(n: number, a: number, b: number): number[] {
  if (n === 1) return [(a + b) / 2];
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

function layoutPositions(r: Recipe): { pos: Vec2[]; baseEdges: [number, number][] } {
  const n = r.count ?? 5;
  const pos: Vec2[] = [];
  const baseEdges: [number, number][] = [];
  const chain = () => {
    for (let i = 0; i < pos.length - 1; i++) baseEdges.push([i, i + 1]);
  };

  switch (r.layout) {
    case 'custom': {
      (r.points ?? []).forEach((p) => pos.push({ ...p }));
      break;
    }
    case 'line': {
      spread(n, 0.12, 0.88).forEach((x) => pos.push({ x, y: 0.5 }));
      chain();
      break;
    }
    case 'vert': {
      spread(n, 0.14, 0.86).forEach((y) => pos.push({ x: 0.5, y }));
      chain();
      break;
    }
    case 'circle': {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        pos.push({ x: 0.5 + Math.cos(a) * 0.34, y: 0.5 + Math.sin(a) * 0.34 });
      }
      chain();
      break;
    }
    case 'zig': {
      const xs = spread(n, 0.12, 0.88);
      xs.forEach((x, i) => pos.push({ x, y: i % 2 === 0 ? 0.34 : 0.66 }));
      chain();
      break;
    }
    case 'vshape': {
      const half = Math.ceil(n / 2);
      for (let i = 0; i < half; i++) pos.push({ x: 0.16 + i * 0.14, y: 0.2 + i * 0.16 });
      for (let i = half; i < n; i++) {
        const k = i - half + 1;
        pos.push({ x: 0.16 + (half - 1) * 0.14 + k * 0.14, y: 0.2 + (half - 1) * 0.16 - k * 0.16 });
      }
      chain();
      break;
    }
    case 'spiral': {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const a = t * Math.PI * 2.4;
        const rad = 0.12 + t * 0.3;
        pos.push({ x: 0.5 + Math.cos(a) * rad, y: 0.5 + Math.sin(a) * rad });
      }
      chain();
      break;
    }
    case 'star': {
      pos.push({ x: 0.5, y: 0.5 });
      for (let i = 1; i < n; i++) {
        const a = -Math.PI / 2 + ((i - 1) / (n - 1)) * Math.PI * 2;
        pos.push({ x: 0.5 + Math.cos(a) * 0.34, y: 0.5 + Math.sin(a) * 0.34 });
        baseEdges.push([0, i]);
      }
      break;
    }
    case 'grid': {
      const cols = r.cols ?? 3;
      const rows = r.rows ?? Math.ceil(n / cols);
      const xs = spread(cols, 0.16, 0.84);
      const ys = spread(rows, 0.16, 0.84);
      let count = 0;
      for (let row = 0; row < rows; row++) {
        const order = row % 2 === 0 ? xs : [...xs].reverse();
        for (const x of order) {
          if (count >= n) break;
          pos.push({ x, y: ys[row] });
          count++;
        }
      }
      chain();
      break;
    }
    case 'cross': {
      pos.push({ x: 0.5, y: 0.5 });
      pos.push({ x: 0.5, y: 0.16 });
      pos.push({ x: 0.84, y: 0.5 });
      pos.push({ x: 0.5, y: 0.84 });
      pos.push({ x: 0.16, y: 0.5 });
      baseEdges.push([1, 0], [0, 2], [0, 3], [0, 4]);
      break;
    }
    case 'tree': {
      // 0 -> 1 (splitter) -> {2,4} branch A, {3,5} branch B
      pos.push({ x: 0.5, y: 0.12 });
      pos.push({ x: 0.5, y: 0.34 });
      pos.push({ x: 0.28, y: 0.56 });
      pos.push({ x: 0.72, y: 0.56 });
      pos.push({ x: 0.2, y: 0.82 });
      pos.push({ x: 0.8, y: 0.82 });
      baseEdges.push([0, 1], [1, 2], [1, 3], [2, 4], [3, 5]);
      break;
    }
    case 'diamond': {
      // 0 -> {1,2} -> 3 (merger) -> 4 -> 5
      pos.push({ x: 0.5, y: 0.12 });
      pos.push({ x: 0.24, y: 0.36 });
      pos.push({ x: 0.76, y: 0.36 });
      pos.push({ x: 0.5, y: 0.58 });
      pos.push({ x: 0.5, y: 0.76 });
      pos.push({ x: 0.5, y: 0.92 });
      baseEdges.push([0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5]);
      break;
    }
    case 'dual': {
      const c = Math.max(3, Math.floor((r.count ?? 8) / 2));
      spread(c, 0.14, 0.86).forEach((x) => pos.push({ x, y: 0.34 }));
      spread(c, 0.14, 0.86).forEach((x) => pos.push({ x, y: 0.66 }));
      for (let i = 0; i < c - 1; i++) baseEdges.push([i, i + 1]);
      for (let i = 0; i < c - 1; i++) baseEdges.push([c + i, c + i + 1]);
      break;
    }
  }
  return { pos, baseEdges };
}

export function compileRecipe(id: number, world: number, r: Recipe): LevelDef {
  const layout = layoutPositions(r);
  const { pos } = layout;
  let baseEdges = layout.baseEdges;
  if (r.order && r.order.length > 1) {
    baseEdges = [];
    for (let i = 0; i < r.order.length - 1; i++) baseEdges.push([r.order[i], r.order[i + 1]]);
  } else if (r.reverseChain) {
    baseEdges = baseEdges.map(([a, b]) => [b, a] as [number, number]);
  }
  const decoy = new Set(r.decoy ?? []);
  const startSet = new Set(r.starts);

  const nodes: NodeDef[] = pos.map((p, i) => {
    const ov = r.types?.[i];
    const mv = r.moving?.[i];
    const node: NodeDef = {
      id: `n${i}`,
      x: p.x,
      y: p.y,
      type: ov?.type ?? (mv ? 'moving' : r.allReverse ? 'reverse' : 'normal'),
      color: NODE_PALETTE[i % NODE_PALETTE.length],
    };
    if (startSet.has(i)) node.start = true;
    if (decoy.has(i)) node.required = false;
    if (ov?.radius !== undefined) node.radius = ov.radius;
    if (ov?.delayMs !== undefined) node.delayMs = ov.delayMs;
    if (ov?.before !== undefined) node.before = ov.before;
    if (mv) {
      node.path = mv.path;
      node.speed = mv.speed;
      if (!ov) node.type = 'moving';
    }
    return node;
  });

  const edges: EdgeDef[] = baseEdges.map(([a, b]) => ({ from: `n${a}`, to: `n${b}` }));
  for (const [a, b] of r.edges ?? []) edges.push({ from: `n${a}`, to: `n${b}` });
  for (const [a, b] of r.fakeEdges ?? []) edges.push({ from: `n${a}`, to: `n${b}`, fake: true });
  for (const [a, b] of r.hiddenEdges ?? []) edges.push({ from: `n${a}`, to: `n${b}`, hidden: true });

  (r.fakes ?? []).forEach((f, k) => {
    const fid = `f${k}`;
    nodes.push({
      id: fid,
      x: f.x,
      y: f.y,
      type: 'fake',
      color: f.color ?? '#8b90a8',
      required: false,
    });
    if (f.from !== undefined) edges.push({ from: `n${f.from}`, to: fid });
  });

  return {
    id,
    world,
    name: r.name,
    hints: r.hints,
    // tighter par - a 3-star clear should feel earned
    par: Math.max(2, Math.round(r.par * 0.72)),
    maxTaps: r.maxTaps,
    maxMistakes: r.maxMistakes,
    timeLimit: r.timeLimit,
    nodes,
    edges,
    intro: r.intro,
  };
}
