import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { analyzeStill } from './lib/analyzeStill.js';
import { useModelStatus } from './hooks/useModelStatus';
import { Home } from './components/Home';
import { CameraView } from './components/CameraView';
import { Results, type StillResult } from './components/Results';
import { FaceArt } from './components/FaceArt';
import { makeDemoResult } from './dev/demo';
import { Icon } from './components/ui';

// Dev-only shortcut: ?demo opens the results screen with sample data.
const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has('demo');

type View = 'home' | 'camera' | 'analyzing' | 'results';

export default function App() {
  const [view, setView] = useState<View>(DEMO ? 'results' : 'home');
  const [result, setResult] = useState<StillResult | null>(() => (DEMO ? makeDemoResult() : null));
  const [notice, setNotice] = useState<string | null>(null);
  const model = useModelStatus();

  async function handleCapture(still: HTMLCanvasElement) {
    setView('analyzing');
    // Give the "reading your features" screen a moment so the transition doesn't flicker.
    const [r] = await Promise.all([analyzeStill(still), new Promise((res) => setTimeout(res, 900))]);
    if (!r) {
      setNotice('No face found in that shot. Let’s try again.');
      setView('camera');
      return;
    }
    setNotice(null);
    setResult(r);
    setView('results');
    window.scrollTo({ top: 0 });
  }

  function goHome() {
    setResult(null);
    setNotice(null);
    setView('home');
  }

  return (
    <>
      <AnimatePresence>
        {view !== 'home' && (
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sticky top-0 z-30 border-b border-line/60 bg-bg/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl"
          >
            <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-4 px-[max(1.25rem,env(safe-area-inset-left))] min-[820px]:h-16">
              <motion.button
                onClick={goHome}
                title="Back to home"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="flex cursor-pointer items-center gap-2.5 font-display text-xl font-bold tracking-tight text-ink-strong min-[820px]:text-[22px]"
              >
                <LogoMark />
                Face Analyzer
              </motion.button>
              <p className="flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-semibold text-muted">
                <Icon name="lock" className="h-3.5 w-3.5 text-sage" />
                <span className="hidden min-[400px]:inline">Stays on your device</span>
                <span className="min-[400px]:hidden">Private</span>
              </p>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-[1080px] px-[max(1.25rem,env(safe-area-inset-left))] pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] min-[820px]:pt-8 min-[820px]:pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {view === 'home' && <Home onStart={() => setView('camera')} />}
            {view === 'camera' && <CameraView onCapture={handleCapture} notice={notice} />}
            {view === 'analyzing' && <Analyzing />}
            {view === 'results' && result && (
              <Results
                result={result}
                onRetake={() => {
                  setResult(null);
                  setView('camera');
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {model === 'error' && (
          <p className="mt-4 text-center text-[13px] text-ochre">
            Couldn’t load the face model. Check your connection and reload the page.
          </p>
        )}
      </main>
    </>
  );
}

const STEPS = ['Mapping 478 points', 'Tracing your outline', 'Measuring your features'];

function Analyzing() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 320);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-6 text-center">
      <div className="relative grid place-items-center">
        <motion.div
          className="absolute h-44 w-44 rounded-full border border-sage/25"
          animate={{ scale: [0.9, 1.15], opacity: [0.8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
        <FaceArt size={110} thinking />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="font-display text-2xl font-semibold text-ink-strong">Reading your features</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="text-sm text-muted"
          >
            {STEPS[step]}…
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Tiny face mark for the header. */
function LogoMark() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-line bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none" strokeLinecap="round">
        <ellipse cx="12" cy="12.5" rx="7.5" ry="9.5" stroke="rgba(214,209,201,0.6)" strokeWidth="1.5" />
        <path d="M8.2 10.6q1.3-.9 2.6 0M13.2 10.6q1.3-.9 2.6 0" stroke="var(--color-teal)" strokeWidth="1.6" />
        <path d="M9.6 15.6q2.4 1.6 4.8 0" stroke="var(--color-coral)" strokeWidth="1.6" />
      </svg>
    </span>
  );
}
