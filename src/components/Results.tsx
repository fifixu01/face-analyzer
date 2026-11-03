import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { faceShape } from '../lib/analyze.js';
import { drawMesh, drawMeasurements, LEGEND } from '../lib/draw.js';
import { FEATURE_GROUPS, readSymmetry, readThirds } from '../lib/explain.js';
import { SHAPE_NOTES, summaryText } from '../lib/report-text.js';
import type { analyzeStill } from '../lib/analyzeStill.js';
import { useCountUp } from '../hooks/useCountUp';
import { AnimalCard } from './AnimalCard';
import { ShareModal } from './ShareModal';
import { Button, Expandable, Eyebrow, Toggle, rise, stagger } from './ui';

export type StillResult = NonNullable<Awaited<ReturnType<typeof analyzeStill>>>;
type Metrics = StillResult['metrics'];

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function Results({ result, onRetake }: { result: StillResult; onRetake: () => void }) {
  const { metrics: m, issues, expressions } = result;
  const shape = faceShape(m);
  const [sharing, setSharing] = useState(false);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 min-[820px]:grid-cols-2"
    >
      {/* Left: photo + summary */}
      <div className="flex flex-col gap-4">
        <motion.div variants={rise}>
          <ResultPhoto result={result} onRetake={onRetake} onShare={() => setSharing(true)} />
        </motion.div>

        <motion.div variants={rise} className="flex flex-col gap-4 border-t border-line pt-5">
          {issues.length > 0 && (
            <div className="rounded-xl bg-ochre-soft px-4 py-3 text-sm">
              <p className="font-semibold text-ochre">This shot may affect accuracy</p>
              <ul className="mt-1.5 list-disc pl-5">
                {issues.map((i: string) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          <Hero shape={shape.best} symmetry={m.symmetry} />
          <p className="text-base leading-relaxed">{summaryText(m, shape)}</p>
          {expressions.length > 0 && <p className="text-[13px] text-muted">Expression detected: {expressions.join(', ')}</p>}
        </motion.div>

        <motion.div variants={rise}>
          <AnimalCard metrics={m} />
        </motion.div>
      </div>

      {/* Right: details */}
      <div className="flex flex-col gap-5">
        <Block title="Face shape" first>
          <p>{SHAPE_NOTES[shape.best as keyof typeof SHAPE_NOTES]}</p>
          <ShapeMatches matches={shape.matches} />
          <Expandable headerClassName="py-1" header={<span className="text-sm text-muted">How it's measured</span>}>
            <Explain>
              Your face's width is measured at 19 heights down the outline (the dots on your photo), then that
              profile is compared with each shape: how long the face is for its width, and how the forehead, jaw
              and chin compare with the widest point.
            </Explain>
            <dl className="mb-2 grid grid-cols-2 gap-x-2 gap-y-3 min-[480px]:grid-cols-4">
              <Fact label="Length to width" value={m.outlineLength.toFixed(2)} />
              <Fact label="Forehead" value={pct(m.outlineForehead)} />
              <Fact label="Jaw" value={pct(m.outlineJaw)} />
              <Fact label="Chin" value={pct(m.outlineChin)} />
            </dl>
          </Expandable>
        </Block>

        <Block title="Symmetry by region">
          {(
            [
              ['Eyes', m.symEyes],
              ['Brows', m.symBrows],
              ['Nose', m.symNose],
              ['Mouth', m.symMouth],
              ['Jaw', m.symJaw],
            ] as const
          ).map(([name, v], i) => {
            const [verdict, text] = readSymmetry(name, v);
            return (
              <Expandable
                key={name}
                headerClassName="py-1"
                header={
                  <div className="grid grid-cols-[64px_1fr_28px] items-center gap-3 text-sm">
                    <span>{name}</span>
                    <Meter value={v} delay={0.3 + i * 0.08} />
                    <span className="tabular text-right text-muted">{Math.round(v)}</span>
                  </div>
                }
              >
                <Explain verdict={verdict}>{text}</Explain>
              </Expandable>
            );
          })}
          <p className="text-[13px] text-muted">
            No face is perfectly symmetric. Scores in the 80s and 90s are typical, and lighting and expression shift them.
          </p>
        </Block>

        <Block title="Facial thirds">
          <Thirds m={m} />
        </Block>

        <Block title="Features">
          <p className="text-[13px] text-muted">Open a group for its measurements, then select any row for what it means.</p>
          <div className="flex flex-col gap-2">
            {FEATURE_GROUPS.map((group, gi) => (
              <FeatureGroup key={group.title} group={group} m={m} defaultOpen={gi === 0} />
            ))}
          </div>
        </Block>

        <motion.p variants={rise} className="border-t border-line pt-4 text-[13px] text-muted">
          The shaded part of each bar is the typical range, centered on MediaPipe’s average face. These are 2D
          estimates from a single photo, not a measure of attractiveness.
        </motion.p>
      </div>

      <ShareModal open={sharing} onClose={() => setSharing(false)} metrics={m} />
    </motion.div>
  );
}

function ResultPhoto({ result, onRetake, onShare }: { result: StillResult; onRetake: () => void; onShare: () => void }) {
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
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-frame">
        <canvas ref={canvasRef} className="block h-auto w-full" />
      </div>
      <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {LEGEND.map(([color, label]: string[]) => (
          <span key={label} className="flex items-center gap-1.5">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={onShare}>
          Share results
        </Button>
        <Button onClick={onRetake}>Try again</Button>
        <Toggle checked={showMesh} onChange={setShowMesh} label="Show mesh" />
      </div>
    </div>
  );
}

function Hero({ shape, symmetry }: { shape: string; symmetry: number }) {
  const n = useCountUp(symmetry, { delay: 0.3 });
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Eyebrow>Face shape</Eyebrow>
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.25 }}
          className="origin-left font-display text-4xl font-semibold tracking-tight"
        >
          {shape}
        </motion.p>
      </div>
      <div>
        <Eyebrow>Symmetry</Eyebrow>
        <p className="font-display text-4xl font-semibold tracking-tight">
          <span className="tabular">{Math.round(n)}</span>
          <span className="ml-0.5 text-base text-muted">/100</span>
        </p>
      </div>
    </div>
  );
}

function ShapeMatches({ matches }: { matches: { name: string; share: number }[] }) {
  return (
    <div className="flex flex-col gap-2 py-1">
      {matches.map(({ name, share }, i) => (
        <div
          key={name}
          className={`grid grid-cols-[64px_1fr_36px] items-center gap-3 text-sm ${i === 0 ? 'text-ink-strong' : 'text-muted'}`}
        >
          <span className={i === 0 ? 'font-semibold' : ''}>{name}</span>
          <Meter value={share * 100} delay={0.3 + i * 0.06} />
          <span className="tabular text-right">{Math.round(share * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

function Block({ title, children, first = false }: { title: string; children: ReactNode; first?: boolean }) {
  return (
    <motion.section variants={rise} className={`flex flex-col gap-2.5 ${first ? '' : 'border-t border-line pt-5'}`}>
      <h3 className="mb-1 text-[13px] font-bold tracking-[0.05em] text-muted uppercase">{title}</h3>
      {children}
    </motion.section>
  );
}

function Fact({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        {dot && <i className={`inline-block h-2 w-2 rounded-full ${dot}`} />}
        {label}
      </dt>
      <dd className="tabular text-base">{value}</dd>
    </div>
  );
}

function Meter({ value, delay = 0 }: { value: number; delay?: number }) {
  return (
    <div className="h-1 overflow-hidden rounded bg-meter">
      <motion.div
        className="h-full rounded bg-sage"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

function Explain({ verdict, children, note }: { verdict?: string; children: ReactNode; note?: string }) {
  return (
    <div className="mt-1 mb-2.5 flex flex-col gap-1.5 rounded-lg bg-raised px-3 py-2.5 text-sm leading-relaxed">
      {verdict && <p className="font-semibold">{verdict}</p>}
      <p>{children}</p>
      {note && <p className="text-[13px] text-muted">{note}</p>}
    </div>
  );
}

function Thirds({ m }: { m: Metrics }) {
  const [verdict, text] = readThirds(m);
  const parts = [
    ['Upper', m.thirdUpper, 'bg-t1'],
    ['Middle', m.thirdMiddle, 'bg-t2'],
    ['Lower', m.thirdLower, 'bg-t3'],
  ] as const;
  return (
    <>
      <div className="flex h-1.5 gap-[3px]">
        {parts.map(([label, v, color], i) => (
          <motion.div
            key={label}
            className={`rounded-full ${color}`}
            initial={{ flexGrow: 0.001 }}
            animate={{ flexGrow: v }}
            transition={{ delay: 0.35 + i * 0.1, type: 'spring', stiffness: 120, damping: 18 }}
          />
        ))}
      </div>
      <dl className="mt-1 grid grid-cols-3 gap-2">
        {parts.map(([label, v, color]) => (
          <Fact key={label} label={label} value={pct(v)} dot={color} />
        ))}
      </dl>
      <Expandable headerClassName="py-1" header={<span className="text-sm">{verdict}</span>}>
        <Explain>{text}</Explain>
      </Expandable>
      <p className="text-[13px] text-muted">
        Hairline to brows, brows to nose base, nose base to chin. The classical guide is equal thirds.{' '}
        {m.hairlineFound
          ? 'The hairline was detected from the photo.'
          : 'No clear hairline was found (hair pulled back, bangs or a hat can cause this), so the upper third is measured from partway up the forehead and reads short.'}
      </p>
    </>
  );
}

type Group = (typeof FEATURE_GROUPS)[number];

function FeatureGroup({ group, m, defaultOpen }: { group: Group; m: Metrics; defaultOpen: boolean }) {
  const rows = group.items
    .map((it) => {
      const value = m[it.key as keyof Metrics] as number;
      return { ...it, value, reading: Number.isFinite(value) ? (it.read(value) as [string, string, string]) : null };
    })
    .filter((r) => r.reading);
  return (
    <Expandable
      defaultOpen={defaultOpen}
      className="rounded-xl border border-line bg-surface"
      headerClassName="px-3.5 py-3"
      header={
        <div className="flex items-center gap-3">
          <span className="flex-none font-semibold">{group.title}</span>
          <span className="min-w-0 flex-1 truncate text-right text-[13px] text-muted">{group.headline(m)}</span>
        </div>
      }
    >
      <div className="border-t border-line px-3.5 pb-1">
        {rows.map(({ label, format, measures, typical, spread, value, reading }) => (
          <Expandable
            key={label}
            className="border-b border-line last:border-b-0"
            headerClassName="py-2.5"
            header={
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
                <div className="min-w-0">
                  <p className="text-sm">{label}</p>
                  <p className="text-[13px] text-muted">{reading![0]}</p>
                </div>
                <span className="tabular text-right text-base">{format(value)}</span>
                <Scale value={value} typical={typical} spread={spread} />
              </div>
            }
          >
            <Explain note={measures}>{reading![1]}</Explain>
          </Expandable>
        ))}
      </div>
    </Expandable>
  );
}

/** Where a value sits relative to typical: the shaded middle is the typical range. */
function Scale({ value, typical, spread }: { value: number; typical: number; spread: number }) {
  const range = 2.5 * spread;
  const pos = Math.max(0, Math.min(1, (value - typical + range) / (2 * range)));
  const band = (0.75 * spread) / (2 * range);
  return (
    <div className="relative col-span-2 h-1 rounded bg-meter" aria-hidden>
      <div className="absolute inset-y-0 rounded bg-muted/35" style={{ left: `${(0.5 - band) * 100}%`, right: `${(0.5 - band) * 100}%` }} />
      <motion.div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sage"
        initial={{ left: '50%' }}
        animate={{ left: `${pos * 100}%` }}
        transition={{ type: 'spring', stiffness: 140, damping: 18, delay: 0.1 }}
      />
    </div>
  );
}
