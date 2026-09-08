import type { Board } from './board';
import { nodeRadius, toPx } from './board';
import type { ChainNode } from '../objects/ChainNode';
import type { ChainConnection, Pulse } from '../objects/ChainConnection';
import type { ParticleSystem } from './Particles';

export interface RenderScene {
  ctx: CanvasRenderingContext2D;
  board: Board;
  canvasW: number;
  canvasH: number;
  nodes: ChainNode[];
  edges: ChainConnection[];
  pulses: Pulse[];
  particles: ParticleSystem;
  status: 'ready' | 'running' | 'won' | 'lost';
  time: number;
  hintLevel: number; // 0..3, 3 reveals hidden edges + highlights starts
  reduced: boolean;
}

export function drawScene(s: RenderScene): void {
  const { ctx, canvasW, canvasH } = s;
  ctx.clearRect(0, 0, canvasW, canvasH);
  drawBackground(s);
  drawEdges(s);
  drawPulses(s);
  s.particles.render(ctx);
  drawNodes(s);
}

function drawBackground(s: RenderScene): void {
  const { ctx, canvasW, canvasH } = s;
  const g = ctx.createLinearGradient(0, 0, 0, canvasH);
  g.addColorStop(0, '#0c0e18');
  g.addColorStop(1, '#070810');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (!s.reduced) {
    // faint dot grid
    const step = s.board.scale * 0.14;
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let x = s.board.x; x < s.board.x + s.board.w; x += step) {
      for (let y = s.board.y; y < s.board.y + s.board.h; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // vignette
  const r = Math.max(canvasW, canvasH);
  const v = ctx.createRadialGradient(canvasW / 2, canvasH / 2, r * 0.3, canvasW / 2, canvasH / 2, r * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, canvasW, canvasH);
}

function drawEdges(s: RenderScene): void {
  const { ctx, board } = s;
  for (const e of s.edges) {
    const visible = !e.hidden || e.traversed || s.hintLevel >= 3;
    if (!visible) continue;
    const a = toPx(board, e.from.nx, e.from.ny);
    const b = toPx(board, e.to.nx, e.to.ny);
    const w = board.scale * 0.012;

    ctx.save();
    ctx.lineCap = 'round';
    if (e.fake && (e.from.revealed || e.to.revealed || s.status === 'lost')) {
      ctx.setLineDash([board.scale * 0.02, board.scale * 0.03]);
      ctx.strokeStyle = 'rgba(255,90,106,0.35)';
    } else if (e.hidden && !e.traversed) {
      ctx.setLineDash([board.scale * 0.015, board.scale * 0.02]);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    }
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    if (e.glow > 0) {
      ctx.setLineDash([]);
      ctx.strokeStyle = withAlpha(e.from.color, 0.5 * e.glow);
      ctx.lineWidth = w * 2.4;
      ctx.shadowColor = e.from.color;
      ctx.shadowBlur = 16 * e.glow;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();

    // direction arrow
    if (!e.fake && (!e.hidden || e.traversed)) {
      drawArrow(ctx, a, b, nodeRadius(board), withAlpha('#ffffff', 0.25), board.scale * 0.02);
    }
  }
}

function drawPulses(s: RenderScene): void {
  const { ctx, board } = s;
  for (const p of s.pulses) {
    const a = toPx(board, p.from.nx, p.from.ny);
    const h = p.head();
    const hp = toPx(board, h.x, h.y);
    const grad = ctx.createLinearGradient(a.x, a.y, hp.x, hp.y);
    grad.addColorStop(0, withAlpha(p.color, 0));
    grad.addColorStop(1, withAlpha(p.color, 0.9));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = grad;
    ctx.lineWidth = board.scale * 0.02;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(hp.x, hp.y);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, board.scale * 0.022, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawNodes(s: RenderScene): void {
  const { ctx, board, time } = s;
  const R = nodeRadius(board);
  for (const n of s.nodes) {
    const p = toPx(board, n.nx, n.ny);
    const active = n.state === 'active';
    const ghost = (n.type === 'fake' && (n.revealed || s.status === 'lost')) || n.state === 'dead';

    // start-node hint pulse
    if (s.status === 'ready' && n.isStart && s.hintLevel >= 3 && !s.reduced) {
      const pr = 1 + Math.sin(time * 4) * 0.12;
      ctx.save();
      ctx.strokeStyle = withAlpha('#00e6c3', 0.8);
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00e6c3';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R * 1.5 * pr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // activation ring
    if (n.ring > 0 && !s.reduced) {
      ctx.save();
      const rr = R + (1 - n.ring) * R * 3.4;
      ctx.strokeStyle = withAlpha(n.color, n.ring * 0.7);
      ctx.lineWidth = R * 0.35 * n.ring;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const scale = active ? 1 + n.pop * 0.12 - (n.pop === 1 ? 0 : 0) : 1;
    const pulse = active && !s.reduced ? 1 + Math.sin(time * 6) * 0.04 : 1;
    const rad = R * scale * pulse;

    ctx.save();
    if (ghost) ctx.globalAlpha = 0.28;

    // glow
    if (active) {
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 26;
    } else if (n.state === 'charging') {
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 12;
    }

    // body
    const body = ctx.createRadialGradient(p.x - rad * 0.3, p.y - rad * 0.3, rad * 0.2, p.x, p.y, rad);
    if (active) {
      body.addColorStop(0, '#ffffff');
      body.addColorStop(0.35, lighten(n.color));
      body.addColorStop(1, n.color);
    } else {
      body.addColorStop(0, withAlpha(n.color, 0.55));
      body.addColorStop(1, withAlpha(n.color, 0.12));
    }
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fill();

    // rim
    ctx.shadowBlur = 0;
    ctx.strokeStyle = active ? '#ffffff' : withAlpha(n.color, 0.7);
    ctx.lineWidth = board.scale * 0.008;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.stroke();

    drawGlyph(ctx, n, p.x, p.y, rad, time);
    ctx.restore();
  }
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  n: ChainNode,
  x: number,
  y: number,
  r: number,
  time: number,
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = r * 0.12;
  ctx.lineCap = 'round';
  const g = r * 0.42;
  switch (n.type) {
    case 'delay': {
      ctx.beginPath();
      ctx.arc(x, y, g, -Math.PI / 2, -Math.PI / 2 + (time % 2) * Math.PI);
      ctx.stroke();
      break;
    }
    case 'explosive': {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * g * 0.5, y + Math.sin(a) * g * 0.5);
        ctx.lineTo(x + Math.cos(a) * g * 1.15, y + Math.sin(a) * g * 1.15);
        ctx.stroke();
      }
      break;
    }
    case 'splitter': {
      ctx.beginPath();
      ctx.moveTo(x - g, y);
      ctx.lineTo(x, y);
      ctx.moveTo(x, y - g * 0.7);
      ctx.lineTo(x + g, y - g);
      ctx.moveTo(x, y + g * 0.7);
      ctx.lineTo(x + g, y + g);
      ctx.stroke();
      break;
    }
    case 'merger': {
      ctx.strokeRect(x - g * 0.75, y - g * 0.75, g * 1.5, g * 1.5);
      if (n.incoming > 0) {
        ctx.font = `${r * 0.6}px 'Baloo 2', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${n.received}/${n.incoming}`, x, y + r * 0.02);
      }
      break;
    }
    case 'timer': {
      ctx.beginPath();
      ctx.arc(x, y, g, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - g * 0.8);
      ctx.moveTo(x, y);
      ctx.lineTo(x + g * 0.5, y);
      ctx.stroke();
      break;
    }
    case 'moving': {
      ctx.beginPath();
      ctx.arc(x, y, g * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - g, y);
      ctx.lineTo(x - g * 1.5, y);
      ctx.moveTo(x + g, y);
      ctx.lineTo(x + g * 1.5, y);
      ctx.stroke();
      break;
    }
    case 'fake': {
      if (n.revealed) {
        ctx.beginPath();
        ctx.moveTo(x - g, y - g);
        ctx.lineTo(x + g, y + g);
        ctx.moveTo(x + g, y - g);
        ctx.lineTo(x - g, y + g);
        ctx.stroke();
      }
      break;
    }
    case 'reverse': {
      ctx.beginPath();
      ctx.moveTo(x + g, y - g * 0.5);
      ctx.lineTo(x - g, y - g * 0.5);
      ctx.lineTo(x - g * 0.3, y - g);
      ctx.moveTo(x - g, y - g * 0.5);
      ctx.lineTo(x - g * 0.3, y);
      ctx.stroke();
      break;
    }
    case 'bomb': {
      ctx.font = `${r * 0.9}px 'Baloo 2', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', x, y + r * 0.04);
      break;
    }
    case 'multiplier': {
      ctx.font = `${r * 0.62}px 'Baloo 2', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('×2', x, y + r * 0.03);
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  a: { x: number; y: number },
  b: { x: number; y: number },
  pad: number,
  color: string,
  size: number,
): void {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  void pad;
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size, -size * 0.8);
  ctx.lineTo(-size, size * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// --- color helpers ---------------------------------------------------------

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function withAlpha(hex: string, a: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function lighten(hex: string): string {
  const [r, g, b] = parseHex(hex);
  const f = 0.45;
  return `rgb(${Math.round(r + (255 - r) * f)},${Math.round(g + (255 - g) * f)},${Math.round(
    b + (255 - b) * f,
  )})`;
}
