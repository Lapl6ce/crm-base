import { Card, CardHeader } from '@/components/Card';
import { cn } from '@/lib/cn';
import { tokens } from '@/lib/tokens';
import { useId, useState, type ReactNode } from 'react';

export interface ChartCardProps {
  title: string;
  caption?: string;
  subtitle?: string;
  columns?: string[];
  rows?: (string | number)[][];
  children: ReactNode;
  height?: number;
  className?: string;
}

export function ChartCard({
  title,
  caption,
  subtitle,
  columns = [],
  rows = [],
  children,
  height = 260,
  className,
}: ChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const id = useId();
  const effectiveCaption = caption ?? subtitle;
  const hasTableData = columns.length > 0 && rows.length > 0;

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader
        title={title}
        action={
          hasTableData ? (
            <div className="flex gap-0.5 rounded bg-surface-sunken p-0.5" role="group" aria-label={`${title} view`}>
              {(['chart', 'table'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                  className={cn(
                    'rounded px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide',
                    'motion-safe:transition-colors',
                    view === option
                      ? 'bg-surface-card text-ink-900 shadow-sm'
                      : 'text-ink-300 hover:text-ink-700',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {effectiveCaption && (
        <p id={`${id}-caption`} className="px-4 pt-3 text-xs text-ink-300">
          {effectiveCaption}
        </p>
      )}

      {view === 'chart' ? (
        <figure
          className="m-0 px-2 py-3"
          style={{ height }}
          role="img"
          aria-label={`${title}. ${caption ?? ''} Switch to the table view for the underlying numbers.`}
        >
          {children}
        </figure>
      ) : (
        <div className="scroll-slim overflow-x-auto p-4" style={{ minHeight: height }}>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-ink-100">
                {columns.map((column, index) => (
                  <th
                    key={column}
                    scope="col"
                    className={cn(
                      'px-2 py-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-300',
                      index === 0 ? 'text-left' : 'text-right',
                    )}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row[0])} className="border-b border-ink-100 last:border-0">
                  {row.map((cell, index) => (
                    <td
                      key={index}
                      className={cn(
                        'px-2 py-1.5',
                        index === 0
                          ? 'text-left text-ink-700'
                          : 'tnum text-right font-mono text-ink-700',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export const GRID = tokens.ink[100];
export const AXIS_TEXT = { fill: tokens.ink[300], fontSize: 11 } as const;

export function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: ReactNode;
  rows: { key: string; label: string; value: string; color?: string }[];
}) {
  if (!active || rows.length === 0) return null;
  return (
    <div className="rounded border border-ink-100 bg-surface-card px-2.5 py-2 shadow-lg">
      {label != null && (
        <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ink-300">{label}</p>
      )}
      <ul className="flex flex-col gap-0.5">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2 text-xs">
            {row.color && (
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: row.color }}
              />
            )}
            <span className="text-ink-500">{row.label}</span>
            <span className="tnum ml-auto font-mono font-medium text-ink-900">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
