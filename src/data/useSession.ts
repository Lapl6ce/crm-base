import { useCallback } from 'react';
import { useData } from './DataProvider';
import { useResource } from './useResource';
import type { AppSettings, ID, PipelineStage, User } from './types';

/* The current user + app settings, which nearly every screen needs.
 *
 * There is no auth (CONTEXT.md §0): "who am I" is a settings field, swapped by
 * the user switcher. When real auth arrives this hook is where it lands, and
 * callers do not change. */

export interface Session {
  settings: AppSettings | undefined;
  user: User | null;
  users: User[];
  stages: PipelineStage[];
  loading: boolean;
  switchUser: (id: ID) => Promise<void>;
}

export function useSession(): Session {
  const provider = useData();

  const { data, loading } = useResource(
    async (p) => {
      const [settings, users] = await Promise.all([p.settings.get(), p.users.all()]);
      return { settings, users };
    },
    [],
    { watch: ['settings', 'users'] },
  );

  const switchUser = useCallback(
    async (id: ID) => {
      await provider.settings.update({ currentUserId: id });
    },
    [provider],
  );

  const settings = data?.settings;
  const users = data?.users ?? [];
  const user = users.find((u) => u.id === settings?.currentUserId) ?? users[0] ?? null;

  return {
    settings,
    user,
    users,
    stages: [...(settings?.stages ?? [])].sort((a, b) => a.order - b.order),
    loading,
    switchUser,
  };
}
