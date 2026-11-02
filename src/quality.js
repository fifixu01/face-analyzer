// Capture-quality checks: is this frame good enough for an accurate analysis?

const deg = (r) => (r * 180) / Math.PI;

/**
 * Head yaw/pitch from MediaPipe's facial transformation matrix (magnitudes only; we only
 * need "how far off straight-on", not the direction). Roll comes from the eye line instead.
 */
export function headPose(matrix) {
  if (!matrix) return null;
  const m = matrix.data;
  let [fx, fy, fz] = [m[8], m[9], m[10]]; // face's forward axis
  if (fz < 0) [fx, fy, fz] = [-fx, -fy, -fz];
  return {
    yaw: Math.abs(deg(Math.atan2(fx, fz))),
    pitch: Math.abs(deg(Math.atan2(fy, Math.hypot(fx, fz)))),
  };
}

function rollDeg(lm, w, h) {
  const a = lm[33];
  const b = lm[263];
  return Math.abs(deg(Math.atan2((b.y - a.y) * h, (b.x - a.x) * w)));
}

const blend = (blendshapes, name) =>
  blendshapes?.[0]?.categories.find((c) => c.categoryName === name)?.score ?? 0;

/** Average brightness of the face box, plus how different the left and right halves are. */
export function measureLighting(source, lm, ctx) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.drawImage(source, 0, 0, W, H);
  const xs = [lm[234].x, lm[454].x].sort((a, b) => a - b);
  const x0 = Math.max(0, Math.floor(xs[0] * W));
  const x1 = Math.min(W, Math.ceil(xs[1] * W));
  const y0 = Math.max(0, Math.floor(lm[10].y * H));
  const y1 = Math.min(H, Math.ceil(lm[152].y * H));
  if (x1 - x0 < 4 || y1 - y0 < 4) return null;
  const { data } = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
  const mid = (x1 - x0) / 2;
  let left = 0, right = 0, nl = 0, nr = 0;
  for (let i = 0; i < data.length; i += 4) {
    const x = (i / 4) % (x1 - x0);
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (x < mid) { left += lum; nl++; } else { right += lum; nr++; }
  }
  left /= nl;
  right /= nr;
  return { brightness: (left + right) / 2, imbalance: Math.abs(left - right) / Math.max(1, (left + right) / 2) };
}

/**
 * Runs every check. `framing: false` skips distance/centering (for uploaded photos).
 * Returns [{ id, label, ok, fix }] in priority order.
 */
export function runChecks({ lm, w, h, matrix, blendshapes, lighting, framing = true }) {
  if (!lm) return [{ id: 'face', label: 'Face detected', ok: false, fix: 'Look at the camera, no face found' }];

  const checks = [];
  const add = (id, label, ok, fix) => checks.push({ id, label, ok, fix });

  if (framing) {
    const height = lm[152].y - lm[10].y;
    add('distance', 'Good distance', height > 0.33 && height < 0.8,
      height <= 0.33 ? 'Move closer to the camera' : 'Move back a little');
    const cx = (lm[234].x + lm[454].x) / 2;
    const cy = (lm[10].y + lm[152].y) / 2;
    add('center', 'Centered in the oval', Math.abs(cx - 0.5) < 0.1 && Math.abs(cy - 0.5) < 0.12,
      'Center your face in the oval');
  }

  const pose = headPose(matrix);
  if (pose) {
    add('yaw', 'Facing the camera', pose.yaw < 10, 'Turn to face the camera straight on');
    add('pitch', 'Chin level', pose.pitch < 13, 'Keep your chin level. Put the camera at eye height');
  }
  add('roll', 'Head upright', rollDeg(lm, w, h) < 7, 'Straighten your head, it’s tilted to one side');

  if (lighting) {
    const { brightness, imbalance } = lighting;
    add('light', 'Even lighting',
      brightness > 60 && brightness < 220 && imbalance < 0.28,
      brightness <= 60 ? 'Too dark. Find more light'
        : brightness >= 220 ? 'Too bright. Move away from direct light'
        : 'One side of your face is in shadow. Face the light straight on');
  }

  if (blendshapes?.length) {
    const blink = Math.max(blend(blendshapes, 'eyeBlinkLeft'), blend(blendshapes, 'eyeBlinkRight'));
    const smile = Math.max(blend(blendshapes, 'mouthSmileLeft'), blend(blendshapes, 'mouthSmileRight'));
    const open = blend(blendshapes, 'jawOpen');
    add('eyes', 'Eyes open', blink < 0.5, 'Keep your eyes open');
    add('neutral', 'Neutral expression', smile < 0.45 && open < 0.25, 'Relax your face into a neutral expression');
  }

  return checks;
}
