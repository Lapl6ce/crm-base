import { useCallback, useState } from 'react';
import { toast } from '@/components/Toast';
import { useData } from '@/data/DataProvider';
import { useSession } from '@/data/useSession';
import { seedDemoData, type SeedSummary } from './seed';

/* ⚠ DEMO ONLY — deleted before client handoff.
 *
 * The seam. Core code touches Demo Mode through this hook and nowhere else, so
 * deleting src/demo/ breaks exactly two files (the sidebar badge and the
 * Settings toggle) and both already render nothing when it is off.
 *
 * Demo Mode owns the dataset. Turning it on wipes and re-seeds; turning it off
 * wipes back to first-boot. Half-demo, half-real data is the state where
 * someone loses work they thought was theirs, so it is not reachable — both
 * directions are destructive, and both are behind a confirmation.
 */

export interface DemoMode {
  enabled: boolean;
  busy: boolean;
  /** Wipe, seed, and flag the app as a demo. */
  enable: () => Promise<void>;
  /** Wipe back to a clean first-boot install. */
  disable: () => Promise<void>;
  /** Re-roll the dataset without leaving Demo Mode. */
  reseed: () => Promise<void>;
}

export function useDemoMode(): DemoMode {
  const provider = useData();
  const { settings } = useSession();
  const [busy, setBusy] = useState(false);

  const seedFresh = useCallback(async (): Promise<SeedSummary> => {
    await provider.reset();
    const summary = await seedDemoData(provider);
    await provider.settings.update({ demoMode: true });
    return summary;
  }, [provider]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const summary = await seedFresh();
      toast.success(
        `Demo data loaded — ${summary.companies} companies, ${summary.contacts} contacts, ${summary.deals} deals`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the demo data');
    } finally {
      setBusy(false);
    }
  }, [seedFresh]);

  const reseed = useCallback(async () => {
    setBusy(true);
    try {
      await seedFresh();
      toast.success('Demo data regenerated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not regenerate the demo data');
    } finally {
      setBusy(false);
    }
  }, [seedFresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await provider.reset();
      await provider.settings.update({ demoMode: false });
      toast.success('Demo data cleared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not clear the demo data');
    } finally {
      setBusy(false);
    }
  }, [provider]);

  return { enabled: settings?.demoMode ?? false, busy, enable, disable, reseed };
}
