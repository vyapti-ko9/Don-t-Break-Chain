// requestAnimationFrame loop with clamped delta time. Frame-rate independent:
// consumers integrate using `dt` (seconds).

export class GameLoop {
  private rafId = 0;
  private last = 0;
  private running = false;
  private readonly step: (dt: number, elapsed: number) => void;
  private elapsed = 0;

  constructor(step: (dt: number, elapsed: number) => void) {
    this.step = step;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      let dt = (now - this.last) / 1000;
      this.last = now;
      // clamp: tab-switch / long stalls should not fast-forward physics
      if (dt > 0.05) dt = 0.05;
      if (dt < 0) dt = 0;
      this.elapsed += dt;
      this.step(dt, this.elapsed);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  get isRunning(): boolean {
    return this.running;
  }
}
