import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { faceShape } from '../lib/analyze.js';
import { drawMesh, drawMeasurements, LEGEND } from '../lib/draw.js';
import { FEATURE_GROUPS, readSymmetry, readThirds } from '../lib/explain.js';
import { SHAPE_NOTES, summaryText } from '../lib/report-text.js';
import { animalType } from '../lib/fun.js';
import type { analyzeStill } from '../lib/analyzeStill.js';
import { useCountUp } from '../hooks/useCountUp';
import { AnimalCard } from './AnimalCard';
import { ShareModal } from './ShareModal';
import { Button, Card, Expandable, Eyebrow, Icon, Toggle, rise, stagger } from './ui';

export type StillResult = NonNullable<Awaited<ReturnType<typeof analyzeStill>>>;
type Metrics = StillResult['metrics'];
type Shape = ReturnType<typeof faceShape>;

const pct = (x: number) => `${Math.round(x * 100)}%`;

// Simple silhouettes for each face shape (40 x 52 box).
const SHAPE_PATHS: Record<string, string> = {
  Oval: 'M20 2C32 2 38 14 38 26C38 40 30 50 20 50C10 50 2 40 2 26C2 14 8 2 20 2Z',
  Round: 'M20 6C32 6 38 15 38 28C38 41 30 48 20 48C10 48 2 41 2 28C2 15 8 6 20 6Z',
  Square: 'M8 5C14 3 26 3 32 5C37 7 38 13 38 21L38 36C38 44 32 48 20 48C8 48 2 44 2 36L2 21C2 13 3 7 8 5Z',
  Oblong: 'M20 1C31 1 35 8 35 18L35 38C35 46 28 51 20 51C12 51 5 46 5 38L5 18C5 8 9 1 20 1Z',
  Heart: 'M20 5C30 2 38 8 38 18C38 30 28 44 20 50C12 44 2 30 2 18C2 8 10 2 20 5Z',
  Diamond: 'M20 2C26 2 30 8 34 16C37 22 38 26 36 30C32 40 26 48 20 50C14 48 8 40 4 30C2 26 3 22 6 16C10 8 14 2 20 2Z',
};

// One accent per feature group, matching the mesh colors.
const GROUP_COLORS: Record<string, string> = {
  Eyes: 'var(--color-teal)',
  Brows: 'var(--color-amber)',
  Nose: 'var(--color-t2)',
  'Lips & mouth': 'var(--color-coral)',
  'Face outline': 'var(--color-t1)',
};

export function Results({ result, onRetake }: { result: StillResult; onRetake: () => void }) {
  const { metrics: m, issues, expressions } = result;
  const shape = faceShape(m);
  const [sharing, setSharing] = useState(false);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">
      {issues.length > 0 && (
        <motion.div variants={rise} className="flex gap-3 rounded-2xl border border-ochre/20 bg-ochre-soft px-4 py-3 text-sm">
          <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-ochre" />
          <div>
            <p className="font-bold text-ochre">This shot may affect accuracy</p>
            <ul className="mt-1 flex flex-col gap-0.5 text-ink">
              {issues.map((i: string) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      <Hero
        result={result}
        shape={shape}
        expressions={expressions}
        onShare={() => setSharing(true)}
        onRetake={onRetake}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 min-[820px]:grid-cols-2">
        <div className="flex flex-col gap-5">
          <ShapeCard shape={shape} m={m} />
          <AnimalCard metrics={m} />
        </div>
        <div className="flex flex-col gap-5">
          <SymmetryCard m={m} />
          <ThirdsCard m={m} />
        </div>
      </div>

      <Features m={m} />

      <motion.p variants={rise} className="px-1 text-center text-[13px] text-faint">
        Shaded bars show the typical range, centered on MediaPipe’s average face. These are 2D estimates from a single
        photo, not a measure of attractiveness.
      </motion.p>

      <ShareModal open={sharing} onClose={() => setSharing(false)} metrics={m} />
    </motion.div>
  );
}

/* ---------- Hero ---------- */

function Hero({
  result,
  shape,
  expressions,
  onShare,
  onRetake,
}: {
  result: StillResult;
  shape: Shape;
  expressions: string[];
  onShare: () => void;
  onRetake: () => void;
}) {
  const m = result.metrics;
  const animal = animalType(m);
  return (
    <motion.section
      variants={rise}
      className="card grid grid-cols-[minmax(0,1fr)] gap-5 p-3 min-[820px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] min-[820px]:gap-7 min-[820px]:p-4"
    >
      <ResultPhoto result={result} />

      <div className="flex flex-col gap-5 px-2 pb-2 min-[820px]:py-3 min-[820px]:pr-3 min-[820px]:pl-0">
        <Eyebrow>Your results</Eyebrow>

        <div className="flex items-center gap-4">
          <motion.svg
            viewBox="0 0 40 52"
            className="hidden h-16 w-12 flex-none min-[480px]:block"
            initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.2 }}
            aria-hidden
          >
            <path d={SHAPE_PATHS[shape.best]} fill="none" stroke="var(--color-sage)" strokeWidth="2" />
          </motion.svg>
          <div className="min-w-0 flex-1">
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.25 }}
              className="font-display text-[clamp(32px,10vw,48px)] leading-none font-semibold tracking-tight text-ink-strong"
            >
              {shape.best}
            </motion.p>
            <p className="mt-1.5 text-sm text-muted">face shape</p>
          </div>
          <SymmetryRing value={m.symmetry} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip color="var(--color-sage)">{Math.round(shape.matches[0].share * 100)}% {shape.best.toLowerCase()} match</Chip>
          <Chip color="var(--color-amber)">
            {animal.primary.animal} type
          </Chip>
          <Chip color="var(--color-t2)">{FEATURE_GROUPS[0].headline(m)}</Chip>
        </div>

        <p className="text-[15px] leading-relaxed text-ink">{summaryText(m, shape)}</p>
        {expressions.length > 0 && <p className="-mt-2 text-[13px] text-muted">Expression detected: {expressions.join(', ')}</p>}

        <div className="mt-auto flex flex-wrap gap-2.5 pt-1">
          <Button variant="primary" className="flex-1 py-3 min-[480px]:flex-none min-[480px]:px-5" onClick={onShare}>
            <Icon name="share" />
            Share results
          </Button>
          <Button className="flex-1 py-3 min-[480px]:flex-none" onClick={onRetake}>
            <Icon name="retry" />
            Try again
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

function Chip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-[13px] font-semibold text-ink">
      <i className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function SymmetryRing({ value }: { value: number }) {
  const n = useCountUp(value, { delay: 0.3 });
  const r = 31;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-none flex-col items-center gap-1.5">
      <div className="relative grid h-[92px] w-[92px] place-items-center min-[380px]:h-[104px] min-[380px]:w-[104px] min-[820px]:h-[116px] min-[820px]:w-[116px]">
        <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-meter)" strokeWidth="5" />
          <motion.circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke="var(--color-sage)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - value / 100) }}
            transition={{ delay: 0.3, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <p className="flex flex-col items-center leading-none">
          <span className="tabular font-display text-[34px] font-semibold text-ink-strong min-[380px]:text-[40px] min-[820px]:text-[44px]">
            {Math.round(n)}
          </span>
          <span className="mt-0.5 text-[11px] font-semibold text-muted">/ 100</span>
        </p>
      </div>
      <p className="text-sm text-muted">symmetry</p>
    </div>
  );
}

function ResultPhoto({ result }: { result: StillResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showMesh, setShowMesh] = useState(false);

  useEffect(() => {
    const c = canvasRef.current!;
    const { still, landmarks } = result;
    c.width = still.width;
    c.height = still.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(still, 0, 0);
    if (showMesh) drawMesh(ctx, landmarks, c.width, c.height);
    drawMeasurements(ctx, landmarks, c.width, c.height);
  }, [result, showMesh]);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-[18px] bg-frame">
        <canvas ref={canvasRef} className="block h-auto w-full" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1.5 pb-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {LEGEND.map(([color, label]: string[]) => (
            <span key={label} className="flex items-center gap-1.5">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
        <Toggle checked={showMesh} onChange={setShowMesh} label="Mesh" />
      </div>
    </div>
  );
}

/* ---------- Cards ---------- */

function ShapeCard({ shape, m }: { shape: Shape; m: Metrics }) {
  const top = shape.matches.slice(0, 3);
  return (
    <Card title="Face shape">
      <p className="text-[15px] text-ink">{SHAPE_NOTES[shape.best as keyof typeof SHAPE_NOTES]}</p>
      <div className="flex items-center gap-4 rounded-2xl bg-sage-soft px-4 py-3.5">
        <svg viewBox="0 0 40 52" className="h-14 w-11 flex-none" aria-hidden>
          <path d={SHAPE_PATHS[shape.best]} fill="none" stroke="var(--color-sage)" strokeWidth="2" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl leading-none font-semibold text-ink-strong">{shape.best}</p>
          <p className="mt-1 text-sm text-muted">your face shape</p>
        </div>
        <span className="tabular font-display text-2xl font-semibold text-sage">{Math.round(top[0].share * 100)}%</span>
      </div>

      {top[0].share < 0.995 && (
        <div className="flex flex-col gap-1">
          <p className="mb-1 text-xs font-bold tracking-[0.06em] text-muted uppercase">Top matches</p>
          {top.map(({ name, share }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.07, type: 'spring', stiffness: 300, damping: 24 }}
              className="grid grid-cols-[22px_72px_1fr_40px] items-center gap-3 py-1.5 text-sm"
            >
              <svg viewBox="0 0 40 52" className="h-6 w-[18px]" aria-hidden>
                <path
                  d={SHAPE_PATHS[name]}
                  fill="none"
                  stroke={i === 0 ? 'var(--color-sage)' : 'var(--color-faint)'}
                  strokeWidth="2.6"
                />
              </svg>
              <span className={`font-semibold ${i === 0 ? 'text-ink-strong' : 'text-muted'}`}>{name}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-meter">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: i === 0 ? 'var(--color-sage)' : 'var(--color-faint)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, share * 100)}%` }}
                  transition={{ delay: 0.35 + i * 0.07, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="tabular text-right text-muted">{Math.round(share * 100)}%</span>
            </motion.div>
          ))}
        </div>
      )}
      <Expandable headerClassName="pt-1" header={<span className="text-sm font-semibold text-muted">How it’s measured</span>}>
        <Explain>
          Your face’s width is measured at 19 heights down the outline (the dots on your photo), then compared with each
          shape: how long the face is for its width, and how the forehead, jaw and chin compare with the widest point.
        </Explain>
        <dl className="grid grid-cols-4 gap-2 pb-1">
          <Fact label="Length" value={m.outlineLength.toFixed(2)} />
          <Fact label="Forehead" value={pct(m.outlineForehead)} />
          <Fact label="Jaw" value={pct(m.outlineJaw)} />
          <Fact label="Chin" value={pct(m.outlineChin)} />
        </dl>
      </Expandable>
    </Card>
  );
}

function SymmetryCard({ m }: { m: Metrics }) {
  const regions = [
    ['Eyes', m.symEyes],
    ['Brows', m.symBrows],
    ['Nose', m.symNose],
    ['Mouth', m.symMouth],
    ['Jaw', m.symJaw],
  ] as const;
  return (
    <Card
      title="Symmetry"
      aside={
        <span className="tabular font-display text-xl font-semibold text-ink-strong">
          {Math.round(m.symmetry)}
          <span className="text-sm text-muted">/100</span>
        </span>
      }
    >
      <div className="flex flex-col">
        {regions.map(([name, v], i) => {
          const [verdict, text] = readSymmetry(name, v);
          return (
            <Expandable
              key={name}
              headerClassName="py-2"
              header={
                <div className="grid grid-cols-[56px_1fr_28px] items-center gap-3 text-sm">
                  <span className="font-semibold">{name}</span>
                  <Meter value={v} delay={0.3 + i * 0.08} />
                  <span className="tabular text-right text-muted">{Math.round(v)}</span>
                </div>
              }
            >
              <Explain verdict={verdict}>{text}</Explain>
            </Expandable>
          );
        })}
      </div>
      <p className="text-[13px] text-muted">
        No face is perfectly symmetric. Scores in the 80s and 90s are typical, and lighting and expression shift them.
      </p>
    </Card>
  );
}

function ThirdsCard({ m }: { m: Metrics }) {
  const [verdict, text] = readThirds(m);
  const parts = [
    ['Upper', m.thirdUpper, 'var(--color-t1)', 'Hairline to brows'],
    ['Middle', m.thirdMiddle, 'var(--color-t2)', 'Brows to nose base'],
    ['Lower', m.thirdLower, 'var(--color-t3)', 'Nose base to chin'],
  ] as const;
  return (
    <Card title="Facial thirds" aside={<span className="text-[13px] font-semibold text-muted">{verdict}</span>}>
      <div className="flex gap-4">
        {/* Vertical bar, like the face itself */}
        <div className="flex w-3 flex-none flex-col gap-[3px]">
          {parts.map(([label, v, color], i) => (
            <motion.div
              key={label}
              className="w-full rounded-full"
              style={{ background: color }}
              initial={{ flexGrow: 0.001 }}
              animate={{ flexGrow: v }}
              transition={{ delay: 0.35 + i * 0.1, type: 'spring', stiffness: 120, damping: 18 }}
            />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2.5">
          {parts.map(([label, v, color, span]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <i className="h-2 w-2 rounded-full" style={{ background: color }} />
                  {label}
                </p>
                <p className="text-xs text-muted">{span}</p>
              </div>
              <span className="tabular font-display text-xl text-ink-strong">{pct(v)}</span>
            </div>
          ))}
        </div>
      </div>
      <Explain>{text}</Explain>
      <p className="text-[13px] text-muted">
        The classical guide is three equal thirds.{' '}
        {m.hairlineFound
          ? 'Your hairline was detected from the photo.'
          : 'No clear hairline was found (hair pulled back, bangs or a hat can cause this), so the upper third is measured from partway up the forehead and reads short.'}
      </p>
    </Card>
  );
}

/* ---------- Features ---------- */

type Group = (typeof FEATURE_GROUPS)[number];

function Features({ m }: { m: Metrics }) {
  const [active, setActive] = useState(FEATURE_GROUPS[0].title);
  const group = FEATURE_GROUPS.find((g) => g.title === active)!;
  const color = GROUP_COLORS[group.title];
  return (
    <Card title="Features" className="min-[820px]:p-6">
      <p className="-mt-1 text-[13px] text-muted">Pick a feature, then tap any measurement for what it means.</p>
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-1 [mask-image:linear-gradient(90deg,transparent,#000_1.25rem,#000_calc(100%-2.5rem),transparent)] min-[820px]:mx-0 min-[820px]:flex-wrap min-[820px]:px-0 min-[820px]:[mask-image:none]">
        {FEATURE_GROUPS.map((g) => {
          const on = g.title === active;
          return (
            <button
              key={g.title}
              onClick={() => setActive(g.title)}
              className={`relative flex flex-none cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                on ? 'text-ink-strong' : 'text-muted hover:text-ink'
              }`}
            >
              {on && (
                <motion.span
                  layoutId="feature-tab"
                  className="absolute inset-0 rounded-full bg-raised"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <i className="relative h-2 w-2 rounded-full" style={{ background: GROUP_COLORS[g.title] }} />
              <span className="relative">{g.title}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={group.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-3"
        >
          <p className="font-display text-2xl font-semibold" style={{ color }}>
            {group.headline(m)}
          </p>
          <FeatureRows group={group} m={m} color={color} />
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}

function FeatureRows({ group, m, color }: { group: Group; m: Metrics; color: string }) {
  const rows = group.items
    .map((it) => {
      const value = m[it.key as keyof Metrics] as number;
      return { ...it, value, reading: Number.isFinite(value) ? (it.read(value) as [string, string, string]) : null };
    })
    .filter((r) => r.reading);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-2 min-[820px]:grid-cols-2">
      {rows.map(({ label, format, measures, typical, spread, value, reading }) => (
        <Expandable
          key={label}
          className="rounded-2xl bg-raised px-4 transition-colors hover:bg-[#2d2b29]"
          headerClassName="py-3"
          header={
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted">{label}</p>
                <p className="text-[15px] leading-snug font-semibold text-ink">{reading![0]}</p>
              </div>
              <span className="tabular text-right text-sm text-muted">{format(value)}</span>
              <Scale value={value} typical={typical} spread={spread} color={color} />
            </div>
          }
        >
          <Explain note={measures}>{reading![1]}</Explain>
        </Expandable>
      ))}
    </div>
  );
}

/** Where a value sits relative to typical: the shaded middle is the typical range. */
function Scale({ value, typical, spread, color }: { value: number; typical: number; spread: number; color: string }) {
  const range = 2.5 * spread;
  const pos = Math.max(0, Math.min(1, (value - typical + range) / (2 * range)));
  const band = (0.75 * spread) / (2 * range);
  return (
    <div className="relative col-span-2 h-1.5 rounded-full bg-meter" aria-hidden>
      <div
        className="absolute inset-y-0 rounded-full bg-muted/25"
        style={{ left: `${(0.5 - band) * 100}%`, right: `${(0.5 - band) * 100}%` }}
      />
      <motion.div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-raised"
        style={{ background: color }}
        initial={{ left: '50%' }}
        animate={{ left: `${pos * 100}%` }}
        transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.1 }}
      />
    </div>
  );
}

/* ---------- Small pieces ---------- */

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-raised px-2.5 py-2">
      <dt className="text-[11px] font-semibold text-muted">{label}</dt>
      <dd className="tabular text-base text-ink-strong">{value}</dd>
    </div>
  );
}

function Meter({ value, delay = 0 }: { value: number; delay?: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-meter">
      <motion.div
        className="h-full rounded-full bg-sage"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function Explain({ verdict, children, note }: { verdict?: string; children: ReactNode; note?: string }) {
  return (
    <div className="mt-1 mb-3 flex flex-col gap-1.5 rounded-xl bg-bg px-3.5 py-3 text-sm leading-relaxed">
      {verdict && <p className="font-bold text-ink-strong">{verdict}</p>}
      <p>{children}</p>
      {note && <p className="text-[13px] text-muted">{note}</p>}
    </div>
  );
}
