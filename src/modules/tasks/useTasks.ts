import { useCallback } from 'react';
import { useMutation, useResource } from '@/data/useResource';
import type { TaskCreate, TaskUpdate } from '@/data/repositories';
import type { Company, Contact, Deal, ID, ListQuery } from '@/data/types';

/* Every read and write the Tasks module performs. */

export function useTaskList(query: ListQuery) {
  return useResource((provider) => provider.tasks.list(query), [query], { watch: ['tasks'] });
}

export interface TaskLookups {
  contacts: Contact[];
  deals: Deal[];
  contactById: Map<ID, Contact>;
  dealById: Map<ID, Deal>;
  companyById: Map<ID, Company>;
}

/**
 * What a task points at. Tasks are the most cross-linked record in the app —
 * a task's row wants to say "Chase the order form · Ada Lovelace · Fleet
 * renewal" — so all three collections are resolved once here rather than one
 * lookup per row.
 */
export function useTaskLookups() {
  const state = useResource(
    async (provider) => {
      const [contacts, deals, companies] = await Promise.all([
        provider.contacts.list({ pageSize: 0, sort: { field: 'lastName', dir: 'asc' } }),
        provider.deals.list({ pageSize: 0, sort: { field: 'title', dir: 'asc' } }),
        provider.companies.list({ pageSize: 0 }),
      ]);
      return {
        contacts: contacts.items,
        deals: deals.items,
        contactById: new Map(contacts.items.map((c) => [c.id, c])),
        dealById: new Map(deals.items.map((d) => [d.id, d])),
        companyById: new Map(companies.items.map((c) => [c.id, c])),
      } satisfies TaskLookups;
    },
    [],
    { watch: ['contacts', 'deals', 'companies'] },
  );

  return {
    ...state,
    lookups:
      state.data ??
      ({
        contacts: [],
        deals: [],
        contactById: new Map<ID, Contact>(),
        dealById: new Map<ID, Deal>(),
        companyById: new Map<ID, Company>(),
      } satisfies TaskLookups),
  };
}

export function useTaskMutations() {
  const create = useMutation((provider, input: TaskCreate) => provider.tasks.create(input));
  const update = useMutation((provider, id: ID, patch: TaskUpdate) =>
    provider.tasks.update(id, patch),
  );
  const remove = useMutation((provider, id: ID) => provider.tasks.delete(id));

  /* Completion is its own repository operation: it stamps completedAt and
     emits task.completed. A checkbox that patched `completed` directly would
     tick the box without ever writing the history (CONTEXT.md §2 rule 3). */
  const setCompleted = useMutation((provider, id: ID, completed: boolean, actorId: ID) =>
    provider.tasks.setCompleted(id, completed, actorId),
  );

  const reset = useCallback(() => {
    create.reset();
    update.reset();
  }, [create, update]);

  return { create, update, remove, setCompleted, reset };
}
