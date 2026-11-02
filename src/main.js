import { getLandmarker } from './landmarker.js';
import { computeMetrics, topExpressions } from './analyze.js';
import { runChecks, measureLighting } from './quality.js';
import { drawMesh, drawMeasurements } from './draw.js';
import { renderReport, renderLegend } from './report.js';

const $ = (id) => document.getElementById(id);
const els = {
  tabs: document.querySelectorAll('.tab'),
  webcamView: $('webcam-view'),
  uploadView: $('upload-view'),
  resultView: $('result-view'),
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
  file: $('file'),
  dropzone: $('dropzone'),
  resultCanvas: $('result-canvas'),
  retake: $('retake'),
  showMesh: $('show-mesh'),
  report: $('report'),
  status: $('status'),
};

const HOLD_MS = 1200; // how long everything must stay green before auto-capture
const LIGHT_EVERY_MS = 250;
const GRACE_MS = 200; // a brief flicker out of green doesn't reset the hold timer

let mode = 'webcam';
let stream = null;
let rafId = null;
let lastResult = null;
let capturing = false;

// Small offscreen canvas for brightness sampling.
const lightCtx = Object.assign(document.createElement('canvas'), { width: 96, height: 54 })
  .getContext('2d', { willReadFrequently: true });

renderLegend($('legend'));

const setStatus = (msg) => (els.status.textContent = msg ?? '');

Promise.all([getLandmarker('VIDEO'), getLandmarker('IMAGE')])
  .then(() => setStatus(''))
  .catch((e) => setStatus(`Couldn’t load the face model: ${e.message}`));

/* ---------- Views ---------- */

function show(view) {
  for (const v of [els.webcamView, els.uploadView, els.resultView]) v.hidden = v !== view;
}

for (const tab of els.tabs) {
  tab.addEventListener('click', () => {
    mode = tab.dataset.mode;
    els.tabs.forEach((t) => t.classList.toggle('active', t === tab));
    stopCamera();
    show(mode === 'webcam' ? els.webcamView : els.uploadView);
  });
}

/* ---------- Camera ---------- */

els.startCam.addEventListener('click', startCamera);

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch (e) {
    setStatus(`Camera unavailable (${e.message}). You can use the Upload tab instead.`);
    return;
  }
  els.video.srcObject = stream;
  await els.video.play();
  els.placeholder.hidden = true;
  els.guide.hidden = false;
  capturing = false;
  runPreviewLoop();
}

function stopCamera() {
  cancelAnimationFrame(rafId);
  rafId = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  els.video.srcObject = null;
  els.placeholder.hidden = false;
  els.guide.hidden = true;
  els.capture.disabled = true;
  els.checklist.innerHTML = '<li class="muted">Start the camera to begin</li>';
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
        greenSince ??= now;
      } else if (now - lastGreen > GRACE_MS) {
        greenSince = null;
      }
      const progress = greenSince ? Math.min(1, (now - greenSince) / HOLD_MS) : 0;
      els.guide.classList.toggle('good', allGood);
      els.holdBar.style.width = `${(els.autoCapture.checked ? progress : 0) * 100}%`;
      els.guideText.textContent = allGood
        ? els.autoCapture.checked ? 'Hold still' : 'Ready to capture'
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

let lastChecklistKey = '';
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
  await analyzeStill(still, { framing: true });
}

/* ---------- Upload ---------- */

els.file.addEventListener('change', () => els.file.files[0] && loadFile(els.file.files[0]));
els.dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  els.dropzone.classList.add('drag');
});
els.dropzone.addEventListener('dragleave', () => els.dropzone.classList.remove('drag'));
els.dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  els.dropzone.classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f?.type.startsWith('image/')) loadFile(f);
});

async function loadFile(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const still = document.createElement('canvas');
  still.width = Math.round(bitmap.width * scale);
  still.height = Math.round(bitmap.height * scale);
  still.getContext('2d').drawImage(bitmap, 0, 0, still.width, still.height);
  els.file.value = '';
  await analyzeStill(still, { framing: false });
}

/* ---------- Full results ---------- */

async function analyzeStill(still, { framing }) {
  setStatus('Analyzing…');
  const landmarker = await getLandmarker('IMAGE');
  const res = landmarker.detect(still);
  const lm = res.faceLandmarks[0];
  if (!lm) {
    setStatus('No face found. Try a clearer, front-facing photo.');
    show(mode === 'webcam' ? els.webcamView : els.uploadView);
    return;
  }
  setStatus('');
  lastResult = { still, lm };
  drawResult();

  // Re-check quality on the frozen frame itself. Framing (distance/centering) only matters for the webcam guide.
  const checks = runChecks({
    lm,
    w: still.width,
    h: still.height,
    matrix: res.facialTransformationMatrixes?.[0],
    blendshapes: res.faceBlendshapes,
    lighting: measureLighting(still, lm, lightCtx),
    framing: false,
  });
  const m = computeMetrics(lm, still.width, still.height);
  renderReport(els.report, m, {
    issues: checks.filter((c) => !c.ok).map((c) => c.fix),
    expressions: topExpressions(res.faceBlendshapes),
  });
  show(els.resultView);
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  if (mode === 'webcam') {
    show(els.webcamView);
    startCamera();
  } else {
    show(els.uploadView);
  }
});
