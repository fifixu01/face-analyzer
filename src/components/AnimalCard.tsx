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
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5"
    >
      <Eyebrow>Just for fun</Eyebrow>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted">Your animal type</p>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.85 }}
            className="origin-left font-display text-4xl font-semibold tracking-tight"
          >
            {primary.animal}
          </motion.p>
        </div>
        <p className="text-[13px] text-muted">with a touch of {secondary.animal.toLowerCase()}</p>
      </div>
      <p>{primary.blurb}</p>
      {primary.traits.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {primary.traits.map((t: string, i: number) => (
            <motion.li
              key={t}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 1.05 + i * 0.08 }}
              className="rounded-full bg-raised px-2.5 py-0.5 text-[13px]"
            >
              {t}
            </motion.li>
          ))}
        </ul>
      )}
      <p className="text-[13px] text-muted">Based on eye tilt, eye shape and size, jaw taper and face proportions. Not scientific.</p>
    </motion.section>
  );
}
