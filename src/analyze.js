// Geometry on MediaPipe's 478-point face mesh.
// Index map: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png

export const IDX = {
  top: 10, // top of the mesh; sits below the real hairline
  glabella: 9, // between the brows
  noseTip: 1,
  subnasale: 2, // base of the nose
  chin: 152,
  cheekL: 234, cheekR: 454,
  jawL: 172, jawR: 397,
  foreheadL: 54, foreheadR: 284,
  eyeOuterL: 33, eyeInnerL: 133,
  eyeInnerR: 362, eyeOuterR: 263,
  noseL: 129, noseR: 358,
  mouthL: 61, mouthR: 291,
  upperLipTop: 0, upperLipBottom: 13,
  lowerLipTop: 14, lowerLipBottom: 17,
};

// Mirror-image landmark pairs, grouped by region for the symmetry breakdown.
const SYMMETRY_REGIONS = {
  Eyes: [[33, 263], [133, 362], [159, 386], [145, 374]],
  Brows: [[70, 300], [105, 334], [107, 336]],
  Nose: [[129, 358], [98, 327]],
  Mouth: [[61, 291], [40, 270], [91, 321]],
  Jaw: [[234, 454], [172, 397], [58, 288], [136, 365], [149, 378]],
};
const MIDLINE = [10, 151, 9, 168, 6, 197, 195, 5, 4, 1, 2, 0, 17, 152];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Pixel-space landmarks rotated so the eyes are level (removes head tilt). */
function levelPoints(landmarks, width, height) {
  const px = landmarks.map((p) => ({ x: p.x * width, y: p.y * height }));
  const a = px[IDX.eyeOuterL];
  const b = px[IDX.eyeOuterR];
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);
  const level = px.map(({ x, y }) => ({
    x: cx + (x - cx) * cos - (y - cy) * sin,
    y: cy + (x - cx) * sin + (y - cy) * cos,
  }));
  return { level, rollDeg: (angle * 180) / Math.PI };
}

function yawRatio(p) {
  const l = dist(p[IDX.noseTip], p[IDX.cheekL]);
  const r = dist(p[IDX.noseTip], p[IDX.cheekR]);
  return (l - r) / (l + r);
}

function symmetry(level) {
  const midX = MIDLINE.reduce((s, i) => s + level[i].x, 0) / MIDLINE.length;
  const faceWidth = dist(level[IDX.cheekL], level[IDX.cheekR]);
  const toScore = (dev) => Math.max(0, Math.min(100, 100 - dev * 1000));
  const regions = {};
  let all = 0;
  let n = 0;
  for (const [name, pairs] of Object.entries(SYMMETRY_REGIONS)) {
    let sum = 0;
    for (const [l, r] of pairs) {
      // Reflect the right-side point across the midline and measure how far it lands from its partner.
      const b = level[r];
      sum += dist(level[l], { x: 2 * midX - b.x, y: b.y }) / faceWidth;
    }
    regions[name] = toScore(sum / pairs.length);
    all += sum;
    n += pairs.length;
  }
  return { overall: toScore(all / n), regions };
}

/**
 * Flat numeric metrics so the live view can smooth every field the same way.
 * All ratios are scale-free, so distance from the camera doesn't matter.
 */
export function computeMetrics(landmarks, width, height) {
  const { level, rollDeg } = levelPoints(landmarks, width, height);
  const d = (a, b) => dist(level[a], level[b]);

  const faceLength = d(IDX.top, IDX.chin);
  const cheekWidth = d(IDX.cheekL, IDX.cheekR);
  const jawWidth = d(IDX.jawL, IDX.jawR);
  const foreheadWidth = d(IDX.foreheadL, IDX.foreheadR);

  const upper = level[IDX.glabella].y - level[IDX.top].y;
  const middle = level[IDX.subnasale].y - level[IDX.glabella].y;
  const lower = level[IDX.chin].y - level[IDX.subnasale].y;
  const thirds = upper + middle + lower;

  const eyeWidth = (d(IDX.eyeOuterL, IDX.eyeInnerL) + d(IDX.eyeInnerR, IDX.eyeOuterR)) / 2;
  const eyeGap = d(IDX.eyeInnerL, IDX.eyeInnerR);
  const noseWidth = d(IDX.noseL, IDX.noseR);
  const mouthWidth = d(IDX.mouthL, IDX.mouthR);

  const sym = symmetry(level);

  return {
    symmetry: sym.overall,
    symEyes: sym.regions.Eyes,
    symBrows: sym.regions.Brows,
    symNose: sym.regions.Nose,
    symMouth: sym.regions.Mouth,
    symJaw: sym.regions.Jaw,
    lengthToWidth: faceLength / cheekWidth,
    jawToCheek: jawWidth / cheekWidth,
    foreheadToCheek: foreheadWidth / cheekWidth,
    foreheadToJaw: foreheadWidth / jawWidth,
    thirdUpper: upper / thirds,
    thirdMiddle: middle / thirds,
    thirdLower: lower / thirds,
    eyeSpacing: eyeGap / eyeWidth,
    noseToEyeGap: noseWidth / eyeGap,
    mouthToNose: mouthWidth / noseWidth,
    lipRatio: d(IDX.lowerLipTop, IDX.lowerLipBottom) / d(IDX.upperLipTop, IDX.upperLipBottom),
    yaw: yawRatio(level),
    roll: rollDeg,
  };
}

/** Returns a warning string if the pose is too far off for reliable numbers. */
export function poseWarning(m) {
  if (Math.abs(m.yaw) > 0.12) return 'Turn to face the camera straight on';
  if (Math.abs(m.roll) > 12) return 'Level your head, it’s tilted';
  return null;
}

/**
 * Heuristic face-shape classifier. Thresholds are a starting point; tune them on real photos.
 * Landmark 10 sits below the true hairline, so lengthToWidth reads lower than a tape measure would.
 */
export function faceShape(m) {
  const s = {
    Oval: 1 - Math.abs(m.lengthToWidth - 1.3) * 3 - Math.abs(m.jawToCheek - 0.8) * 3,
    Round: 1 - Math.abs(m.lengthToWidth - 1.1) * 3 - Math.abs(m.jawToCheek - 0.82) * 3,
    Square: 1 - Math.abs(m.lengthToWidth - 1.12) * 3 - Math.abs(m.jawToCheek - 0.92) * 4,
    Oblong: 1 - Math.abs(m.lengthToWidth - 1.5) * 3 - Math.abs(m.jawToCheek - 0.85) * 2,
    Heart: 1 - Math.abs(m.foreheadToJaw - 1.2) * 3 - Math.abs(m.jawToCheek - 0.72) * 3,
    Diamond: 1 - Math.abs(m.foreheadToCheek - 0.72) * 4 - Math.abs(m.jawToCheek - 0.72) * 3,
  };
  const ranked = Object.entries(s).sort((a, b) => b[1] - a[1]);
  return { best: ranked[0][0], runnerUp: ranked[1][0] };
}

/** Exponential moving average over every numeric field, to calm live jitter. */
export function smoother(alpha = 0.15) {
  let state = null;
  return {
    push(m) {
      if (!state) return (state = { ...m });
      for (const k of Object.keys(m)) state[k] += alpha * (m[k] - state[k]);
      return state;
    },
    reset() {
      state = null;
    },
  };
}

export function topExpressions(blendshapes) {
  return (blendshapes?.[0]?.categories ?? [])
    .filter((c) => c.score > 0.35 && c.categoryName !== '_neutral')
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c) => c.categoryName.replace(/([A-Z])/g, ' $1').toLowerCase());
}
