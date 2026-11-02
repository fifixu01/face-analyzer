import { getLandmarker } from './landmarker.js';
import { computeMetrics, faceShape, poseWarning, smoother, topExpressions } from './analyze.js';
import { drawMesh, drawMidline, drawMeasurements } from './draw.js';
import { renderReport } from './report.js';

const $ = (id) => document.getElementById(id);
const els = {
  tabs: document.querySelectorAll('.tab'),
  webcamView: $('webcam-view'),
  uploadView: $('upload-view'),
  resultView: $('result-view'),
  video: $('video'),
  overlay: $('live-overlay'),
  placeholder: $('cam-placeholder'),
  hint: $('live-hint'),
  countdown: $('countdown'),
  startCam: $('start-cam'),
  capture: $('capture'),
  useTimer: $('use-timer'),
  file: $('file'),
  dropzone: $('dropzone'),
  resultCanvas: $('result-canvas'),
  retake: $('retake'),
  showMesh: $('show-mesh'),
  report: $('report'),
  status: $('status'),
  lv: {
    symmetry: $('lv-symmetry'),
    symmetryBar: $('lv-symmetry-bar'),
    shape: $('lv-shape'),
    ltw: $('lv-ltw'),
    eyes: $('lv-eyes'),
    thirds: $('lv-thirds').children,
  },
};

let mode = 'webcam';
let stream = null;
let rafId = null;
let lastResult = null;
const live = smoother(0.15);

const setStatus = (msg) => (els.status.textContent = msg ?? '');

// Load both models up front so the live view and the capture both start fast.
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
    if (mode === 'webcam') {
      show(els.webcamView);
    } else {
      stopCamera();
      show(els.uploadView);
    }
  });
}

/* ---------- Live webcam ---------- */

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
  live.reset();
  runLiveLoop();
}

function stopCamera() {
  cancelAnimationFrame(rafId);
  rafId = null;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  els.video.srcObject = null;
  els.placeholder.hidden = false;
  els.capture.disabled = true;
  els.hint.textContent = 'Start the camera to begin';
}

async function runLiveLoop() {
  const landmarker = await getLandmarker('VIDEO');
  const canvas = els.overlay;
  const ctx = canvas.getContext('2d');
  let lastVideoTime = -1;
  let lastPanelUpdate = 0;

  const tick = (now) => {
    if (!stream) return;
    const v = els.video;
    if (v.readyState >= 2 && v.currentTime !== lastVideoTime) {
      lastVideoTime = v.currentTime;
      if (canvas.width !== v.videoWidth) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
      }
      const res = landmarker.detectForVideo(v, now);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const lm = res.faceLandmarks[0];
      if (lm) {
        drawMesh(ctx, lm, canvas.width, canvas.height);
        drawMidline(ctx, lm, canvas.width, canvas.height);
        const m = live.push(computeMetrics(lm, canvas.width, canvas.height));
        // Mesh redraws every frame; numbers update ~6x/sec so they're readable.
        if (now - lastPanelUpdate > 160) {
          lastPanelUpdate = now;
          updateLivePanel(m);
        }
        els.capture.disabled = false;
      } else {
        live.reset();
        els.hint.textContent = 'No face detected';
        els.hint.className = 'hint warn';
        els.capture.disabled = true;
      }
    }
    rafId = requestAnimationFrame(tick);
  };
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

function updateLivePanel(m) {
  const warning = poseWarning(m);
  els.hint.textContent = warning ?? 'Tracking. Hold still for the best numbers';
  els.hint.className = warning ? 'hint warn' : 'hint ok';

  const sym = Math.round(m.symmetry);
  els.lv.symmetry.textContent = sym;
  els.lv.symmetryBar.style.width = `${sym}%`;
  els.lv.shape.textContent = faceShape(m).best;
  els.lv.ltw.textContent = m.lengthToWidth.toFixed(2);
  els.lv.eyes.textContent = `${m.eyeSpacing.toFixed(2)} eye-widths`;
  const [t1, t2, t3] = els.lv.thirds;
  t1.style.flex = m.thirdUpper;
  t2.style.flex = m.thirdMiddle;
  t3.style.flex = m.thirdLower;
}

els.capture.addEventListener('click', async () => {
  els.capture.disabled = true;
  if (els.useTimer.checked) {
    els.countdown.hidden = false;
    for (let n = 3; n > 0; n--) {
      els.countdown.textContent = n;
      await new Promise((r) => setTimeout(r, 1000));
    }
    els.countdown.hidden = true;
  }
  // Freeze the frame, mirrored to match what the user saw on screen.
  const v = els.video;
  const still = document.createElement('canvas');
  still.width = v.videoWidth;
  still.height = v.videoHeight;
  const ctx = still.getContext('2d');
  ctx.translate(still.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(v, 0, 0);
  stopCamera();
  await analyzeStill(still);
});

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
  await analyzeStill(still);
}

/* ---------- Full results ---------- */

async function analyzeStill(still) {
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
  const m = computeMetrics(lm, still.width, still.height);
  renderReport(els.report, m, {
    warning: poseWarning(m),
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
