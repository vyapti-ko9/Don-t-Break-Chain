// ---------------------------------------------------------------------------
// Shared game types. Level DATA uses normalized coordinates (0..1) on a
// portrait board; the engine maps them to device pixels.
// ---------------------------------------------------------------------------

export type NodeType =
  | 'normal'
  | 'delay'
  | 'explosive'
  | 'splitter'
  | 'merger'
  | 'timer'
  | 'moving'
  | 'fake'
  | 'reverse'
  | 'bomb'
  | 'multiplier';

export interface Vec2 {
  x: number;
  y: number;
}

export interface NodeDef {
  id: string;
  /** normalized 0..1 within the board */
  x: number;
  y: number;
  type: NodeType;
  /** hex color, defaults are derived from index when omitted */
  color?: string;
  /** a correct starting node - tapping it begins the chain */
  start?: boolean;
  /** whether this node must be activated to win (default: true unless fake/bomb) */
  required?: boolean;
  /** explosive activation radius, normalized (default 0.22) */
  radius?: number;
  /** delay node wait, ms (default 900) */
  delayMs?: number;
  /** waypoints for a moving node (normalized). Node pingpongs along them. */
  path?: Vec2[];
  /** moving node speed, normalized units / second (default 0.08) */
  speed?: number;
  /** timer node must be reached before this many seconds (default level.timeLimit) */
  before?: number;
}

export interface EdgeDef {
  from: string;
  to: string;
  /** drawn but carries no energy - a fake connection */
  fake?: boolean;
  /** not drawn until energy travels it or a full hint is used */
  hidden?: boolean;
}

export interface LevelDef {
  id: number;
  world: number;
  name: string;
  /** progressive hints, up to 3 */
  hints: string[];
  /** seconds for a 3-star time */
  par: number;
  /** optional hard cap on taps */
  maxTaps?: number;
  /** wrong taps tolerated before the chain fails (undefined = unlimited) */
  maxMistakes?: number;
  /** optional countdown, seconds */
  timeLimit?: number;
  nodes: NodeDef[];
  edges: EdgeDef[];
  /** one-line teaching note shown the first time a new mechanic appears */
  intro?: string;
}

export type EngineStatus = 'ready' | 'running' | 'won' | 'lost';

export interface EngineResult {
  status: 'won' | 'lost';
  timeSec: number;
  mistakes: number;
  tapsUsed: number;
  reason?: string;
}

export interface EngineCallbacks {
  onStatus?: (status: EngineStatus) => void;
  onMistake?: (count: number) => void;
  onTap?: (nodeId: string | null) => void;
  onResult?: (result: EngineResult) => void;
  /** live HUD numbers, throttled to ~10fps */
  onHud?: (hud: EngineHud) => void;
}

export interface EngineHud {
  timeSec: number;
  tapsUsed: number;
  maxTaps?: number;
  maxMistakes?: number;
  timeLimit?: number;
  mistakes: number;
  activated: number;
  required: number;
}

export const WORLDS = [
  { id: 1, name: 'First Link', range: [1, 20] as const },
  { id: 2, name: 'Moving Links', range: [21, 40] as const },
  { id: 3, name: 'Split & Merge', range: [41, 60] as const },
  { id: 4, name: 'Chaos', range: [61, 80] as const },
  { id: 5, name: 'Impossible', range: [81, 100] as const },
];

export const NODE_PALETTE = [
  '#ff5a6a',
  '#ffd24a',
  '#5b8cff',
  '#00e6c3',
  '#b06bff',
  '#ff8a3d',
  '#4ade80',
  '#f472b6',
];
