import { useCallback } from 'react';
import { useMutation, useResource } from '@/data/useResource';
import { useSession } from '@/data/useSession';
import type { DealCreate, DealUpdate } from '@/data/repositories';
import type { Company, Contact, Deal, ID, ListQuery, PipelineStage, Task, User } from '@/data/types';

export function useDealBoard(query: ListQuery) {
  const state = useResource(
    async (provider) => {
      const page = await provider.deals.list({ ...query, pageSize: 0 });
      return page.items;
    },
    [query],
    { watch: ['deals', 'settings'] },
  );

  return { ...state, deals: state.data ?? [] };
}

export interface DealLookups {
  contacts: Contact[];
  companies: Company[];
  contactById: Map<ID, Contact>;
  companyById: Map<ID, Company>;
}

export function useDealLookups() {
  const state = useResource(
    async (provider) => {
      const [contacts, companies] = await Promise.all([
        provider.contacts.list({ pageSize: 0, sort: { field: 'lastName', dir: 'asc' } }),
        provider.companies.list({ pageSize: 0, sort: { field: 'name', dir: 'asc' } }),
      ]);
      return {
        contacts: contacts.items,
        companies: companies.items,
        contactById: new Map(contacts.items.map((c) => [c.id, c])),
        companyById: new Map(companies.items.map((c) => [c.id, c])),
      } satisfies DealLookups;
    },
    [],
    { watch: ['contacts', 'companies'] },
  );

  return {
    ...state,
    lookups:
      state.data ??
      ({
        contacts: [],
        companies: [],
        contactById: new Map<ID, Contact>(),
        companyById: new Map<ID, Company>(),
      } satisfies DealLookups),
  };
}

export interface DealDetail {
  deal: Deal | null;
  contact: Contact | null;
  company: Company | null;
  owner: User | null;
  stage: PipelineStage | null;
  tasks: Task[];
}

export function useDealDetail(id: ID | undefined) {
  const { users, stages } = useSession();

  const state = useResource(
    async (
      provider,
    ): Promise<{
      deal: Deal | null;
      contact: Contact | null;
      company: Company | null;
      tasks: Task[];
    }> => {
      const none = { deal: null, contact: null, company: null, tasks: [] };
      if (!id) return none;
      const deal = await provider.deals.get(id);
      if (!deal) return none;

      const [contact, company, tasks] = await Promise.all([
        deal.contactId ? provider.contacts.get(deal.contactId) : Promise.resolve(null),
        deal.companyId ? provider.companies.get(deal.companyId) : Promise.resolve(null),
        provider.tasks.listByDeal(deal.id),
      ]);
      return { deal, contact, company, tasks: tasks.filter((task) => !task.completed) };
    },
    [id],
    { watch: ['deals', 'contacts', 'companies', 'tasks'], enabled: Boolean(id) },
  );

  const deal = state.data?.deal ?? null;
  const detail: DealDetail = {
    deal,
    contact: state.data?.contact ?? null,
    company: state.data?.company ?? null,
    owner: users.find((u) => u.id === deal?.ownerId) ?? null,
    stage: stages.find((s) => s.id === deal?.stageId) ?? null,
    tasks: state.data?.tasks ?? [],
  };

  return { ...state, detail };
}

export function useDealMutations() {
  const create = useMutation((provider, input: DealCreate) => provider.deals.create(input));
  const update = useMutation((provider, id: ID, patch: DealUpdate) =>
    provider.deals.update(id, patch),
  );
  const remove = useMutation((provider, id: ID) => provider.deals.delete(id));

  const move = useMutation((provider, id: ID, stageId: ID, actorId: ID) =>
    provider.deals.moveToStage(id, stageId, actorId),
  );

  const reset = useCallback(() => {
    create.reset();
    update.reset();
  }, [create, update]);

  return { create, update, remove, move, reset };
}
