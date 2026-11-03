// Detailed eye, brow, nose and lip measurements from the full landmark contours.
//
// Input: landmarks already rotated so the eyes are level, in pixels, with y pointing down.
// Everything is measured from the front view only. All outputs are scale-free.
//
// Contour indices come from MediaPipe's FACE_LANDMARKS_* connection sets. "R" is the subject's
// right side (the left of an unmirrored photo).

const EYES = [
  { outer: 33, inner: 133, upper: [33, 246, 161, 160, 159, 158, 157, 173, 133], lower: [33, 7, 163, 144, 145, 153, 154, 155, 133], iris: [468, 469, 470, 471, 472] },
  { outer: 263, inner: 362, upper: [263, 466, 388, 387, 386, 385, 384, 398, 362], lower: [263, 249, 390, 373, 374, 380, 381, 382, 362], iris: [473, 474, 475, 476, 477] },
];
// Brow contours run tail (outer end) to head (inner end).
const BROWS = [
  { upper: [70, 63, 105, 66, 107], lower: [46, 53, 52, 65, 55] },
  { upper: [300, 293, 334, 296, 336], lower: [276, 283, 282, 295, 285] },
];
const NOSE = {
  nasion: 168, subnasale: 2,
  alaR: 129, alaL: 358, // outer edges of the nostril wings (widest point of the lower nose)
  tipR: 45, tipL: 275, // sides of the tip
  bridgeR: 122, bridgeL: 351, // sides of the upper bridge
};
const LIPS = { cornerR: 61, cornerL: 291, top: 0, peakR: 37, peakL: 267, upperInner: 13, lowerInner: 14, bottom: 17 };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const deg = (rad) => (rad * 180) / Math.PI;

/** Signed distance of p from the line a→b, positive on the side "above" (smaller y) for a left-to-right line. */
function heightAbove(p, a, b) {
  const t = (p.x - a.x) / (b.x - a.x || 1e-6);
  return a.y + t * (b.y - a.y) - p.y;
}

/** Where along a→b (0..1) the contour peaks, refined with a parabola through the top three points. */
function peakPosition(points, a, b) {
  const h = points.map((p) => heightAbove(p, a, b));
  let i = h.indexOf(Math.max(...h));
  i = Math.min(Math.max(i, 1), h.length - 2);
  const denom = h[i - 1] - 2 * h[i] + h[i + 1];
  const shift = denom === 0 ? 0 : Math.max(-0.5, Math.min(0.5, (0.5 * (h[i - 1] - h[i + 1])) / denom));
  const x0 = points[i].x + shift * (shift > 0 ? points[i + 1].x - points[i].x : points[i].x - points[i - 1].x);
  return { pos: (x0 - a.x) / (b.x - a.x || 1e-6), height: Math.max(...h) };
}

/** y of a contour at a given x (linear between points). */
function yAtX(points, x) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if ((a.x - x) * (b.x - x) <= 0) return a.y + ((x - a.x) / (b.x - a.x || 1e-6)) * (b.y - a.y);
  }
  return null;
}

function eye(P, e) {
  const outer = P[e.outer];
  const inner = P[e.inner];
  const width = dist(outer, inner);
  const upper = e.upper.map((i) => P[i]);
  const lower = e.lower.map((i) => P[i]);
  // Measure from the inner corner toward the outer corner so "position" means the same on both eyes.
  const up = peakPosition([...upper].reverse(), inner, outer);
  const low = Math.max(...lower.map((p) => -heightAbove(p, inner, outer)));
  const opening = Math.max(...upper.slice(1, -1).map((p, i) => dist(p, lower[i + 1])));

  let iris = null;
  if (P[e.iris[4]]) {
    const c = P[e.iris[0]];
    const d = (dist(P[e.iris[1]], P[e.iris[3]]) + dist(P[e.iris[2]], P[e.iris[4]])) / 2;
    const lidBelow = yAtX(lower, c.x);
    const lidAbove = yAtX(upper, c.x);
    iris = {
      size: d / width,
      // Positive = white visible between the iris and the lid.
      whiteBelow: lidBelow == null ? 0 : (lidBelow - (c.y + d / 2)) / d,
      whiteAbove: lidAbove == null ? 0 : (c.y - d / 2 - lidAbove) / d,
    };
  }
  return {
    width,
    aspect: opening / width,
    upperArc: up.height / width,
    lowerArc: low / width,
    lidPeak: up.pos,
    // Outer corner above inner corner = positive.
    tilt: deg(Math.atan2(inner.y - outer.y, Math.abs(inner.x - outer.x))),
    iris,
  };
}

function brow(P, b, eyeWidth) {
  const upper = b.upper.map((i) => P[i]);
  const lower = b.lower.map((i) => P[i]);
  const tail = { x: (upper[0].x + lower[0].x) / 2, y: (upper[0].y + lower[0].y) / 2 };
  const head = { x: (upper.at(-1).x + lower.at(-1).x) / 2, y: (upper.at(-1).y + lower.at(-1).y) / 2 };
  const length = dist(head, tail);
  // Measure head → tail so the peak position reads the same on both sides.
  const peak = peakPosition([...upper].reverse(), upper.at(-1), upper[0]);
  return {
    arch: peak.height / length,
    peak: peak.pos,
    tilt: deg(Math.atan2(head.y - tail.y, Math.abs(tail.x - head.x))),
    thickness: mean(upper.map((p, i) => dist(p, lower[i]))) / eyeWidth,
  };
}

export function featureMetrics(P) {
  const eyes = EYES.map((e) => eye(P, e));
  const eyeWidth = mean(eyes.map((e) => e.width));
  const brows = BROWS.map((b) => brow(P, b, eyeWidth));
  const avg = (list, key) => mean(list.map((x) => x[key]));
  const irises = eyes.map((e) => e.iris).filter(Boolean);

  // Nose
  const n = (k) => P[NOSE[k]];
  const alarWidth = dist(n('alaR'), n('alaL'));
  const noseLength = n('subnasale').y - n('nasion').y;
  const meshLength = P[152].y - P[10].y;

  // Lips
  const l = (k) => P[LIPS[k]];
  const mouthWidth = dist(l('cornerR'), l('cornerL'));
  const upperLip = l('upperInner').y - l('top').y;
  const peaksY = (l('peakR').y + l('peakL').y) / 2;
  const lipLineY = (l('upperInner').y + l('lowerInner').y) / 2;
  const cornersY = (l('cornerR').y + l('cornerL').y) / 2;

  return {
    eyeAspect: avg(eyes, 'aspect'),
    eyeUpperArc: avg(eyes, 'upperArc'),
    eyeLowerArc: avg(eyes, 'lowerArc'),
    eyeLidPeak: avg(eyes, 'lidPeak'),
    canthalTilt: avg(eyes, 'tilt'),
    irisSize: irises.length ? mean(irises.map((i) => i.size)) : NaN,
    irisWhiteBelow: irises.length ? mean(irises.map((i) => i.whiteBelow)) : NaN,
    irisWhiteAbove: irises.length ? mean(irises.map((i) => i.whiteAbove)) : NaN,

    browArch: avg(brows, 'arch'),
    browPeak: avg(brows, 'peak'),
    browTilt: avg(brows, 'tilt'),
    browThickness: avg(brows, 'thickness'),

    noseBridge: dist(n('bridgeR'), n('bridgeL')) / alarWidth,
    noseTipWidth: dist(n('tipR'), n('tipL')) / alarWidth,
    noseLength: noseLength / meshLength,

    bowDepth: (l('top').y - peaksY) / upperLip,
    bowWidth: dist(l('peakR'), l('peakL')) / mouthWidth,
    mouthCornerTilt: deg(Math.atan2(lipLineY - cornersY, mouthWidth / 2)),
  };
}
