import type { EdgeDef } from '../types';
import type { ChainNode } from './ChainNode';

export class ChainConnection {
  readonly from: ChainNode;
  readonly to: ChainNode;
  readonly fake: boolean;
  readonly hidden: boolean;
  /** becomes true once energy has traversed it (so hidden edges get drawn) */
  traversed = false;
  /** glow decay after a pulse passes, 1 -> 0 */
  glow = 0;

  constructor(def: EdgeDef, from: ChainNode, to: ChainNode) {
    this.from = from;
    this.to = to;
    this.fake = !!def.fake;
    this.hidden = !!def.hidden;
  }
}

export type PulseKind = 'forward' | 'reverse' | 'explosive';

export class Pulse {
  from: ChainNode;
  to: ChainNode;
  edge: ChainConnection | null;
  t = 0;
  readonly dur: number;
  readonly kind: PulseKind;
  readonly color: string;
  done = false;

  constructor(
    from: ChainNode,
    to: ChainNode,
    edge: ChainConnection | null,
    dur: number,
    kind: PulseKind,
  ) {
    this.from = from;
    this.to = to;
    this.edge = edge;
    this.dur = dur;
    this.kind = kind;
    this.color = from.color;
  }

  update(dt: number): void {
    this.t += dt / this.dur;
    if (this.t >= 1) {
      this.t = 1;
      this.done = true;
    }
  }

  /** normalized head position */
  head(): { x: number; y: number } {
    const a = this.from.pos();
    const b = this.to.pos();
    const e = easeInOut(this.t);
    return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
