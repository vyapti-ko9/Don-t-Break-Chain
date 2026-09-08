// Lightweight pooled particle system. All values are in device pixels.
// Pooled to avoid per-frame allocation churn on mobile.

export interface Particle {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  drag: number;
  gravity: number;
  color: string;
  glow: boolean;
}

export interface BurstOptions {
  count?: number;
  speed?: number;
  spread?: number; // 0..1 velocity variance
  size?: number;
  life?: number;
  gravity?: number;
  drag?: number;
  color?: string;
  glow?: boolean;
  angle?: number; // directional bias (radians); omit for radial
  arc?: number; // spread of directional burst (radians)
}

export class ParticleSystem {
  private pool: Particle[] = [];
  private max: number;

  constructor(max = 420) {
    this.max = max;
    for (let i = 0; i < max; i++) {
      this.pool.push({
        alive: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        drag: 0.9,
        gravity: 0,
        color: '#fff',
        glow: false,
      });
    }
  }

  private take(): Particle | null {
    for (let i = 0; i < this.max; i++) {
      if (!this.pool[i].alive) return this.pool[i];
    }
    return null;
  }

  burst(x: number, y: number, o: BurstOptions = {}): void {
    const count = o.count ?? 16;
    const speed = o.speed ?? 180;
    const spread = o.spread ?? 0.6;
    for (let i = 0; i < count; i++) {
      const p = this.take();
      if (!p) return;
      let dir: number;
      if (o.angle !== undefined) {
        const arc = o.arc ?? 0.8;
        dir = o.angle + (Math.random() - 0.5) * arc;
      } else {
        dir = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      }
      const v = speed * (1 - spread + Math.random() * spread * 2);
      p.alive = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(dir) * v;
      p.vy = Math.sin(dir) * v;
      p.maxLife = o.life ?? 0.6 + Math.random() * 0.3;
      p.life = p.maxLife;
      p.size = o.size ?? 2 + Math.random() * 2.5;
      p.drag = o.drag ?? 0.88;
      p.gravity = o.gravity ?? 0;
      p.color = o.color ?? '#ffffff';
      p.glow = o.glow ?? true;
    }
  }

  /** trailing spark along a moving energy pulse */
  trail(x: number, y: number, color: string): void {
    const p = this.take();
    if (!p) return;
    p.alive = true;
    p.x = x + (Math.random() - 0.5) * 4;
    p.y = y + (Math.random() - 0.5) * 4;
    p.vx = (Math.random() - 0.5) * 30;
    p.vy = (Math.random() - 0.5) * 30;
    p.maxLife = 0.35;
    p.life = p.maxLife;
    p.size = 1.5 + Math.random() * 1.5;
    p.drag = 0.9;
    p.gravity = 0;
    p.color = color;
    p.glow = true;
  }

  update(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy += p.gravity * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.alive) continue;
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear(): void {
    for (let i = 0; i < this.max; i++) this.pool[i].alive = false;
  }

  get activeCount(): number {
    let n = 0;
    for (let i = 0; i < this.max; i++) if (this.pool[i].alive) n++;
    return n;
  }
}
