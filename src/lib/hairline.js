// The face mesh stops partway up the forehead (landmark 10), so we find the real hairline
// by scanning upward from there in the image until the color changes from skin to hair.

const FOREHEAD_SAMPLES = [151, 108, 337, 9]; // forehead points used to learn skin color
const MIN_THRESHOLD = 30; // minimum RGB distance from skin color that counts as "not skin"
const RUN = 4; // consecutive non-skin samples required (ignores stray strands / blemishes)
// Scan at most this fraction of the mesh's forehead-to-chin length. Real hairlines sit well within
// this; going further would hit the top of a bald head instead.
const MAX_SCAN = 0.28;

function sampler(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  /** Average RGB in a small square around (x, y). */
  return (x, y, r = 2) => {
    let R = 0, G = 0, B = 0, n = 0;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const px = Math.round(x + dx);
        const py = Math.round(y + dy);
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        const i = (py * width + px) * 4;
        R += data[i]; G += data[i + 1]; B += data[i + 2]; n++;
      }
    }
    return n ? [R / n, G / n, B / n] : null;
  };
}

const colorDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const sat = (c) => (Math.max(...c) - Math.min(...c)) / Math.max(1, Math.max(...c));

/** Forehead shine is brighter and more washed-out than skin. Hair (even blond) isn't washed-out. */
const isShine = (c, skin) => lum(c) > lum(skin) && sat(c) <= sat(skin) + 0.02;

/**
 * Returns the hairline as a normalized {x, y} point (same space as landmarks), or null if
 * no clear hairline was found (bald, hat, hair close to skin tone, or out of frame).
 */
export function findHairline(canvas, lm) {
  const w = canvas.width;
  const h = canvas.height;
  const P = (i) => ({ x: lm[i].x * w, y: lm[i].y * h });
  const sample = sampler(canvas);

  const top = P(10);
  const chin = P(152);
  const len = Math.hypot(top.x - chin.x, top.y - chin.y);
  const up = { x: (top.x - chin.x) / len, y: (top.y - chin.y) / len };
  const side = { x: -up.y, y: up.x };

  // Reference skin color from the forehead.
  const refs = FOREHEAD_SAMPLES.map((i) => sample(P(i).x, P(i).y, 4)).filter(Boolean);
  if (!refs.length) return null;
  const skin = [0, 1, 2].map((c) => refs.reduce((s, r) => s + r[c], 0) / refs.length);
  // Uneven skin (shadows, makeup) needs a looser threshold.
  const spread = Math.max(...refs.map((r) => colorDist(r, skin)));
  const threshold = Math.max(MIN_THRESHOLD, spread * 2);

  const step = Math.max(1, len / 200);
  const maxSteps = Math.round((len * MAX_SCAN) / step);
  const found = [];

  // Scan three columns: the midline and one on each side.
  for (const offset of [0, -0.12, 0.12]) {
    const start = { x: top.x + side.x * offset * len, y: top.y + side.y * offset * len };
    let run = 0;
    for (let k = 0; k <= maxSteps; k++) {
      const x = start.x + up.x * step * k;
      const y = start.y + up.y * step * k;
      const c = sample(x, y);
      if (!c) break; // left the image
      if (colorDist(c, skin) > threshold && !isShine(c, skin)) {
        if (++run >= RUN) {
          found.push(k - RUN + 1); // first non-skin step in the run
          break;
        }
      } else {
        run = 0;
      }
    }
  }

  if (found.length < 2) return null;
  found.sort((a, b) => a - b);
  const k = found[Math.floor(found.length / 2)]; // median distance
  return { x: (top.x + up.x * step * k) / w, y: (top.y + up.y * step * k) / h };
}
