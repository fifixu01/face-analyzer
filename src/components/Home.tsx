import { motion } from 'motion/react';
import { FaceArt } from './FaceArt';
import { Button, rise } from './ui';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

export function Home({ onStart }: { onStart: () => void }) {
  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="relative flex min-h-[calc(100vh-120px)] flex-col items-center justify-center gap-[18px] py-5 text-center"
    >
      {/* Soft drifting glow behind everything */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-[15%] inset-y-[10%] -z-10 blur-2xl"
        style={{
          background:
            'radial-gradient(closest-side at 35% 40%, rgba(143,168,152,0.16), transparent), radial-gradient(closest-side at 68% 55%, rgba(178,150,214,0.12), transparent), radial-gradient(closest-side at 50% 75%, rgba(217,138,124,0.08), transparent)',
        }}
        animate={{ scale: [1, 1.06, 1], rotate: [0, 3, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.p
        variants={rise}
        className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold tracking-wide text-muted"
      >
        Private · Fifi will not steal ur pics dont worry
      </motion.p>

      <motion.div variants={rise} className="my-1">
        <FaceArt />
      </motion.div>

      <motion.h1
        variants={{
          hidden: { opacity: 0, y: 24, scale: 0.92 },
          show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 220, damping: 16 } },
        }}
        className="font-display text-[clamp(44px,9vw,80px)] leading-none font-bold tracking-tight text-ink-strong"
      >
        Face Analyzer
      </motion.h1>

      <motion.p variants={rise} className="max-w-md text-[17px] text-muted">
        see how much you mog!
      </motion.p>

      <motion.div variants={rise} className="mt-2">
        <Button variant="big" onClick={onStart}>
          Start camera
        </Button>
      </motion.div>
    </motion.section>
  );
}
