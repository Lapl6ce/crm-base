import { useState } from 'react';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { PageHeader } from '@/layout/PageHeader';

export function ActivityFeedPage() {
  const [filterType, setFilterType] = useState<string>('all');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Live Activity Feed"
        description="Real-time chronological telemetry log of all mutations, stage movements, payments, and team engagements across the platform."
      />

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded bg-surface-sunken p-0.5">
          {(
            [
              { id: 'all', label: 'All Activities' },
              { id: 'deal', label: 'Deals & Stages' },
              { id: 'contact', label: 'Contacts & Leads' },
              { id: 'task', label: 'Tasks' },
              { id: 'note', label: 'Notes' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filterType === tab.id
                  ? 'bg-surface-card text-ink-900 shadow-sm'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Telemetry Stream"
          action={
            <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-positive-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-positive-500" />
              Live Connected
            </span>
          }
        />
        <CardBody className="p-4">
          <ActivityTimeline limit={50} />
        </CardBody>
      </Card>
    </div>
  );
}
