import type { NodeDef, NodeType, Vec2 } from '../types';
import { NODE_PALETTE } from '../types';

export type NodeState = 'idle' | 'charging' | 'active' | 'dead';

export class ChainNode {
  readonly id: string;
  readonly type: NodeType;
  readonly def: NodeDef;
  readonly color: string;
  readonly isStart: boolean;
  readonly required: boolean;

  /** normalized position (moving nodes update this) */
  nx: number;
  ny: number;

  state: NodeState = 'idle';
  /** 0..1 activation pop animation */
  pop = 0;
  /** ring pulse animation, decays 1 -> 0 */
  ring = 0;
  /** merger: how many incoming pulses have landed */
  received = 0;
  /** merger: how many incoming edges exist */
  incoming = 0;
  /** reveal for fake nodes after failure / hint */
  revealed = false;
  /** true once this node has scheduled its outgoing propagation */
  fired = false;

  private pathLen = 0;
  private segLens: number[] = [];
  private phase = 0; // 0..1 along the pingpong path

  constructor(def: NodeDef, index: number) {
    this.id = def.id;
    this.type = def.type;
    this.def = def;
    this.color = def.color ?? NODE_PALETTE[index % NODE_PALETTE.length];
    this.isStart = !!def.start;
    this.required =
      def.required ?? (def.type !== 'fake' && def.type !== 'bomb');
    this.nx = def.x;
    this.ny = def.y;

    if (def.path && def.path.length > 1) {
      const pts = [def.path[0], ...def.path];
      for (let i = 1; i < def.path.length; i++) {
        const a = def.path[i - 1];
        const b = def.path[i];
        const l = Math.hypot(b.x - a.x, b.y - a.y);
        this.segLens.push(l);
        this.pathLen += l;
      }
      void pts;
    }
  }

  get isMoving(): boolean {
    return this.pathLen > 0;
  }

  updateMotion(dt: number): void {
    if (this.pathLen <= 0 || !this.def.path) return;
    const speed = this.def.speed ?? 0.08;
    // triangle wave phase for ping-pong
    this.phase += (dt * speed) / this.pathLen;
    const tri = 1 - Math.abs(((this.phase % 2) + 2) % 2 - 1); // 0..1..0
    let target = tri * this.pathLen;
    const path = this.def.path;
    for (let i = 0; i < this.segLens.length; i++) {
      if (target <= this.segLens[i] || i === this.segLens.length - 1) {
        const t = this.segLens[i] > 0 ? target / this.segLens[i] : 0;
        this.nx = path[i].x + (path[i + 1].x - path[i].x) * t;
        this.ny = path[i].y + (path[i + 1].y - path[i].y) * t;
        return;
      }
      target -= this.segLens[i];
    }
  }

  updateAnim(dt: number): void {
    if (this.state === 'active' && this.pop < 1) this.pop = Math.min(1, this.pop + dt * 6);
    if (this.ring > 0) this.ring = Math.max(0, this.ring - dt * 1.8);
  }

  pos(): Vec2 {
    return { x: this.nx, y: this.ny };
  }
}
