import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* One button, four intents. `danger` is deliberately darker than the accent so
   "delete" never reads as the primary action on a screen (CONTEXT.md §4). */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-600 disabled:bg-accent-500/50',
  secondary:
    'bg-surface-card text-ink-700 ring-1 ring-inset ring-ink-150 hover:bg-surface-app hover:ring-ink-300 disabled:text-ink-300',
  ghost: 'bg-transparent text-ink-500 hover:bg-ink-100/70 hover:text-ink-900 disabled:text-ink-150',
  danger: 'bg-danger-600 text-white hover:brightness-110 disabled:bg-danger-600/50',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-base gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading glyph. Icon-only buttons must still pass an aria-label. */
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center rounded font-medium',
        'motion-safe:transition-colors motion-safe:duration-150',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

function Spinner() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Square, icon-only. Kept separate so the aria-label requirement is visible. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'icon' | 'children' | 'fullWidth'> & { label: string; children: ReactNode }
>(function IconButton({ label, className, size = 'md', children, ...props }, ref) {
  return (
    <Button
      ref={ref}
      aria-label={label}
      title={label}
      size={size}
      className={cn('p-0', size === 'sm' ? 'w-8' : 'w-9', className)}
      {...props}
    >
      {children}
    </Button>
  );
});
