import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { analyzeStill } from './lib/analyzeStill.js';
import { useModelStatus } from './hooks/useModelStatus';
import { Home } from './components/Home';
import { CameraView } from './components/CameraView';
import { Results, type StillResult } from './components/Results';
import { FaceArt } from './components/FaceArt';
import { makeDemoResult } from './dev/demo';

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
    <main className="mx-auto max-w-[1080px] px-[max(1.25rem,env(safe-area-inset-left))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] min-[820px]:pt-10 min-[820px]:pb-20">
      <AnimatePresence>
        {view !== 'home' && (
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex flex-wrap items-center justify-between gap-4 min-[820px]:mb-6"
          >
            <motion.button
              onClick={goHome}
              title="Back to home"
              whileHover={{ scale: 1.04, rotate: -1 }}
              whileTap={{ scale: 0.96 }}
              className="cursor-pointer font-display text-2xl font-bold tracking-tight text-ink-strong"
            >
              Face Analyzer
            </motion.button>
            <p className="hidden text-[13px] text-muted sm:block">Nothing leaves your device</p>
          </motion.header>
        )}
      </AnimatePresence>

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
          {view === 'analyzing' && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
              <FaceArt size={110} thinking />
              <p className="font-display text-xl font-semibold">Reading your features…</p>
            </div>
          )}
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
  );
}
