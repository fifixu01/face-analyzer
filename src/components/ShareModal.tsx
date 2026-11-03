import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { THEMES, cardData, loadThemeFonts, renderCard } from '../lib/shareCard';
import { Button } from './ui';

type Metrics = Parameters<typeof cardData>[0];

const FILE_NAME = 'face-analyzer-results.png';

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'),
  );
}

export function ShareModal({ open, onClose, metrics }: { open: boolean; onClose: () => void; metrics: Metrics }) {
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [preview, setPreview] = useState<{ id: string; canvas: HTMLCanvasElement; url: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const data = useMemo(() => cardData(metrics), [metrics]);
  const theme = THEMES.find((t) => t.id === themeId)!;

  const canShareFiles =
    typeof navigator !== 'undefined' &&
    !!navigator.canShare?.({ files: [new File([new Blob()], FILE_NAME, { type: 'image/png' })] });

  // Re-render the card whenever the theme changes (after its fonts have loaded).
  useEffect(() => {
    if (!open) return;
    let active = true;
    loadThemeFonts(theme).then(() => {
      if (!active) return;
      const canvas = renderCard(data, theme);
      setPreview({ id: theme.id, canvas, url: canvas.toDataURL('image/png') });
    });
    return () => {
      active = false;
    };
  }, [open, theme, data]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function save() {
    if (!preview) return;
    const url = URL.createObjectURL(await toBlob(preview.canvas));
    const a = Object.assign(document.createElement('a'), { href: url, download: FILE_NAME });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  async function share() {
    if (!preview) return;
    const file = new File([await toBlob(preview.canvas)], FILE_NAME, { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: 'My Face Analyzer results' });
    } catch {
      // User cancelled the share sheet; nothing to do.
    }
  }

  // Portal to <body> so the overlay isn't trapped inside the page's animated (transformed) containers.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Share your results"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="grid max-h-[92vh] w-full max-w-[860px] gap-6 overflow-y-auto rounded-3xl border border-line bg-surface p-6 min-[720px]:grid-cols-[minmax(0,1fr)_260px]"
          >
            {/* Preview */}
            <div className="flex items-start justify-center rounded-2xl bg-frame p-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {preview ? (
                  <motion.img
                    key={preview.id}
                    src={preview.url}
                    alt={`Results card in the ${theme.name} style`}
                    className="max-h-[72vh] w-auto max-w-full rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                    initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.96, rotate: 2 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  />
                ) : (
                  <p className="py-24 text-muted">Making your card…</p>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-2xl font-semibold text-ink-strong">Share results</p>
                  <p className="text-[13px] text-muted">Pick a style. Your photo isn’t included.</p>
                </div>
                <button onClick={onClose} aria-label="Close" className="cursor-pointer rounded-full p-1.5 text-muted hover:text-ink">
                  <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" aria-hidden>
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {THEMES.map((t) => {
                  const active = t.id === themeId;
                  return (
                    <motion.button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative flex cursor-pointer flex-col gap-2 rounded-xl border border-line bg-raised p-3 text-left"
                    >
                      {active && (
                        <motion.span
                          layoutId="theme-ring"
                          className="absolute inset-0 rounded-xl border-2 border-sage"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="flex">
                        {t.swatch.map((c, i) => (
                          <span
                            key={c}
                            className="h-6 w-6 rounded-full border-2 border-raised"
                            style={{ background: c, marginLeft: i ? -8 : 0 }}
                          />
                        ))}
                      </span>
                      <span className="text-[13px] font-semibold" style={{ fontFamily: `"${t.titleFont[1]}"` }}>
                        {t.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-auto flex flex-col gap-2.5">
                <Button variant="primary" onClick={save} disabled={!preview}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={saved ? 'saved' : 'save'}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="block"
                    >
                      {saved ? 'Saved!' : 'Save image'}
                    </motion.span>
                  </AnimatePresence>
                </Button>
                {canShareFiles && (
                  <Button onClick={share} disabled={!preview}>
                    Share…
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
