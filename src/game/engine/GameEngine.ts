// ---------------------------------------------------------------------------
// GameEngine - owns the canvas render loop and ALL gameplay simulation.
// It never touches React state directly; it reports out via callbacks so the
// React HUD can update at a low frequency while the canvas runs at 60fps.
// ---------------------------------------------------------------------------

import type {
  EngineCallbacks,
  EngineHud,
  EngineResult,
  EngineStatus,
  LevelDef,
} from '../types';
import { GameLoop } from './GameLoop';
import { ParticleSystem } from './Particles';
import { ChainNode } from '../objects/ChainNode';
import { ChainConnection, Pulse } from '../objects/ChainConnection';
import { computeBoard, hitRadius, toPx, type Board } from './board';
import { drawScene } from './renderer';
import { playSound } from '../../utils/audio';
import { haptic } from '../../utils/haptics';

interface Scheduled {
  at: number;
  fn: () => void;
}

export interface EngineOptions {
  reducedMotion?: boolean;
}

const PULSE_SPEED = 1.35; // normalized units / second - snappy, less waiting
const SETTLE_DELAY = 0.42; // seconds of silence before we call the chain broken

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelDef;
  private cb: EngineCallbacks;
  private opts: EngineOptions;

  private loop: GameLoop;
  private particles = new ParticleSystem();

  private nodes: ChainNode[] = [];
  private nodeById = new Map<string, ChainNode>();
  private edges: ChainConnection[] = [];
  private outgoing = new Map<string, ChainConnection[]>();
  private incoming = new Map<string, ChainConnection[]>();
  private pulses: Pulse[] = [];
  private scheduled: Scheduled[] = [];

  private board: Board = { x: 0, y: 0, w: 0, h: 0, scale: 1 };

  private status: EngineStatus = 'ready';
  private time = 0; // seconds since first valid tap
  private clock = 0; // monotonic engine time (for scheduling)
  private mistakes = 0;
  private tapsUsed = 0;
  private activatedCount = 0;
  private lastActivity = 0;
  private failQueued: string | null = null;
  private shake = 0;
  private hintLevel = 0;
  private hudAccum = 0;
  private paused = false;

  private boundPointer: (e: PointerEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    level: LevelDef,
    cb: EngineCallbacks = {},
    opts: EngineOptions = {},
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.level = level;
    this.cb = cb;
    this.opts = opts;
    this.loop = new GameLoop((dt) => this.frame(dt));
    this.boundPointer = (e) => this.onPointerDown(e);
    this.build();
  }

  // --- lifecycle --------------------------------------------------------

  private build(): void {
    this.nodes = this.level.nodes.map((d, i) => new ChainNode(d, i));
    this.nodeById.clear();
    for (const n of this.nodes) this.nodeById.set(n.id, n);

    this.edges = [];
    this.outgoing.clear();
    this.incoming.clear();
    for (const ed of this.level.edges) {
      const from = this.nodeById.get(ed.from);
      const to = this.nodeById.get(ed.to);
      if (!from || !to) continue; // resilient to bad level data
      const conn = new ChainConnection(ed, from, to);
      this.edges.push(conn);
      if (!this.outgoing.has(from.id)) this.outgoing.set(from.id, []);
      if (!this.incoming.has(to.id)) this.incoming.set(to.id, []);
      this.outgoing.get(from.id)!.push(conn);
      this.incoming.get(to.id)!.push(conn);
    }
    for (const n of this.nodes) {
      const inc = (this.incoming.get(n.id) ?? []).filter((e) => !e.fake);
      n.incoming = inc.length;
    }
  }

  start(): void {
    this.loop.start();
    this.canvas.addEventListener('pointerdown', this.boundPointer);
    this.emitHud();
  }

  destroy(): void {
    this.loop.stop();
    this.canvas.removeEventListener('pointerdown', this.boundPointer);
    this.particles.clear();
    this.pulses = [];
    this.scheduled = [];
  }

  setPaused(p: boolean): void {
    this.paused = p;
  }

  setHintLevel(n: number): void {
    this.hintLevel = Math.max(this.hintLevel, n);
  }

  /** Restart the same level from scratch (used by the RETRY button). */
  reset(): void {
    this.status = 'ready';
    this.time = 0;
    this.mistakes = 0;
    this.tapsUsed = 0;
    this.activatedCount = 0;
    this.lastActivity = 0;
    this.failQueued = null;
    this.shake = 0;
    this.pulses = [];
    this.scheduled = [];
    this.particles.clear();
    this.build();
    this.cb.onStatus?.('ready');
    this.emitHud();
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.board = computeBoard(this.canvas.width, this.canvas.height);
    this.render();
  }

  // --- input -----------------------------------------------------------

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    if (this.status === 'won' || this.status === 'lost') return;
    const rect = this.canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    const node = this.pickNode(px, py);
    this.cb.onTap?.(node ? node.id : null);
    playSound('tap');

    if (!node) return;
    if (node.state === 'active') {
      haptic('light');
      return;
    }

    const isFirst = this.status === 'ready';

    if (node.type === 'bomb') {
      this.tapsUsed += 1;
      if (isFirst) this.beginRun();
      this.particles.burst(...this.px(node), {
        count: 30,
        speed: 260,
        color: '#ff5a6a',
        life: 0.8,
      });
      this.shake += 22;
      playSound('explode');
      haptic('error');
      node.revealed = true;
      this.finish('lost', 'You activated a bomb.');
      return;
    }

    if (node.isStart) {
      if (isFirst) this.beginRun();
      this.tapsUsed += 1;
      haptic('medium');
      this.activate(node);
    } else {
      // wrong node
      this.tapsUsed += 1;
      this.mistakes += 1;
      this.cb.onMistake?.(this.mistakes);
      this.shake += 8;
      playSound('wrong');
      haptic('warning');
      this.shake += 6;
      node.ring = 0.6;

      if (this.level.maxMistakes != null && this.mistakes > this.level.maxMistakes) {
        if (isFirst) this.failQueued = 'Too many mistakes.';
        else {
          this.finish('lost', 'Too many mistakes.');
          return;
        }
      }
    }

    if (this.level.maxTaps && this.tapsUsed > this.level.maxTaps) {
      this.failQueued = this.failQueued ?? 'Out of taps.';
    }
    this.emitHud();
  }

  private pickNode(px: number, py: number): ChainNode | null {
    const r = hitRadius(this.board);
    let best: ChainNode | null = null;
    let bestD = r;
    for (const n of this.nodes) {
      if (n.type === 'fake' && n.state === 'dead') continue;
      const p = toPx(this.board, n.nx, n.ny);
      const d = Math.hypot(px - p.x, py - p.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  // --- simulation -----------------------------------------------------

  private beginRun(): void {
    this.status = 'running';
    this.time = 0;
    this.lastActivity = this.clock;
    this.cb.onStatus?.('running');
  }

  private activate(node: ChainNode, viaExplosion = false): void {
    if (node.state === 'active') return;
    if (node.type === 'bomb') {
      node.revealed = true;
      this.finish('lost', 'The chain hit a bomb.');
      return;
    }
    node.state = 'active';
    node.pop = 0;
    node.ring = 1;
    this.activatedCount += 1;
    this.lastActivity = this.clock;

    const [x, y] = this.px(node);
    this.particles.burst(x, y, {
      count: node.type === 'explosive' ? 34 : 18,
      speed: node.type === 'explosive' ? 300 : 190,
      color: node.color,
      life: 0.7,
      glow: true,
    });
    playSound(node.type === 'explosive' ? 'explode' : 'activate');
    haptic('light');
    this.shake += node.type === 'explosive' ? 14 : 4;

    if (node.type === 'multiplier') {
      this.particles.burst(x, y, { count: 20, speed: 120, color: '#ffffff', life: 0.9 });
    }

    // schedule outward propagation
    const delay = node.type === 'delay' ? (node.def.delayMs ?? 900) / 1000 : 0.06;
    if (node.type === 'delay') node.state = 'active';
    this.schedule(delay, () => this.propagate(node));

    if (node.type === 'explosive' && !viaExplosion) {
      this.schedule(0.12, () => this.explode(node));
    }

    this.checkEnd();
  }

  private propagate(node: ChainNode): void {
    if (node.fired) return;
    node.fired = true;

    const list =
      node.type === 'reverse'
        ? (this.incoming.get(node.id) ?? [])
        : (this.outgoing.get(node.id) ?? []);

    for (const edge of list) {
      if (edge.fake) continue;
      const target = node.type === 'reverse' ? edge.from : edge.to;
      const a = node.pos();
      const b = target.pos();
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const dur = Math.max(0.18, dist / PULSE_SPEED);
      this.pulses.push(
        new Pulse(node, target, edge, dur, node.type === 'reverse' ? 'reverse' : 'forward'),
      );
      if (node.type === 'multiplier') {
        this.pulses.push(new Pulse(node, target, edge, dur * 1.15, 'forward'));
      }
      this.lastActivity = this.clock;
      playSound('energy');
    }
  }

  private explode(node: ChainNode): void {
    const radius = node.def.radius ?? 0.22;
    const src = node.pos();
    for (const other of this.nodes) {
      if (other === node || other.state === 'active' || other.type === 'bomb') continue;
      const p = other.pos();
      if (Math.hypot(p.x - src.x, p.y - src.y) <= radius) {
        this.activate(other, true);
        this.schedule(0.02, () => this.propagate(other));
      }
    }
    const [x, y] = this.px(node);
    this.particles.burst(x, y, { count: 26, speed: 360, color: node.color, life: 0.9 });
    this.shake += 10;
  }

  private onPulseArrive(p: Pulse): void {
    if (p.edge) {
      p.edge.traversed = true;
      p.edge.glow = 1;
    }
    const target = p.to;
    if (target.type === 'bomb') {
      target.revealed = true;
      this.finish('lost', 'The chain hit a bomb.');
      return;
    }
    if (target.state === 'active') return;

    if (target.type === 'merger') {
      target.received += 1;
      target.ring = 0.5;
      if (target.received >= Math.max(1, target.incoming)) {
        this.activate(target);
      } else {
        target.state = 'charging';
        playSound('energy');
      }
      return;
    }

    if (target.type === 'fake') {
      // energy dies here - a fake link leads nowhere
      target.revealed = true;
      const [x, y] = this.px(target);
      this.particles.burst(x, y, { count: 8, speed: 90, color: '#ff5a6a', life: 0.5 });
      return;
    }

    this.activate(target);
  }

  private schedule(delay: number, fn: () => void): void {
    this.scheduled.push({ at: this.clock + Math.max(0, delay), fn });
  }

  private frame(dt: number): void {
    if (!this.paused) this.update(dt);
    this.render();
  }

  private update(dt: number): void {
    this.clock += dt;
    if (this.status === 'running') this.time += dt;

    // scheduled events
    if (this.scheduled.length) {
      const due = this.scheduled.filter((s) => s.at <= this.clock);
      this.scheduled = this.scheduled.filter((s) => s.at > this.clock);
      for (const s of due) s.fn();
    }

    // node motion + animation
    for (const n of this.nodes) {
      if (this.status !== 'won' && this.status !== 'lost') n.updateMotion(dt);
      n.updateAnim(dt);
    }

    // pulses
    if (this.pulses.length) {
      for (const p of this.pulses) {
        p.update(dt);
        const h = p.head();
        const hp = toPx(this.board, h.x, h.y);
        if (!this.opts.reducedMotion && Math.random() < 0.6) {
          this.particles.trail(hp.x, hp.y, p.color);
        }
      }
      const arrived = this.pulses.filter((p) => p.done);
      this.pulses = this.pulses.filter((p) => !p.done);
      for (const p of arrived) this.onPulseArrive(p);
    }

    // edge glow decay
    for (const e of this.edges) if (e.glow > 0) e.glow = Math.max(0, e.glow - dt * 1.5);

    this.particles.update(dt);

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 60);

    // fail / win evaluation
    if (this.status === 'running' || this.status === 'ready') this.checkEnd();

    // hud
    this.hudAccum += dt;
    if (this.hudAccum >= 0.1) {
      this.hudAccum = 0;
      this.emitHud();
    }
  }

  private checkEnd(): void {
    if (this.status === 'won' || this.status === 'lost') return;

    // win?
    const required = this.nodes.filter((n) => n.required);
    const allActive = required.length > 0 && required.every((n) => n.state === 'active');
    if (allActive && this.pulses.length === 0) {
      this.finish('won');
      return;
    }

    if (this.status === 'ready') {
      if (this.failQueued) this.finish('lost', this.failQueued);
      return;
    }

    // time limit
    if (this.level.timeLimit && this.time > this.level.timeLimit) {
      this.finish('lost', 'Out of time.');
      return;
    }
    // per-node timer
    for (const n of this.nodes) {
      if (n.type === 'timer' && n.state !== 'active') {
        const limit = n.def.before ?? this.level.timeLimit ?? Infinity;
        if (this.time > limit) {
          this.finish('lost', 'A timer ran out.');
          return;
        }
      }
    }

    const quiet =
      this.pulses.length === 0 &&
      this.scheduled.length === 0 &&
      this.clock - this.lastActivity > SETTLE_DELAY;

    if (quiet) {
      if (allActive) {
        this.finish('won');
      } else if (this.failQueued) {
        this.finish('lost', this.failQueued);
      } else {
        this.finish('lost', 'The chain broke.');
      }
    }
  }

  private finish(status: 'won' | 'lost', reason?: string): void {
    if (this.status === 'won' || this.status === 'lost') return;
    this.status = status;
    this.cb.onStatus?.(status);

    if (status === 'won') {
      playSound('complete');
      haptic('success');
      // celebratory bursts from every active node
      for (const n of this.nodes) {
        if (n.state === 'active') {
          const [x, y] = this.px(n);
          this.particles.burst(x, y, { count: 22, speed: 260, color: n.color, life: 1.1 });
        }
      }
      this.shake += 8;
    } else {
      playSound('broken');
      haptic('error');
      this.shake += 12;
      for (const n of this.nodes) if (n.type === 'fake') n.revealed = true;
    }

    const result: EngineResult = {
      status,
      timeSec: this.time,
      mistakes: this.mistakes,
      tapsUsed: this.tapsUsed,
      reason,
    };
    this.emitHud();
    this.cb.onResult?.(result);
  }

  // --- helpers -------------------------------------------------------

  private px(n: ChainNode): [number, number] {
    const p = toPx(this.board, n.nx, n.ny);
    return [p.x, p.y];
  }

  private emitHud(): void {
    const hud: EngineHud = {
      timeSec: this.time,
      tapsUsed: this.tapsUsed,
      maxTaps: this.level.maxTaps,
      maxMistakes: this.level.maxMistakes,
      timeLimit: this.level.timeLimit,
      mistakes: this.mistakes,
      activated: this.activatedCount,
      required: this.nodes.filter((n) => n.required).length,
    };
    this.cb.onHud?.(hud);
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.save();
    if (this.shake > 0 && !this.opts.reducedMotion) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    drawScene({
      ctx,
      board: this.board,
      canvasW: this.canvas.width,
      canvasH: this.canvas.height,
      nodes: this.nodes,
      edges: this.edges,
      pulses: this.pulses,
      particles: this.particles,
      status: this.status,
      time: this.clock,
      hintLevel: this.hintLevel,
      reduced: !!this.opts.reducedMotion,
    });
    ctx.restore();
  }

  get chainLength(): number {
    return this.activatedCount;
  }
  get currentStatus(): EngineStatus {
    return this.status;
  }
}
