import { cn } from '@/lib/cn';

/* ⚠ DEMO ONLY — deleted before client handoff.

   The one piece of demo chrome in the app frame. It sits in the sidebar footer
   so that nobody demoing a fork can forget which dataset they are looking at,
   and so a screenshot taken from a demo is always identifiable as one. */

export function DemoBadge({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded bg-white/10 px-2 py-1.5',
        collapsed && 'justify-center px-0',
      )}
      title="Demo data — turn this off in Settings"
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500 motion-safe:animate-pulse"
      />
      {!collapsed && (
        <span className="truncate text-2xs font-semibold uppercase tracking-wide text-white">
          Demo data
        </span>
      )}
      <span className="sr-only">This app is showing generated demo data.</span>
    </div>
  );
}
