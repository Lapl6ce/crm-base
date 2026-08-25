import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { readableTextOn } from '@/lib/tokens';

/* Initials chips. No image support on purpose: there is no file storage in v1
   (CONTEXT.md §6), and a broken <img> is worse than a good monogram. */

export interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-11 w-11 text-base',
} as const;

export function Avatar({ name, color = '#2A2E33', size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-semibold',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color, color: readableTextOn(color) }}
      title={name}
    >
      <span aria-hidden="true">{initials(name)}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}
