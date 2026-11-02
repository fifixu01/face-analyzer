import { getLandmarker } from './landmarker.js';
import { computeMetrics, topExpressions } from './analyze.js';
import { runChecks, measureLighting } from './quality.js';
import { drawMesh, drawMeasurements } from './draw.js';
import { findHairline } from './hairline.js';
import { renderReport, renderLegend } from './report.js';

const $ = (id) => document.getElementById(id);
const els = {
  homeView: $('home-view'),
  webcamView: $('webcam-view'),
  resultView: $('result-view'),
  topbar: $('topbar'),
  homeLink: $('home-link'),
  camMsg: $('cam-msg'),
  retryCam: $('retry-cam'),
  video: $('video'),
  overlay: $('live-overlay'),
  placeholder: $('cam-placeholder'),
  guide: $('face-guide'),
  guideText: $('guide-text'),
  holdBar: $('hold-bar'),
  flash: $('flash'),
  checklist: $('checklist'),
  autoCapture: $('auto-capture'),
  startCam: $('start-cam'),
  capture: $('capture'),
  resultCanvas: $('result-canvas'),
  retake: $('retake'),
  showMesh: $('show-mesh'),
  summary: $('summary'),
  report: $('report'),
  status: $('status'),
};

const HOLD_MS = 3000; // how long everything must stay green before auto-capture
const LIGHT_EVERY_MS = 250;
const GRACE_MS = 200; // a brief flicker out of green doesn't reset the hold timer
const STILL_TOLERANCE = 0.025; // how far (fraction of face width) the face may drift during the countdown
const MOVED_MSG_MS = 900; // how long to show "you moved" after a reset
const ANCHOR_POINTS = [1, 10, 152, 33, 263, 61, 291]; // nose, forehead, chin, eye corners, mouth corners

/** Average distance the anchor points moved since the countdown started, relative to face width. */
function driftFrom(anchor, lm, w, h) {
  const faceWidth = Math.hypot((lm[234].x - lm[454].x) * w, (lm[234].y - lm[454].y) * h);
  let sum = 0;
  for (const [k, i] of ANCHOR_POINTS.entries()) {
    sum += Math.hypot((lm[i].x - anchor[k].x) * w, (lm[i].y - anchor[k].y) * h);
  }
  return sum / ANCHOR_POINTS.length / faceWidth;
}
const snapshot = (lm) => ANCHOR_POINTS.map((i) => ({ x: lm[i].x, y: lm[i].y }));

let stream = null;
let rafId = null;
let lastResult = null;
let capturing = false;
let lastChecklistKey = '';

// Small offscreen canvas for brightness sampling.
const lightCtx = Object.assign(document.createElement('canvas'), { width: 96, height: 54 })
  .getContext('2d', { willReadFrequently: true });

renderLegend($('legend'));

const setStatus = (msg) => (els.status.textContent = msg ?? '');

Promise.all([getLandmarker('VIDEO'), getLandmarker('IMAGE')])
  .then(() => setStatus(''))
  .catch((e) => {
    console.error(e);
    setStatus('Couldn’t load the face model. Check your connection and reload the page.');
  });

// Shown before the camera starts, so the panel previews what will be checked.
const IDLE_CHECKS = [
  'Good distance', 'Centered in the oval', 'Facing the camera', 'Chin level',
  'Head upright', 'Even lighting', 'Eyes open', 'Neutral expression',
];
function renderIdleChecklist() {
  lastChecklistKey = '';
  els.checklist.innerHTML = IDLE_CHECKS.map((l) => `<li class="idle"><span class="dot"></span>${l}</li>`).join('');
}
renderIdleChecklist();

/* ---------- Views ---------- */

function show(view) {
  for (const v of [els.homeView, els.webcamView, els.resultView]) v.hidden = v !== view;
  els.topbar.hidden = view === els.homeView;
  window.scrollTo({ top: 0 });
}

function openCamera() {
  show(els.webcamView);
  startCamera();
}

els.startCam.addEventListener('click', openCamera);
els.retryCam.addEventListener('click', startCamera);
els.homeLink.addEventListener('click', () => {
  stopCamera();
  lastResult = null;
  show(els.homeView);
});

/* ---------- Camera ---------- */

async function startCamera() {
  els.camMsg.textContent = 'Starting camera…';
  els.retryCam.hidden = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (e) {
    console.error(e);
    els.camMsg.textContent = e.name === 'NotAllowedError'
      ? 'Camera access was blocked. Allow it in your browser’s address bar, then try again.'
      : 'Couldn’t start the camera. Make sure no other app is using it, then try again.';
    els.retryCam.hidden = false;
    return;
  }
  els.video.srcObject = stream;
  await els.video.play();
  els.placeholder.hidden = true;
  els.video.parentElement.classList.add('live');
  els.capture.hidden = false;
  els.guide.hidden = false;
  els.guide.classList.remove('good');
  els.holdBar.style.width = '0%';
  capturing = false;
  runPreviewLoop();
}

function stopCamera() {
  cancelAnimationFrame(rafId);
  rafId = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  els.video.srcObject = null;
  // Clear the last frame's mesh so it doesn't linger on the idle screen.
  els.overlay.getContext('2d').clearRect(0, 0, els.overlay.width, els.overlay.height);
  els.video.parentElement.classList.remove('live');
  els.placeholder.hidden = false;
  els.guide.hidden = true;
  els.capture.hidden = true;
  renderIdleChecklist();
}

async function runPreviewLoop() {
  const landmarker = await getLandmarker('VIDEO');
  const canvas = els.overlay;
  const ctx = canvas.getContext('2d');
  let lastVideoTime = -1;
  let lighting = null;
  let lastLight = 0;
  let greenSince = null;
  let lastGreen = 0;
  let anchor = null;
  let movedAt = -Infinity;

  const tick = (now) => {
    if (!stream || capturing) return;
    const v = els.video;
    if (v.readyState >= 2 && v.currentTime !== lastVideoTime) {
      lastVideoTime = v.currentTime;
      if (canvas.width !== v.videoWidth) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
      }
      const res = landmarker.detectForVideo(v, now);
      const lm = res.faceLandmarks[0];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (lm) drawMesh(ctx, lm, canvas.width, canvas.height);

      if (lm && now - lastLight > LIGHT_EVERY_MS) {
        lastLight = now;
        lighting = measureLighting(v, lm, lightCtx);
      }
      const checks = runChecks({
        lm,
        w: canvas.width,
        h: canvas.height,
        matrix: res.facialTransformationMatrixes?.[0],
        blendshapes: res.faceBlendshapes,
        lighting,
      });
      const allGood = checks.every((c) => c.ok);
      renderChecklist(checks);
      els.capture.disabled = !lm;

      // Hold-still timer before auto-capture.
      if (allGood) {
        lastGreen = now;
        if (greenSince == null) {
          greenSince = now;
          anchor = snapshot(lm);
        } else if (driftFrom(anchor, lm, canvas.width, canvas.height) > STILL_TOLERANCE) {
          // Moved during the countdown: start over from the new position.
          greenSince = now;
          anchor = snapshot(lm);
          movedAt = now;
        }
      } else if (now - lastGreen > GRACE_MS) {
        greenSince = null;
        anchor = null;
      }
      const justMoved = now - movedAt < MOVED_MSG_MS;
      const progress = greenSince ? Math.min(1, (now - greenSince) / HOLD_MS) : 0;
      els.guide.classList.toggle('good', allGood);
      els.holdBar.style.width = `${(els.autoCapture.checked ? progress : 0) * 100}%`;
      els.guideText.textContent = allGood
        ? !els.autoCapture.checked ? 'Ready to capture'
          : justMoved ? 'You moved. Hold still'
          : `Hold still  ${Math.max(1, Math.ceil((HOLD_MS - (now - greenSince)) / 1000))}`
        : checks.find((c) => !c.ok).fix;

      if (allGood && els.autoCapture.checked && progress >= 1) {
        capture();
        return;
      }
    }
    rafId = requestAnimationFrame(tick);
  };
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

function renderChecklist(checks) {
  const key = checks.map((c) => `${c.id}${c.ok}`).join();
  if (key === lastChecklistKey) return; // avoid rebuilding the DOM every frame
  lastChecklistKey = key;
  els.checklist.innerHTML = checks
    .map((c) => `<li class="${c.ok ? 'ok' : 'bad'}"><span class="dot"></span>${c.ok ? c.label : c.fix}</li>`)
    .join('');
}

els.capture.addEventListener('click', () => capture());

async function capture() {
  if (capturing) return;
  capturing = true;
  cancelAnimationFrame(rafId);
  // Freeze the frame, mirrored to match what the user saw on screen.
  const v = els.video;
  const still = document.createElement('canvas');
  still.width = v.videoWidth;
  still.height = v.videoHeight;
  const ctx = still.getContext('2d');
  ctx.translate(still.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(v, 0, 0);
  els.flash.hidden = false;
  setTimeout(() => (els.flash.hidden = true), 250);
  stopCamera();
  await analyzeStill(still);
}

/* ---------- Full results ---------- */

async function analyzeStill(still) {
  setStatus('Analyzing…');
  const landmarker = await getLandmarker('IMAGE');
  const res = landmarker.detect(still);
  const lm = res.faceLandmarks[0];
  if (!lm) {
    setStatus('No face found in that shot. Let’s try again.');
    openCamera();
    return;
  }
  setStatus('');
  const hairline = findHairline(still, lm);
  const lmFull = hairline ? [...lm, hairline] : lm;
  lastResult = { still, lm: lmFull };
  drawResult();

  // Re-check quality on the frozen frame itself. Framing (distance/centering) was handled by the camera guide.
  const checks = runChecks({
    lm,
    w: still.width,
    h: still.height,
    matrix: res.facialTransformationMatrixes?.[0],
    blendshapes: res.faceBlendshapes,
    lighting: measureLighting(still, lm, lightCtx),
    framing: false,
  });
  const m = computeMetrics(lmFull, still.width, still.height);
  renderReport({ summaryEl: els.summary, detailsEl: els.report }, m, {
    issues: checks.filter((c) => !c.ok).map((c) => c.fix),
    expressions: topExpressions(res.faceBlendshapes),
  });
  show(els.resultView);
}

function drawResult() {
  const { still, lm } = lastResult;
  const c = els.resultCanvas;
  c.width = still.width;
  c.height = still.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(still, 0, 0);
  if (els.showMesh.checked) drawMesh(ctx, lm, c.width, c.height);
  drawMeasurements(ctx, lm, c.width, c.height);
}

els.showMesh.addEventListener('change', () => lastResult && drawResult());

els.retake.addEventListener('click', () => {
  lastResult = null;
  setStatus('');
  openCamera();
});
