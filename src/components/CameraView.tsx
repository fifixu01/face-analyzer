import { useEffect, useRef, useState, type RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getLandmarker } from '../lib/landmarker.js';
import { runChecks, measureLighting } from '../lib/quality.js';
import { drawMesh } from '../lib/draw.js';
import { Button, Toggle } from './ui';

const HOLD_MS = 3000; // how long everything must stay green before auto-capture
const LIGHT_EVERY_MS = 250;
const GRACE_MS = 200; // a brief flicker out of green doesn't reset the hold timer
const STILL_TOLERANCE = 0.025; // how far (fraction of face width) the face may drift during the countdown
const MOVED_MSG_MS = 900; // how long to show "you moved" after a reset
const ANCHOR_POINTS = [1, 10, 152, 33, 263, 61, 291]; // nose, forehead, chin, eye corners, mouth corners

type Point = { x: number; y: number };
type Check = { id: string; label: string; ok: boolean; fix: string };

/** Average distance the anchor points moved since the countdown started, relative to face width. */
function driftFrom(anchor: Point[], lm: Point[], w: number, h: number) {
  const faceWidth = Math.hypot((lm[234].x - lm[454].x) * w, (lm[234].y - lm[454].y) * h);
  let sum = 0;
  ANCHOR_POINTS.forEach((i, k) => {
    sum += Math.hypot((lm[i].x - anchor[k].x) * w, (lm[i].y - anchor[k].y) * h);
  });
  return sum / ANCHOR_POINTS.length / faceWidth;
}
const snapshot = (lm: Point[]) => ANCHOR_POINTS.map((i) => ({ x: lm[i].x, y: lm[i].y }));

const IDLE_CHECKS = [
  'Good distance', 'Centered in the oval', 'Facing the camera', 'Chin level',
  'Head upright', 'Even lighting', 'Eyes open', 'Neutral expression',
];

type CamState = { state: 'starting' } | { state: 'live' } | { state: 'error'; msg: string };

export function CameraView({ onCapture, notice }: { onCapture: (still: HTMLCanvasElement) => void; notice?: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const holdBarRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState<CamState>({ state: 'starting' });
  const [attempt, setAttempt] = useState(0);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [guide, setGuide] = useState({ good: false, text: 'Center your face in the oval' });
  const [flash, setFlash] = useState(false);
  const [auto, setAuto] = useState(true);
  const [faceFound, setFaceFound] = useState(false);

  // Refs so the frame loop always sees the latest values without restarting.
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const captureRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    setCam({ state: 'starting' });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setCam({
          state: 'error',
          msg:
            (e as Error).name === 'NotAllowedError'
              ? 'Camera access was blocked. Allow it in your browser’s address bar, then try again.'
              : 'Couldn’t start the camera. Make sure no other app is using it, then try again.',
        });
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play().catch(() => {});
      const landmarker = await getLandmarker('VIDEO');
      if (cancelled) return;
      setCam({ state: 'live' });

      const canvas = overlayRef.current!;
      const ctx = canvas.getContext('2d')!;
      const lightCtx = Object.assign(document.createElement('canvas'), { width: 96, height: 54 }).getContext('2d', {
        willReadFrequently: true,
      });
      let capturing = false;
      let lastVideoTime = -1;
      let lighting: unknown = null;
      let lastLight = 0;
      let greenSince: number | null = null;
      let lastGreen = 0;
      let anchor: Point[] | null = null;
      let movedAt = -Infinity;
      let lastChecksKey = '';
      let lastGuideKey = '';

      captureRef.current = () => {
        if (capturing || !stream) return;
        capturing = true;
        cancelAnimationFrame(raf);
        // Freeze the frame, mirrored to match what the user saw on screen.
        const still = document.createElement('canvas');
        still.width = v.videoWidth;
        still.height = v.videoHeight;
        const sctx = still.getContext('2d')!;
        sctx.translate(still.width, 0);
        sctx.scale(-1, 1);
        sctx.drawImage(v, 0, 0);
        stream.getTracks().forEach((t) => t.stop());
        setFlash(true);
        setTimeout(() => onCaptureRef.current(still), 220);
      };

      const tick = (now: number) => {
        if (cancelled || capturing) return;
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
          const current: Check[] = runChecks({
            lm,
            w: canvas.width,
            h: canvas.height,
            matrix: res.facialTransformationMatrixes?.[0],
            blendshapes: res.faceBlendshapes,
            lighting,
          });
          const allGood = current.every((c) => c.ok);

          // Only re-render React when something visible actually changed.
          const checksKey = current.map((c) => `${c.id}${c.ok}`).join();
          if (checksKey !== lastChecksKey) {
            lastChecksKey = checksKey;
            setChecks(current);
            setFaceFound(!!lm);
          }

          // Hold-still countdown before auto-capture.
          if (allGood) {
            lastGreen = now;
            if (greenSince == null) {
              greenSince = now;
              anchor = snapshot(lm);
            } else if (anchor && driftFrom(anchor, lm, canvas.width, canvas.height) > STILL_TOLERANCE) {
              greenSince = now; // moved during the countdown: start over
              anchor = snapshot(lm);
              movedAt = now;
            }
          } else if (now - lastGreen > GRACE_MS) {
            greenSince = null;
            anchor = null;
          }
          const progress = greenSince != null ? Math.min(1, (now - greenSince) / HOLD_MS) : 0;
          if (holdBarRef.current) holdBarRef.current.style.width = `${(autoRef.current ? progress : 0) * 100}%`;

          const text = allGood
            ? !autoRef.current
              ? 'Ready to capture'
              : now - movedAt < MOVED_MSG_MS
                ? 'You moved. Hold still'
                : `Hold still  ${Math.max(1, Math.ceil((HOLD_MS - (now - (greenSince ?? now))) / 1000))}`
            : current.find((c) => !c.ok)!.fix;
          const guideKey = `${allGood}${text}`;
          if (guideKey !== lastGuideKey) {
            lastGuideKey = guideKey;
            setGuide({ good: allGood, text });
          }

          if (allGood && autoRef.current && progress >= 1) {
            captureRef.current();
            return;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt]);

  const live = cam.state === 'live';

  return (
    <div className="grid items-start gap-5 min-[820px]:grid-cols-[minmax(0,1fr)_290px]">
      <div className={`relative overflow-hidden rounded-2xl border border-line bg-frame ${live ? '' : 'aspect-[16/10]'}`}>
        <video ref={videoRef} playsInline muted className={`block w-full -scale-x-100 ${live ? '' : 'hidden'}`} />
        <canvas ref={overlayRef} className="absolute inset-0 h-full w-full -scale-x-100" />

        {live && <FaceGuide good={guide.good} text={guide.text} holdBarRef={holdBarRef} />}

        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 p-6 text-center">
            {cam.state === 'starting' ? (
              <motion.p
                className="text-muted"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                Starting camera…
              </motion.p>
            ) : (
              <>
                <p className="max-w-sm text-muted">{cam.state === 'error' && cam.msg}</p>
                <Button onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
              </>
            )}
          </div>
        )}

        <AnimatePresence>
          {flash && (
            <motion.div
              className="absolute inset-0 bg-[#faf9f6]"
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          )}
        </AnimatePresence>
      </div>

      <Checklist
        checks={checks}
        notice={notice}
        auto={auto}
        setAuto={setAuto}
        canCapture={live && faceFound}
        onCapture={() => captureRef.current()}
      />
    </div>
  );
}

function FaceGuide({ good, text, holdBarRef }: { good: boolean; text: string; holdBarRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.div
        className="aspect-[3/4] h-[72%] rounded-[50%] border-[1.5px] shadow-[0_0_0_9999px_rgba(30,29,27,0.28)]"
        animate={{
          borderColor: good ? 'rgba(190,214,198,0.95)' : 'rgba(255,255,255,0.55)',
          borderStyle: good ? 'solid' : 'dashed',
          scale: good ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      />
      <div className="absolute bottom-[5%] flex max-w-[90%] flex-col items-center gap-1.5 rounded-xl bg-[rgba(30,29,27,0.6)] px-4 py-2 text-center text-sm text-[#f3f1ed] backdrop-blur-md">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="font-semibold"
          >
            {text}
          </motion.span>
        </AnimatePresence>
        <div className="h-0.5 w-24 overflow-hidden rounded-full bg-white/20">
          <div ref={holdBarRef} className="h-full w-0 bg-[rgba(190,214,198,0.95)]" />
        </div>
      </div>
    </div>
  );
}

function Checklist({
  checks,
  notice,
  auto,
  setAuto,
  canCapture,
  onCapture,
}: {
  checks: Check[] | null;
  notice?: string | null;
  auto: boolean;
  setAuto: (v: boolean) => void;
  canCapture: boolean;
  onCapture: () => void;
}) {
  const items = checks ?? IDLE_CHECKS.map((label) => ({ id: label, label, ok: false, fix: label, idle: true }));
  return (
    <aside className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-5">
      <p className="text-[13px] font-bold tracking-[0.05em] text-muted uppercase">Before capture</p>
      <p className="text-[13px] text-muted">The photo is taken once every item is checked.</p>
      {notice && <p className="rounded-lg bg-ochre-soft px-3 py-2 text-[13px] text-ochre">{notice}</p>}
      <ul className="my-1 flex flex-col gap-2.5 text-sm">
        {items.map((c) => {
          const idle = 'idle' in c;
          return (
            <motion.li layout key={c.id} className={`flex items-center gap-2.5 ${idle ? 'text-muted' : c.ok ? 'text-ink' : 'text-ochre'}`}>
              <motion.span
                key={`${c.id}-${c.ok}`}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 600, damping: 15 }}
                className={`h-2 w-2 flex-none rounded-full ${idle ? 'border-[1.5px] border-line' : c.ok ? 'bg-sage' : 'border-[1.5px] border-ochre'}`}
              />
              {c.ok || idle ? c.label : c.fix}
            </motion.li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3 border-t border-line pt-3.5">
        <Toggle checked={auto} onChange={setAuto} label="Capture automatically" />
        <Button variant="primary" disabled={!canCapture} onClick={onCapture}>
          Capture
        </Button>
      </div>
    </aside>
  );
}
