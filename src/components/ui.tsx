import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react';

const spring = { type: 'spring', stiffness: 400, damping: 25 } as const;

type ButtonProps = HTMLMotionProps<'button'> & { variant?: 'primary' | 'ghost' | 'big' | 'quiet' };

export function Button({ variant = 'ghost', className = '', ...props }: ButtonProps) {
  const styles = {
    primary:
      'bg-sage text-bg font-bold px-4 py-2.5 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_20px_-10px_rgba(147,173,156,0.6)] hover:brightness-105',
    ghost:
      'border border-line bg-raised/60 text-ink font-semibold px-4 py-2.5 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-faint hover:bg-raised',
    quiet: 'text-muted font-semibold px-3 py-2 rounded-xl hover:text-ink hover:bg-raised/60',
    big: 'bg-sage text-bg font-display font-semibold text-lg px-8 py-3.5 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_30px_-8px_rgba(147,173,156,0.45)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_36px_-8px_rgba(147,173,156,0.55)]',
  }[variant];
  return (
    <motion.button
      whileHover={{ scale: variant === 'big' ? 1.04 : 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={spring}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 text-sm transition-[filter,box-shadow,border-color,background-color,color] disabled:cursor-default disabled:opacity-40 ${styles} ${className}`}
      {...props}
    />
  );
}

/** Pill switch with a springy knob. */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="-my-2 flex cursor-pointer items-center gap-2.5 py-2 text-[13px] font-semibold text-muted"
    >
      <span
        className={`flex h-[22px] w-[38px] items-center rounded-full p-[3px] transition-colors ${checked ? 'justify-end bg-sage' : 'justify-start bg-meter'}`}
      >
        <motion.span layout transition={spring} className="h-4 w-4 rounded-full bg-ink-strong shadow" />
      </span>
      {label}
    </button>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 12 12"
      className="h-3 w-3 flex-none text-muted"
      animate={{ rotate: open ? 180 : 0 }}
      transition={spring}
      aria-hidden
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

/** A row that expands to reveal more, with a smooth height animation. */
export function Expandable({
  header,
  children,
  defaultOpen = false,
  className = '',
  headerClassName = '',
}: {
  header: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`group flex w-full cursor-pointer items-center gap-3 text-left ${headerClassName}`}
      >
        <div className="min-w-0 flex-1">{header}</div>
        <Chevron open={open} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-xs font-bold tracking-[0.06em] text-muted uppercase ${className}`}>{children}</p>;
}

/** Soft card with an optional title row. */
export function Card({
  title,
  aside,
  children,
  className = '',
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section variants={rise} className={`card flex flex-col gap-3 p-5 min-[820px]:p-6 ${className}`}>
      {title && (
        <div className="mb-0.5 flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-semibold text-ink-strong">{title}</h3>
          {aside}
        </div>
      )}
      {children}
    </motion.section>
  );
}

/** Small line icons (stroke = currentColor). */
const ICONS = {
  lock: 'M5 7V5a3 3 0 0 1 6 0v2 M4 7h8v6H4z',
  arrow: 'M3 8h10 M9 4l4 4-4 4',
  share: 'M8 2v8 M5 5l3-3 3 3 M3 9v4h10V9',
  retry: 'M3 8a5 5 0 1 0 1.5-3.5 M3 2.5v2.5h2.5',
  camera: 'M2 5h3l1.2-2h3.6L11 5h3v8H2z M8 11a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 8 11z',
  check: 'M3.5 8.5l3 3 6-7',
  download: 'M8 2v8 M5 7l3 3 3-3 M3 13h10',
  close: 'M4 4l8 8 M12 4l-8 8',
} as const;

export function Icon({ name, className = 'h-4 w-4' }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`flex-none ${className}`} aria-hidden>
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Shared stagger presets for lists of things that animate in. */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
export const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
} as const;
