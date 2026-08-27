import { useCallback } from 'react';
import { useMutation, useResource } from '@/data/useResource';
import { useSession } from '@/data/useSession';
import type { ContactCreate, ContactUpdate } from '@/data/repositories';
import type { Company, Contact, ID, ListQuery, User } from '@/data/types';

/* Every read and write this module performs, in one file.
 *
 * The screens below stay declarative and the data access stays reviewable: if
 * a future adapter changes cost characteristics (an N+1 that was free against
 * localStorage and expensive over HTTP), this is the only file to revisit.
 */

/** The paged list itself. Refetches when contacts change under it. */
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

/**
 * Companies and the distinct tag set: needed to resolve the company column and
 * to populate the filter controls. Deliberately a separate resource from the
 * list — it changes rarely, and folding it in would refetch every company on
 * every keystroke of a search.
 */
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

/**
 * Last-touched timestamp per contact, which is what contact heat is computed
 * from (lib/heat.ts). One call for the whole page — the repository owns the
 * aggregation precisely so the UI never loops over rows issuing requests.
 */
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
  lastActivityAt?: string;
}

/** One contact plus the records it points at, resolved through the data layer. */
export function useContactDetail(id: ID | undefined) {
  const { users } = useSession();

  const state = useResource(
    async (provider): Promise<{ contact: Contact | null; company: Company | null; lastActivityAt?: string }> => {
      if (!id) return { contact: null, company: null };
      const contact = await provider.contacts.get(id);
      if (!contact) return { contact: null, company: null };

      const [company, lastActivity] = await Promise.all([
        contact.companyId ? provider.companies.get(contact.companyId) : Promise.resolve(null),
        provider.activity.lastActivityByContact(),
      ]);
      return { contact, company, lastActivityAt: lastActivity[contact.id] };
    },
    [id],
    { watch: ['contacts', 'companies', 'activity'], enabled: Boolean(id) },
  );

  const contact = state.data?.contact ?? null;
  const detail: ContactDetail = {
    contact,
    company: state.data?.company ?? null,
    owner: users.find((u) => u.id === contact?.ownerId) ?? null,
    lastActivityAt: state.data?.lastActivityAt,
  };

  return { ...state, detail };
}

/** Writes. The change bus refreshes whatever is watching, so nothing here
    reaches into another screen's state (CONTEXT.md §2 rule 4). */
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
