import { motion } from 'motion/react';

const draw = (delay: number) => ({
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { pathLength: { delay, duration: 0.9, ease: 'easeInOut' as const }, opacity: { delay, duration: 0.2 } },
});

const DOTS = [
  [80, 34], [52, 46], [108, 46], [34, 96], [126, 96], [46, 140], [114, 140], [80, 172], [80, 66],
];

/** Line-drawn face that draws itself in, blinks, and floats. Colors match the mesh. */
export function FaceArt({ size = 132, thinking = false }: { size?: number; thinking?: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 160 200"
      width={size}
      aria-hidden
      animate={thinking ? { scale: [1, 1.05, 1] } : { y: [0, -8, 0] }}
      transition={{ duration: thinking ? 1.4 : 5, repeat: Infinity, ease: 'easeInOut' }}
      style={{ fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >
      <motion.ellipse cx="80" cy="100" rx="58" ry="78" stroke="rgba(211,206,198,0.45)" strokeWidth="2" {...draw(0)} />
      {DOTS.map(([cx, cy], i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          r="1.6"
          fill="rgba(211,206,198,0.35)"
          stroke="none"
          initial={{ scale: 0 }}
          animate={thinking ? { opacity: [0.2, 1, 0.2] } : { scale: 1 }}
          transition={thinking ? { duration: 1.2, repeat: Infinity, delay: i * 0.12 } : { delay: 0.6 + i * 0.05, type: 'spring' }}
        />
      ))}
      <motion.path d="M46 74 Q58 66 70 72" stroke="var(--color-amber)" strokeWidth="3" {...draw(0.5)} />
      <motion.path d="M90 72 Q102 66 114 74" stroke="var(--color-amber)" strokeWidth="3" {...draw(0.55)} />
      {/* Eyes blink every few seconds */}
      <motion.g
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        animate={{ scaleY: [1, 1, 0.1, 1] }}
        transition={{ duration: 4, times: [0, 0.9, 0.95, 1], repeat: Infinity, delay: 1.5 }}
      >
        <motion.path d="M48 88 Q58 80 68 88 Q58 94 48 88 Z" stroke="var(--color-teal)" strokeWidth="2.5" {...draw(0.7)} />
        <motion.path d="M92 88 Q102 80 112 88 Q102 94 92 88 Z" stroke="var(--color-teal)" strokeWidth="2.5" {...draw(0.75)} />
      </motion.g>
      <motion.path d="M80 92 L80 116 Q80 121 74 120" stroke="rgba(211,206,198,0.5)" strokeWidth="2" {...draw(0.9)} />
      <motion.path d="M64 138 Q72 132 80 136 Q88 132 96 138 Q80 150 64 138 Z" stroke="var(--color-coral)" strokeWidth="2.5" {...draw(1.0)} />
    </motion.svg>
  );
}
