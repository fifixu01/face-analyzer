import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { THEMES, cardData, loadThemeFonts, renderCard } from '../lib/shareCard';
import { Button, Icon } from './ui';

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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm min-[720px]:items-center min-[720px]:p-4"
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
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            // Phones: a bottom sheet. Wider screens: a centered dialog with the preview beside the controls.
            className="grid max-h-[92svh] w-full max-w-[860px] grid-cols-[minmax(0,1fr)] gap-4 overflow-y-auto rounded-t-[28px] border border-line bg-surface p-4 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.6)] pb-[calc(1rem+env(safe-area-inset-bottom))] min-[720px]:grid-cols-[minmax(0,1fr)_260px] min-[720px]:gap-6 min-[720px]:rounded-[28px] min-[720px]:p-6"
          >
            {/* Preview */}
            <div className="order-2 flex items-start justify-center rounded-2xl bg-frame p-3 min-[720px]:order-none min-[720px]:p-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {preview ? (
                  <motion.img
                    key={preview.id}
                    src={preview.url}
                    alt={`Results card in the ${theme.name} style`}
                    className="max-h-[44svh] w-auto max-w-full rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] min-[720px]:max-h-[72vh]"
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
            <div className="contents min-[720px]:flex min-[720px]:flex-col min-[720px]:gap-4">
              {/* Grab handle on the phone sheet */}
              <div className="order-0 mx-auto -mb-1 h-1 w-10 rounded-full bg-line min-[720px]:hidden" />
              <div className="order-1 flex items-start justify-between gap-2 min-[720px]:order-none">
                <div>
                  <p className="font-display text-2xl font-semibold text-ink-strong">Share results</p>
                  <p className="text-[13px] text-muted">Pick a style. Your photo isn’t included.</p>
                </div>
                <button onClick={onClose} aria-label="Close" className="-m-1 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-line bg-raised/60 text-muted hover:text-ink">
                  <Icon name="close" />
                </button>
              </div>

              <div className="order-3 grid grid-cols-4 gap-2 min-[720px]:order-none min-[720px]:grid-cols-2 min-[720px]:gap-2.5">
                {THEMES.map((t) => {
                  const active = t.id === themeId;
                  return (
                    <motion.button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-line bg-raised p-2 text-center min-[720px]:items-start min-[720px]:gap-2 min-[720px]:p-3 min-[720px]:text-left"
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
                            className="h-5 w-5 rounded-full border-2 border-raised min-[720px]:h-6 min-[720px]:w-6"
                            style={{ background: c, marginLeft: i ? -7 : 0 }}
                          />
                        ))}
                      </span>
                      <span className="text-[11px] leading-tight font-semibold min-[720px]:text-[13px]" style={{ fontFamily: `"${t.titleFont[1]}"` }}>
                        {t.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="order-4 mt-auto flex gap-2.5 min-[720px]:order-none min-[720px]:flex-col">
                <Button variant="primary" className="flex-1 py-3 min-[720px]:flex-none min-[720px]:py-2.5" onClick={save} disabled={!preview}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={saved ? 'saved' : 'save'}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="block"
                    >
                      <span className="flex items-center gap-2">
                        <Icon name={saved ? 'check' : 'download'} />
                        {saved ? 'Saved!' : 'Save image'}
                      </span>
                    </motion.span>
                  </AnimatePresence>
                </Button>
                {canShareFiles && (
                  <Button className="flex-1 py-3 min-[720px]:flex-none min-[720px]:py-2.5" onClick={share} disabled={!preview}>
                    <Icon name="share" />
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
