// Dev-only: sample results for previewing the results screen without a camera.
// Open http://localhost:5173/?demo while running `npm run dev`.
import type { StillResult } from '../components/Results';

export function makeDemoResult(): StillResult {
  const still = Object.assign(document.createElement('canvas'), { width: 1280, height: 720 });
  const ctx = still.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 1280, 720);
  g.addColorStop(0, '#2a2826');
  g.addColorStop(1, '#3a3532');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#5a4f48';
  ctx.beginPath();
  ctx.ellipse(640, 360, 170, 230, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rough face-like landmark layout so the measurement lines land somewhere sensible.
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const set = (i: number, x: number, y: number) => (landmarks[i] = { x: x / 1280, y: y / 720, z: 0 });
  set(10, 640, 150); set(152, 640, 585); set(9, 640, 265); set(2, 640, 410);
  set(234, 475, 330); set(454, 805, 330); set(172, 510, 480); set(397, 770, 480);
  set(54, 525, 195); set(284, 755, 195); set(133, 600, 300); set(362, 680, 300);

  return {
    still,
    landmarks,
    issues: [],
    expressions: [],
    metrics: {
      symmetry: 88, symEyes: 93, symBrows: 86, symNose: 90, symMouth: 81, symJaw: 87,
      hairlineFound: 1, lengthToWidth: 1.41, jawToCheek: 0.8, foreheadToCheek: 0.86, foreheadToJaw: 1.07,
      thirdUpper: 0.31, thirdMiddle: 0.32, thirdLower: 0.37,
      eyeSpacing: 1.16, noseToEyeGap: 0.95, mouthToNose: 1.52, lipRatio: 1.35,
      canthalTilt: 7.2, eyeAspect: 0.26, eyeSize: 0.215, browHeight: 0.52,
      noseBridge: 0.58, noseLength: 0.29, noseCurve: 0.018, noseTipOffset: 0.011,
      lipFullness: 0.36, philtrum: 0.22, chinLength: 0.41, yaw: 0, roll: 0,
    },
  } as unknown as StillResult;
}
