import { useEffect, useState } from 'react';
import { animate } from 'motion/react';

/** Animates a number from 0 up to `value`. */
export function useCountUp(value: number, { duration = 1.1, delay = 0 } = {}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setN(v),
    });
    return () => controls.stop();
  }, [value, duration, delay]);
  return n;
}
