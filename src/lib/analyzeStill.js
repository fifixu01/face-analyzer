import { getLandmarker } from './landmarker.js';
import { computeMetrics, topExpressions } from './analyze.js';
import { runChecks, measureLighting } from './quality.js';
import { findHairline } from './hairline.js';

const lightCtx = Object.assign(document.createElement('canvas'), { width: 96, height: 54 }).getContext('2d', {
  willReadFrequently: true,
});

/**
 * Runs the full analysis on a captured frame.
 * Returns null if no face is found.
 * @param {HTMLCanvasElement} still
 */
export async function analyzeStill(still) {
  const landmarker = await getLandmarker('IMAGE');
  const res = landmarker.detect(still);
  const lm = res.faceLandmarks[0];
  if (!lm) return null;

  const hairline = findHairline(still, lm);
  const lmFull = hairline ? [...lm, hairline] : lm;

  // Re-check quality on the frozen frame itself. Framing was handled by the camera guide.
  const checks = runChecks({
    lm,
    w: still.width,
    h: still.height,
    matrix: res.facialTransformationMatrixes?.[0],
    blendshapes: res.faceBlendshapes,
    lighting: measureLighting(still, lm, lightCtx),
    framing: false,
  });

  return {
    still,
    landmarks: lmFull,
    metrics: computeMetrics(lmFull, still.width, still.height),
    issues: checks.filter((c) => !c.ok).map((c) => c.fix),
    expressions: topExpressions(res.faceBlendshapes),
  };
}
