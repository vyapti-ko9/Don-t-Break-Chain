// Maps normalized level coordinates (0..1) to device pixels on a centered,
// fixed-aspect play area so every phone/tablet shows the same layout.

export interface Board {
  x: number;
  y: number;
  w: number;
  h: number;
  /** device pixels per normalized unit on the shorter axis */
  scale: number;
}

const ASPECT = 0.82; // width / height of the logical play field
const PAD = 0.08; // fraction of the smaller canvas dimension

export function computeBoard(canvasW: number, canvasH: number): Board {
  const padX = canvasW * PAD;
  const padY = canvasH * PAD;
  let w = canvasW - padX * 2;
  let h = canvasH - padY * 2;
  if (w / h > ASPECT) w = h * ASPECT;
  else h = w / ASPECT;
  const x = (canvasW - w) / 2;
  const y = (canvasH - h) / 2;
  return { x, y, w, h, scale: Math.min(w, h) };
}

export function toPx(board: Board, nx: number, ny: number): { x: number; y: number } {
  return { x: board.x + nx * board.w, y: board.y + ny * board.h };
}

export function nodeRadius(board: Board): number {
  return board.scale * 0.062;
}

/** generous hit radius so tapping never needs precision */
export function hitRadius(board: Board): number {
  return board.scale * 0.11;
}
