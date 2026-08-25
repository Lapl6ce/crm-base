import type { ReactNode } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from './PageHeader';

/* SCAFFOLD ONLY — every use of this is replaced by the real module in its phase.
   It exists so the shell is navigable and reviewable before the modules land. */

export function PhasePlaceholder({
  title,
  phase,
  summary,
  children,
}: {
  title: string;
  phase: string;
  summary: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} meta={phase} description={summary} />
      {children ?? (
        <Card>
          <EmptyState
            title="Not built yet"
            description={`This screen arrives in ${phase}. The shell, routing, tokens and data layer it will sit on are already in place.`}
          />
        </Card>
      )}
    </div>
  );
}
