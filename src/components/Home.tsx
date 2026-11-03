import { motion } from 'motion/react';
import { FaceArt } from './FaceArt';
import { Button, Icon, rise } from './ui';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

// Little dots that orbit the face art.
const ORBIT = [
  { size: 6, color: 'var(--color-teal)', radius: 112, duration: 18, delay: 0 },
  { size: 5, color: 'var(--color-coral)', radius: 128, duration: 24, delay: -8 },
  { size: 4, color: 'var(--color-amber)', radius: 100, duration: 14, delay: -5 },
  { size: 5, color: 'var(--color-t2)', radius: 128, duration: 30, delay: -18 },
];

export function Home({ onStart }: { onStart: () => void }) {
  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="relative flex min-h-[calc(100svh-5rem)] flex-col items-center justify-center gap-4 py-6 text-center"
    >
      {/* Soft drifting glow behind everything */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-[10%] inset-y-[12%] -z-10 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side at 38% 40%, rgba(147,173,156,0.15), transparent), radial-gradient(closest-side at 64% 52%, rgba(178,150,214,0.12), transparent), radial-gradient(closest-side at 50% 78%, rgba(222,134,122,0.07), transparent)',
        }}
        animate={{ scale: [1, 1.08, 1], rotate: [0, 4, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.p
        variants={rise}
        className="flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-semibold text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur"
      >
        <Icon name="lock" className="h-3.5 w-3.5 text-sage" />
        Private · Fifi will not steal ur pics dont worry
      </motion.p>

      <motion.div variants={rise} className="relative grid h-[270px] w-[270px] place-items-center">
        {/* Halo + orbiting dots */}
        <div className="absolute h-[210px] w-[210px] rounded-full border border-line/70 bg-surface/30" />
        <div className="absolute h-[256px] w-[256px] rounded-full border border-dashed border-line/50" />
        {ORBIT.map((o, i) => (
          <motion.div
            key={i}
            aria-hidden
            className="absolute"
            style={{ width: o.radius * 2, height: o.radius * 2 }}
            animate={{ rotate: 360 }}
            transition={{ duration: o.duration, repeat: Infinity, ease: 'linear', delay: o.delay }}
          >
            <span
              className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full"
              style={{ width: o.size, height: o.size, background: o.color, opacity: 0.8 }}
            />
          </motion.div>
        ))}
        <FaceArt />
      </motion.div>

      <motion.h1
        variants={{
          hidden: { opacity: 0, y: 24, scale: 0.92 },
          show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 16 } },
        }}
        className="bg-gradient-to-b from-ink-strong to-[#c9c2b8] bg-clip-text font-display text-[clamp(46px,10vw,84px)] leading-[0.95] font-bold tracking-tight text-transparent"
      >
        Face Analyzer
      </motion.h1>

      <motion.p variants={rise} className="-mt-1 max-w-md text-lg font-semibold text-muted">
        see how much you mog!
      </motion.p>

      <motion.div variants={rise} className="mt-3">
        <Button variant="big" onClick={onStart} className="group">
          <Icon name="camera" className="h-5 w-5" />
          Start camera
        </Button>
      </motion.div>
    </motion.section>
  );
}
