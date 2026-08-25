import { Card, CardBody, CardHeader } from '@/components/Card';
import { useResource } from '@/data/useResource';
import { PhasePlaceholder } from '@/layout/PhasePlaceholder';

/* Phase 5 replaces this with KPI cards and charts.
   Until then it doubles as a live smoke test of the data layer: these numbers
   come through the DataProvider interface exactly as the real dashboard will. */

export function DashboardPage() {
  const { data, loading, error } = useResource(
    async (provider) => {
      const [contacts, companies, deals, tasks, users, activity] = await Promise.all([
        provider.contacts.list({ pageSize: 1 }),
        provider.companies.list({ pageSize: 1 }),
        provider.deals.list({ pageSize: 1 }),
        provider.tasks.list({ pageSize: 1 }),
        provider.users.all(),
        provider.activity.list({ pageSize: 1 }),
      ]);
      return {
        contacts: contacts.total,
        companies: companies.total,
        deals: deals.total,
        tasks: tasks.total,
        users: users.length,
        activity: activity.total,
      };
    },
    [],
    { watch: ['contacts', 'companies', 'deals', 'tasks', 'users', 'activity'] },
  );

  const rows: [string, number | undefined][] = [
    ['Contacts', data?.contacts],
    ['Companies', data?.companies],
    ['Deals', data?.deals],
    ['Tasks', data?.tasks],
    ['Users', data?.users],
    ['Activity events', data?.activity],
  ];

  return (
    <PhasePlaceholder
      title="Dashboard"
      phase="Phase 5"
      summary="KPI cards and charts land in Phase 5. This panel reads through the same repository interfaces they will use."
    >
      <Card>
        <CardHeader title="Data layer check" />
        <CardBody>
          {error ? (
            <p className="text-base text-danger-600">{error.message}</p>
          ) : (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-2xs uppercase tracking-wide text-ink-300">{label}</dt>
                  <dd className="font-display text-lg font-semibold text-ink-900 tnum">
                    {loading ? '—' : (value ?? 0)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardBody>
      </Card>
    </PhasePlaceholder>
  );
}
