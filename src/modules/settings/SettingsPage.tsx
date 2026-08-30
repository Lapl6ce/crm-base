import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Tag } from '@/components/Tag';
import { useData } from '@/data/DataProvider';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { can } from '@/lib/rbac';
import { CompanyProfile } from './CompanyProfile';
import { StageEditor } from './StageEditor';
/* DEMO TOUCHPOINT 2 of 2. Deleting src/demo/ breaks this import and the Demo
   Mode card below; the rest of this screen is unaware Demo Mode exists. */
import { useDemoMode } from '@/demo/useDemoMode';

/* Settings — the fork's control panel.
 *
 * Three of the five items on the forking checklist live on this screen: the
 * company profile, the accent colour that repaints the app at runtime, and the
 * pipeline stages. None of them require a rebuild, which is the whole point:
 * handing a client their CRM should not mean editing their tokens.
 *
 * Demo Mode was pulled forward from Phase 6 — the dashboard and the reports are
 * impossible to review, and impossible to demo, against an empty database.
 */

export function SettingsPage() {
  const provider = useData();
  const { settings, user, stages } = useSession();
  const demo = useDemoMode();
  const [confirm, setConfirm] = useState<'enable' | 'disable' | 'reseed' | null>(null);

  const canManage = can(user, 'settings.manage');

  const CONFIRMATIONS = {
    enable: {
      title: 'Load demo data?',
      description:
        'This erases everything currently in the app and replaces it with a generated book of business. Anything you have entered yourself will be gone.',
      confirmLabel: 'Erase and load demo data',
      run: demo.enable,
    },
    disable: {
      title: 'Turn off Demo Mode?',
      description:
        'This erases the demo dataset and returns the app to a clean first-boot install. There is nothing to recover afterwards.',
      confirmLabel: 'Erase and turn off',
      run: demo.disable,
    },
    reseed: {
      title: 'Regenerate demo data?',
      description:
        'The current demo dataset is erased and rebuilt. Any edits you made while exploring will be gone.',
      confirmLabel: 'Regenerate',
      run: demo.reseed,
    },
  } as const;

  const active = confirm ? CONFIRMATIONS[confirm] : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Everything a fork changes per client, without a rebuild."
      />

      <Card>
        <CardHeader title="Company profile" />
        <CardBody>
          {settings ? (
            <CompanyProfile
              settings={settings}
              disabled={!canManage}
              onSave={(patch) => provider.settings.update(patch)}
            />
          ) : (
            <p className="text-base text-ink-300">Loading…</p>
          )}
          {!canManage && (
            <p className="mt-3 text-base text-ink-300">
              Only an admin can change this. Switch user from the top bar.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Pipeline stages" />
        <CardBody className="flex flex-col gap-3">
          <p className="max-w-2xl text-base text-ink-500">
            The board&rsquo;s columns are this list. Renaming a stage renames the column;
            a stage that closes a deal sets it to won or lost the moment a card lands in
            it. Removing one moves its deals to the first open stage rather than losing them.
          </p>
          <StageEditor
            stages={stages}
            disabled={!canManage}
            onSave={(next) => provider.settings.saveStages(next)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Demo Mode"
          action={
            demo.enabled ? <Tag tone="accent">On</Tag> : <Tag tone="neutral">Off</Tag>
          }
        />
        <CardBody className="flex flex-col gap-4">
          <p className="max-w-2xl text-base text-ink-500">
            {demo.enabled
              ? 'The app is showing generated data — a book of business with companies, contacts, a live pipeline, tasks and a quarter of history behind it. The sidebar carries a badge so a screenshot is always identifiable as a demo.'
              : 'Fill the app with a generated book of business: companies, contacts, a pipeline mid-flight, tasks that are actually overdue, and a quarter of activity history. Useful for reviewing the dashboard and reports, or for showing the CRM to someone.'}
          </p>

          {!canManage ? (
            <p className="text-base text-ink-300">
              Only an admin can change this. Switch user from the top bar.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {demo.enabled ? (
                <>
                  <Button onClick={() => setConfirm('reseed')} loading={demo.busy}>
                    Regenerate data
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setConfirm('disable')}
                    disabled={demo.busy}
                    className="text-danger-600 hover:bg-danger-100 hover:text-danger-600"
                  >
                    Turn off and erase
                  </Button>
                </>
              ) : (
                <Button variant="primary" onClick={() => setConfirm('enable')} loading={demo.busy}>
                  Load demo data
                </Button>
              )}
            </div>
          )}

          <p className="text-xs text-ink-300">
            Demo Mode owns the dataset: turning it on or off erases what is there
            first, so the app is never half demo and half real.
          </p>
        </CardBody>
      </Card>

      {active && (
        <ConfirmDialog
          open
          title={active.title}
          description={active.description}
          confirmLabel={active.confirmLabel}
          pending={demo.busy}
          onConfirm={async () => {
            await active.run();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
