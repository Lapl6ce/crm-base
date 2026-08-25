import { cn } from '@/lib/cn';
import type { Heat } from '@/lib/heat';

/* The signature element (CONTEXT.md §4): a 3px temperature edge on every record.
 *
 * The stripe is decorative — aria-hidden — because its meaning is always
 * printed next to it as text (see HeatLabel). Colour alone never carries
 * information in this app. */

export interface HeatStripeProps {
  heat: Heat;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export function HeatStripe({ heat, orientation = 'vertical', className }: HeatStripeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'shrink-0 rounded-full',
        orientation === 'vertical' ? 'w-[3px] self-stretch' : 'h-[3px] w-full',
        className,
      )}
      style={{
        backgroundColor: heat.color,
        // Settled records (won/lost/done) keep the stripe but drop out of the
        // heat conversation entirely.
        opacity: heat.settled ? 0.35 : 1,
      }}
    />
  );
}

/** The words that make the stripe redundant. Always render one with the other. */
export function HeatLabel({ heat, className }: { heat: Heat; className?: string }) {
  if (!heat.label) return null;
  return (
    <span
      className={cn(
        'text-xs tnum',
        heat.tone === 'hot' ? 'font-medium text-accent-600' : 'text-ink-300',
        className,
      )}
    >
      {heat.label}
    </span>
  );
}
