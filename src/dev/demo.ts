// Dev-only: sample results for previewing the results screen without a camera.
// Open http://localhost:5173/?demo while running `npm run dev`.
import type { StillResult } from '../components/Results';
import { SIDE_A, SIDE_B } from '../lib/outline.js';

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
  set(9, 640, 265); set(2, 640, 410); set(133, 600, 300); set(362, 680, 300);
  set(33, 560, 300); set(263, 720, 300);
  // Face outline: an egg shape that narrows toward the chin.
  [SIDE_A, SIDE_B].forEach((side, s) =>
    side.forEach((idx, i) => {
      const a = -Math.PI / 2 + (Math.PI * i) / (side.length - 1);
      const taper = Math.sin(a) > 0 ? 1 - 0.3 * Math.sin(a) ** 2 : 1 - 0.12 * Math.sin(a) ** 2;
      set(idx, 640 + (s ? -1 : 1) * 168 * Math.cos(a) * taper, 368 + 218 * Math.sin(a));
    }),
  );

  return {
    still,
    landmarks,
    issues: [],
    expressions: [],
    metrics: {
      symmetry: 88, symEyes: 93, symBrows: 86, symNose: 90, symMouth: 81, symJaw: 87,
      hairlineFound: 1,
      outlineLength: 1.18, outlineForehead: 0.9, outlineMidface: 0.92, outlineJaw: 0.78, outlineChin: 0.56, outlineWidestAt: 0.45,
      thirdUpper: 0.31, thirdMiddle: 0.32, thirdLower: 0.37,
      eyeSpacing: 1.38, noseToEyeGap: 0.92, mouthToNose: 1.42, lipRatio: 1.35, eyeSize: 0.175, browHeight: 0.6,
      eyeAspect: 0.25, eyeUpperArc: 0.13, eyeLowerArc: 0.11, eyeLidPeak: 0.48, canthalTilt: 5.6,
      irisSize: 0.5, irisWhiteBelow: -0.04, irisWhiteAbove: -0.2,
      browArch: 0.15, browPeak: 0.66, browTilt: -4.2, browThickness: 0.24,
      noseBridge: 0.3, noseTipWidth: 0.26, noseLength: 0.295, noseTipLift: 0.22, noseProjection: 0.74, noseDorsum: 0.02, noseCurve: 0.012,
      bowDepth: 0.19, bowWidth: 0.28, mouthCornerTilt: -0.4,
      lipFullness: 0.43, philtrum: 0.17, chinLength: 0.54, yaw: 0, roll: 0,
    },
  } as unknown as StillResult;
}
