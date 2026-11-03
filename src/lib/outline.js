// Face-outline width profile and face-shape matching.
//
// Instead of a few hand-picked landmark pairs, this walks MediaPipe's 36-point face-oval contour
// and measures the face's width at many heights from the top of the mesh to the chin. Shapes are
// then matched against that profile.

// The face-oval contour, split into its two sides. Both run from the top of the mesh (10) to the chin (152).
export const SIDE_A = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152];
export const SIDE_B = [10, 109, 67, 103, 54, 21, 162, 127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152];
export const OUTLINE_POINTS = [...SIDE_A, ...SIDE_B.slice(1, -1)];

// Heights where widths are sampled, as a fraction of the way from the top of the mesh (0) to the chin (1).
const STEPS = Array.from({ length: 19 }, (_, i) => 0.05 * (i + 1));

// Levels used for the named widths.
export const LEVELS = { forehead: 0.15, midface: 0.65, jaw: 0.8, chin: 0.9 };

/**
 * "Typical" value and spread for each outline feature. Shapes are defined as departures from these.
 * ROUGH ESTIMATES: tune them with real results (aim for the average person landing on Oval).
 */
const TYPICAL = {
  length: { mean: 1.08, spread: 0.06 }, // mesh top-to-chin length / widest width
  forehead: { mean: 0.8, spread: 0.04 }, // widths below are a share of the widest width
  midface: { mean: 0.88, spread: 0.04 },
  jaw: { mean: 0.74, spread: 0.04 },
  chin: { mean: 0.42, spread: 0.05 },
};

// Each shape's outline, in "spreads away from typical". 0 = typical.
const SHAPES = {
  Oval: { length: 0.4, forehead: 0, midface: 0, jaw: 0, chin: 0 },
  Round: { length: -1.4, forehead: 0, midface: 0.8, jaw: 0.6, chin: 0.6 },
  Square: { length: -0.8, forehead: 0.7, midface: 1.1, jaw: 1.4, chin: 1 },
  Oblong: { length: 1.7, forehead: 0.3, midface: 0.7, jaw: 0.4, chin: 0 },
  Heart: { length: 0, forehead: 1.2, midface: -0.3, jaw: -1.1, chin: -1 },
  Diamond: { length: 0.2, forehead: -1.4, midface: 0, jaw: -0.8, chin: -0.5 },
};
const WEIGHTS = { length: 1.2, forehead: 1, midface: 0.6, jaw: 1.2, chin: 0.8 };

/** Rotates landmarks (normalized) into pixel space with the eyes level. Returns an inverse for drawing. */
function level(landmarks, w, h) {
  const px = landmarks.map((p) => ({ x: p.x * w, y: p.y * h }));
  const a = px[33];
  const b = px[263];
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const rot = (p, t) => ({
    x: cx + (p.x - cx) * Math.cos(t) - (p.y - cy) * Math.sin(t),
    y: cy + (p.x - cx) * Math.sin(t) + (p.y - cy) * Math.cos(t),
  });
  return { pts: px.map((p) => rot(p, -angle)), unlevel: (p) => rot(p, angle) };
}

/** x where a side of the contour crosses height y (linear between contour points). */
function sideX(pts, side, y) {
  for (let i = 0; i < side.length - 1; i++) {
    const a = pts[side[i]];
    const b = pts[side[i + 1]];
    if ((a.y <= y && y <= b.y) || (b.y <= y && y <= a.y)) {
      const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
      return a.x + t * (b.x - a.x);
    }
  }
  return null;
}

function profileFrom(pts) {
  const top = pts[10].y;
  const span = pts[152].y - top;
  const rows = STEPS.map((t) => {
    const y = top + t * span;
    const xa = sideX(pts, SIDE_A, y);
    const xb = sideX(pts, SIDE_B, y);
    return { t, y, xa, xb, width: xa == null || xb == null ? 0 : Math.abs(xa - xb) };
  });
  const widest = rows.reduce((m, r) => (r.width > m.width ? r : m), rows[0]);
  return { rows, widest, span };
}

const at = (rows, t) => rows.reduce((best, r) => (Math.abs(r.t - t) < Math.abs(best.t - t) ? r : best), rows[0]);

/** Flat outline metrics (all scale-free). */
export function outlineMetrics(landmarks, w, h) {
  const { rows, widest, span } = profileFrom(level(landmarks, w, h).pts);
  const W = widest.width || 1;
  return {
    outlineLength: span / W,
    outlineForehead: at(rows, LEVELS.forehead).width / W,
    outlineMidface: at(rows, LEVELS.midface).width / W,
    outlineJaw: at(rows, LEVELS.jaw).width / W,
    outlineChin: at(rows, LEVELS.chin).width / W,
    outlineWidestAt: widest.t,
  };
}

/** Scores every shape. Returns them best-first with a match share (0-1, sums to 1). */
export function faceShape(m) {
  const z = {
    length: m.outlineLength,
    forehead: m.outlineForehead,
    midface: m.outlineMidface,
    jaw: m.outlineJaw,
    chin: m.outlineChin,
  };
  for (const k of Object.keys(z)) {
    z[k] = Math.max(-3, Math.min(3, (z[k] - TYPICAL[k].mean) / TYPICAL[k].spread));
  }
  const scored = Object.entries(SHAPES).map(([name, p]) => {
    const d = Object.keys(WEIGHTS).reduce((s, k) => s + WEIGHTS[k] * (z[k] - p[k]) ** 2, 0);
    return { name, fit: Math.exp(-d / 2) };
  });
  const total = scored.reduce((s, x) => s + x.fit, 0) || 1;
  const matches = scored.map(({ name, fit }) => ({ name, share: fit / total })).sort((a, b) => b.share - a.share);
  return { best: matches[0].name, runnerUp: matches[1].name, matches };
}

/**
 * Pixel-space guides for drawing: the outline points and the four named width lines.
 * Returns null if the landmarks don't include the full contour.
 */
export function outlineGuides(landmarks, w, h) {
  if (OUTLINE_POINTS.some((i) => !landmarks[i])) return null;
  const { pts, unlevel } = level(landmarks, w, h);
  const { rows, widest } = profileFrom(pts);
  const line = (r) => (r.xa == null || r.xb == null ? null : [unlevel({ x: r.xa, y: r.y }), unlevel({ x: r.xb, y: r.y })]);
  return {
    points: OUTLINE_POINTS.map((i) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h })),
    samples: rows.flatMap((r) => line(r) ?? []),
    lines: {
      forehead: line(at(rows, LEVELS.forehead)),
      cheekbones: line(widest),
      jaw: line(at(rows, LEVELS.jaw)),
      chin: line(at(rows, LEVELS.chin)),
    },
  };
}
