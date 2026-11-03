import { motion } from 'motion/react';
import { animalType } from '../lib/fun.js';
import { Eyebrow } from './ui';

/** "Just for fun" animal reveal: the card flips in, then the name and traits pop. */
export function AnimalCard({ metrics }: { metrics: Parameters<typeof animalType>[0] }) {
  const { primary, secondary } = animalType(metrics);
  return (
    <motion.section
      initial={{ opacity: 0, rotateX: -25, y: 20 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.5 }}
      style={{ transformPerspective: 800 }}
      className="card relative flex flex-col gap-3 overflow-hidden p-5 min-[820px]:p-6"
    >
      {/* Warm corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(224,182,110,0.16), transparent)' }}
      />
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl font-semibold text-ink-strong">Animal type</h3>
        <Eyebrow className="rounded-full border border-line px-2 py-0.5 text-[10px]">Just for fun</Eyebrow>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.85 }}
            className="origin-left font-display text-5xl leading-none font-semibold tracking-tight text-amber"
          >
            {primary.animal}
          </motion.p>
        </div>
        <p className="rounded-full bg-raised/60 px-2.5 py-1 text-[13px] font-semibold text-muted">with a touch of {secondary.animal.toLowerCase()}</p>
      </div>
      <p className="text-[15px]">{primary.blurb}</p>
      {primary.traits.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {primary.traits.map((t: string, i: number) => (
            <motion.li
              key={t}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 1.05 + i * 0.08 }}
              className="rounded-full border border-line bg-raised/60 px-3 py-1 text-[13px] font-semibold"
            >
              {t}
            </motion.li>
          ))}
        </ul>
      )}
      <p className="text-xs text-faint">Based on eye tilt, eye shape and size, jaw taper and face proportions. Not scientific.</p>
    </motion.section>
  );
}
