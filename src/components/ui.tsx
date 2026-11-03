import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react';

const spring = { type: 'spring', stiffness: 400, damping: 25 } as const;

type ButtonProps = HTMLMotionProps<'button'> & { variant?: 'primary' | 'ghost' | 'big' };

export function Button({ variant = 'ghost', className = '', ...props }: ButtonProps) {
  const styles = {
    primary: 'bg-sage text-bg font-bold px-4 py-2.5 rounded-xl hover:brightness-105',
    ghost: 'border border-line bg-surface text-ink px-4 py-2.5 rounded-xl hover:border-muted',
    big: 'bg-sage text-bg font-display font-semibold text-lg px-9 py-3.5 rounded-full shadow-[0_6px_24px_rgba(143,168,152,0.2)] hover:shadow-[0_10px_30px_rgba(143,168,152,0.3)]',
  }[variant];
  return (
    <motion.button
      whileHover={{ scale: variant === 'big' ? 1.04 : 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={spring}
      className={`cursor-pointer text-sm transition-[filter,box-shadow,border-color] disabled:cursor-default disabled:opacity-40 ${styles} ${className}`}
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
      className="-my-2 flex cursor-pointer items-center gap-2.5 py-2 text-[13px] text-muted"
    >
      <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${checked ? 'justify-end bg-sage' : 'justify-start bg-meter'}`}>
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

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold tracking-[0.05em] text-muted uppercase">{children}</p>;
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
