import { useCallback } from 'react';
import { useMutation, useResource } from '@/data/useResource';
import { useSession } from '@/data/useSession';
import type { ContactCreate, ContactUpdate } from '@/data/repositories';
import type { Company, Contact, Deal, ID, ListQuery, Task, User } from '@/data/types';

export function useContactList(query: ListQuery) {
  return useResource((provider) => provider.contacts.list(query), [query], {
    watch: ['contacts'],
  });
}

export interface ContactLookups {
  companies: Company[];
  companyById: Map<ID, Company>;
  tags: string[];
}

export function useContactLookups() {
  const state = useResource(
    async (provider) => {
      const [companies, tags] = await Promise.all([
        provider.companies.list({ pageSize: 0 }),
        provider.contacts.tags(),
      ]);
      return {
        companies: companies.items,
        companyById: new Map(companies.items.map((c) => [c.id, c])),
        tags,
      } satisfies ContactLookups;
    },
    [],
    { watch: ['companies', 'contacts'] },
  );

  return {
    ...state,
    lookups: state.data ?? { companies: [], companyById: new Map<ID, Company>(), tags: [] },
  };
}

export function useLastActivityByContact() {
  const { data } = useResource((provider) => provider.activity.lastActivityByContact(), [], {
    watch: ['activity'],
  });
  return data ?? {};
}

export interface ContactDetail {
  contact: Contact | null;
  company: Company | null;
  owner: User | null;
  deals: Deal[];
  tasks: Task[];
  lastActivityAt?: string;
}

export function useContactDetail(id: ID | undefined) {
  const { users } = useSession();

  const state = useResource(
    async (
      provider,
    ): Promise<{
      contact: Contact | null;
      company: Company | null;
      deals: Deal[];
      tasks: Task[];
      lastActivityAt?: string;
    }> => {
      const none = { contact: null, company: null, deals: [], tasks: [] };
      if (!id) return none;
      const contact = await provider.contacts.get(id);
      if (!contact) return none;

      const [company, deals, tasks, lastActivity] = await Promise.all([
        contact.companyId ? provider.companies.get(contact.companyId) : Promise.resolve(null),
        provider.deals.listByContact(contact.id),
        provider.tasks.listByContact(contact.id),
        provider.activity.lastActivityByContact(),
      ]);
      return {
        contact,
        company,
        deals,
        tasks: tasks.filter((task) => !task.completed),
        lastActivityAt: lastActivity[contact.id],
      };
    },
    [id],
    { watch: ['contacts', 'companies', 'deals', 'tasks', 'activity'], enabled: Boolean(id) },
  );

  const contact = state.data?.contact ?? null;
  const detail: ContactDetail = {
    contact,
    company: state.data?.company ?? null,
    owner: users.find((u) => u.id === contact?.ownerId) ?? null,
    deals: state.data?.deals ?? [],
    tasks: state.data?.tasks ?? [],
    lastActivityAt: state.data?.lastActivityAt,
  };

  return { ...state, detail };
}

export function useContactMutations() {
  const create = useMutation((provider, input: ContactCreate) => provider.contacts.create(input));
  const update = useMutation((provider, id: ID, patch: ContactUpdate) =>
    provider.contacts.update(id, patch),
  );
  const remove = useMutation((provider, id: ID) => provider.contacts.delete(id));

  const reset = useCallback(() => {
    create.reset();
    update.reset();
  }, [create, update]);

  return { create, update, remove, reset };
}
