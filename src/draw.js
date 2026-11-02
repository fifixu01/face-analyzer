import { CONTOURS } from './landmarker.js';
import { IDX } from './analyze.js';

// ~60 landmarks for a low-poly wireframe across the face (visual only).
const SPARSE_POINTS = [
  // face outline (every other point of the oval)
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
  // forehead
  151, 108, 337, 69, 299,
  // brows
  70, 105, 107, 336, 334, 300,
  // eyes
  33, 159, 133, 145, 362, 386, 263, 374,
  // nose
  168, 6, 197, 4, 1, 98, 327, 2,
  // cheeks
  117, 346, 50, 280, 205, 425, 123, 352,
  // mouth and chin
  61, 0, 291, 17, 199,
];

let sparseEdges = null;

/** Delaunay triangulation (Bowyer–Watson) of the sparse points, returned as landmark-index edges. */
function triangulate(landmarks, w, h) {
  const pts = SPARSE_POINTS.map((i) => ({ i, x: landmarks[i].x * w, y: landmarks[i].y * h }));
  const big = 1e5;
  const sup = [{ x: -big, y: -big }, { x: big, y: -big }, { x: 0, y: big }];
  const circum = (a, b, c) => {
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    const ux = ((a.x ** 2 + a.y ** 2) * (b.y - c.y) + (b.x ** 2 + b.y ** 2) * (c.y - a.y) + (c.x ** 2 + c.y ** 2) * (a.y - b.y)) / d;
    const uy = ((a.x ** 2 + a.y ** 2) * (c.x - b.x) + (b.x ** 2 + b.y ** 2) * (a.x - c.x) + (c.x ** 2 + c.y ** 2) * (b.x - a.x)) / d;
    return { x: ux, y: uy, r2: (a.x - ux) ** 2 + (a.y - uy) ** 2 };
  };
  const tri = (a, b, c) => ({ v: [a, b, c], c: circum(a, b, c) });
  let tris = [tri(...sup)];
  for (const p of pts) {
    const bad = tris.filter((t) => (p.x - t.c.x) ** 2 + (p.y - t.c.y) ** 2 < t.c.r2);
    const edges = [];
    for (const t of bad) {
      for (let k = 0; k < 3; k++) {
        const e = [t.v[k], t.v[(k + 1) % 3]];
        const dup = edges.findIndex((f) => (f[0] === e[1] && f[1] === e[0]) || (f[0] === e[0] && f[1] === e[1]));
        if (dup >= 0) edges.splice(dup, 1);
        else edges.push(e);
      }
    }
    tris = tris.filter((t) => !bad.includes(t));
    for (const [a, b] of edges) tris.push(tri(a, b, p));
  }
  const seen = new Set();
  const out = [];
  for (const t of tris) {
    if (t.v.some((v) => sup.includes(v))) continue;
    for (let k = 0; k < 3; k++) {
      const a = t.v[k].i;
      const b = t.v[(k + 1) % 3].i;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push([a, b]);
      }
    }
  }
  return out;
}

function strokeEdges(ctx, landmarks, w, h, edges) {
  ctx.beginPath();
  for (const [s, e] of edges) {
    ctx.moveTo(landmarks[s].x * w, landmarks[s].y * h);
    ctx.lineTo(landmarks[e].x * w, landmarks[e].y * h);
  }
  ctx.stroke();
}

export function drawMesh(ctx, landmarks, w, h) {
  // Triangulate once from the first face seen, then reuse so the lines don't reshuffle every frame.
  sparseEdges ??= triangulate(landmarks, w, h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.strokeStyle = 'rgba(120, 220, 255, 0.35)';
  ctx.lineWidth = Math.max(1, w / 900);
  strokeEdges(ctx, landmarks, w, h, sparseEdges);

  ctx.strokeStyle = 'rgba(120, 220, 255, 0.8)';
  ctx.lineWidth = Math.max(1.5, w / 600);
  strokeEdges(ctx, landmarks, w, h, CONTOURS.map(({ start, end }) => [start, end]));
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
