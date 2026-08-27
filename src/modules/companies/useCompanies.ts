import { useCallback } from 'react';
import { useMutation, useResource } from '@/data/useResource';
import { useSession } from '@/data/useSession';
import type { CompanyCreate, CompanyUpdate } from '@/data/repositories';
import type { Company, Contact, ID, ListQuery, User } from '@/data/types';

/* Every read and write the Companies module performs.
 *
 * Note what is NOT here: any import from modules/contacts. A company's people
 * come from provider.contacts, the same interface the Contacts module uses.
 * That is module isolation doing its job (CONTEXT.md §3).
 */

export function useCompanyList(query: ListQuery) {
  return useResource((provider) => provider.companies.list(query), [query], {
    watch: ['companies'],
  });
}

export interface CompanyLookups {
  /** Distinct industries present in the data, for the filter control. */
  industries: string[];
  tags: string[];
  /** Contacts per company id — one pass, rather than a request per row. */
  contactCounts: Record<ID, number>;
}

export function useCompanyLookups() {
  const state = useResource(
    async (provider) => {
      const [companies, tags, contacts] = await Promise.all([
        provider.companies.list({ pageSize: 0 }),
        provider.companies.tags(),
        provider.contacts.list({ pageSize: 0 }),
      ]);

      const industries = [
        ...new Set(companies.items.map((c) => c.industry?.trim()).filter(Boolean) as string[]),
      ].sort((a, b) => a.localeCompare(b));

      const contactCounts: Record<ID, number> = {};
      for (const contact of contacts.items) {
        if (contact.companyId) contactCounts[contact.companyId] = (contactCounts[contact.companyId] ?? 0) + 1;
      }

      return { industries, tags, contactCounts } satisfies CompanyLookups;
    },
    [],
    { watch: ['companies', 'contacts'] },
  );

  return {
    ...state,
    lookups: state.data ?? { industries: [], tags: [], contactCounts: {} },
  };
}

export interface CompanyDetail {
  company: Company | null;
  contacts: Contact[];
  owner: User | null;
}

/** One company plus the people at it. */
export function useCompanyDetail(id: ID | undefined) {
  const { users } = useSession();

  const state = useResource(
    async (provider): Promise<{ company: Company | null; contacts: Contact[] }> => {
      if (!id) return { company: null, contacts: [] };
      const company = await provider.companies.get(id);
      if (!company) return { company: null, contacts: [] };
      const contacts = await provider.contacts.listByCompany(company.id);
      return { company, contacts };
    },
    [id],
    { watch: ['companies', 'contacts'], enabled: Boolean(id) },
  );

  const company = state.data?.company ?? null;
  const detail: CompanyDetail = {
    company,
    contacts: [...(state.data?.contacts ?? [])].sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
    ),
    owner: users.find((u) => u.id === company?.ownerId) ?? null,
  };

  return { ...state, detail };
}

export function useCompanyMutations() {
  const create = useMutation((provider, input: CompanyCreate) => provider.companies.create(input));
  const update = useMutation((provider, id: ID, patch: CompanyUpdate) =>
    provider.companies.update(id, patch),
  );
  const remove = useMutation((provider, id: ID) => provider.companies.delete(id));

  const reset = useCallback(() => {
    create.reset();
    update.reset();
  }, [create, update]);

  return { create, update, remove, reset };
}
