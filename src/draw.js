import { CONTOURS } from './landmarker.js';
import { IDX } from './analyze.js';

export function drawMesh(ctx, landmarks, w, h, color = 'rgba(120, 220, 255, 0.75)') {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, w / 600);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const { start, end } of CONTOURS) {
    const a = landmarks[start];
    const b = landmarks[end];
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
  }
  ctx.stroke();
}

/** Thin vertical midline, drawn live so you can see your symmetry axis. */
export function drawMidline(ctx, landmarks, w, h) {
  const a = landmarks[IDX.top];
  const b = landmarks[IDX.chin];
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.8)';
  ctx.lineWidth = Math.max(1, w / 600);
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(a.x * w, a.y * h);
  ctx.lineTo(b.x * w, b.y * h);
  ctx.stroke();
  ctx.setLineDash([]);
}

const MEASURE_LINES = [
  { from: IDX.top, to: IDX.chin, color: '#ffd166' },
  { from: IDX.foreheadL, to: IDX.foreheadR, color: '#06d6a0' },
  { from: IDX.cheekL, to: IDX.cheekR, color: '#ef476f' },
  { from: IDX.jawL, to: IDX.jawR, color: '#4cc9f0' },
  { from: IDX.eyeInnerL, to: IDX.eyeInnerR, color: '#c77dff' },
];

export const LEGEND = [
  ['#ffd166', 'Face length'],
  ['#06d6a0', 'Forehead width'],
  ['#ef476f', 'Cheekbone width'],
  ['#4cc9f0', 'Jaw width'],
  ['#c77dff', 'Eye gap'],
];

export function drawMeasurements(ctx, landmarks, w, h) {
  const lw = Math.max(2, w / 400);
  ctx.lineWidth = lw;
  for (const { from, to, color } of MEASURE_LINES) {
    const a = landmarks[from];
    const b = landmarks[to];
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
    ctx.stroke();
    for (const p of [a, b]) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, lw * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Facial-thirds guide lines.
  ctx.setLineDash([lw * 3, lw * 3]);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  const x1 = landmarks[IDX.cheekL].x * w - w * 0.03;
  const x2 = landmarks[IDX.cheekR].x * w + w * 0.03;
  for (const i of [IDX.top, IDX.glabella, IDX.subnasale, IDX.chin]) {
    const y = landmarks[i].y * h;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}
