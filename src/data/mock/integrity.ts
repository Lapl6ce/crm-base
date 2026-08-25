import type { Collection } from './collection';
import type { Company, Contact, Deal, ID, Note, Task } from '../types';

/* Referential integrity is the adapter's job, never the UI's (CONTEXT.md §1).
 *
 * The policy, in one place so a fork can change it in one place:
 *   - Deleting a Company nulls companyId on its contacts and deals. Losing an
 *     account should not silently delete the people you know there.
 *   - Deleting a Contact nulls contactId on deals and tasks.
 *   - Deleting a Deal nulls dealId on its tasks.
 *   - Notes are cascade-deleted: a note about a deleted record is orphaned text
 *     with no way to reach it. Activity events are NOT deleted — history is a
 *     log, and a log you edit is not a log.
 */

export interface Collections {
  contacts: Collection<Contact>;
  companies: Collection<Company>;
  deals: Collection<Deal>;
  tasks: Collection<Task>;
  notes: Collection<Note>;
}

export interface IntegrityResult {
  /** field -> number of records touched, for logging / demo diagnostics. */
  touched: Record<string, number>;
}

export function onCompanyDeleted(c: Collections, companyId: ID): IntegrityResult {
  return {
    touched: {
      contacts: c.contacts.patchWhere(
        (contact) => contact.companyId === companyId,
        () => ({ companyId: undefined }),
      ),
      deals: c.deals.patchWhere(
        (deal) => deal.companyId === companyId,
        () => ({ companyId: undefined }),
      ),
      notes: c.notes.removeWhere(
        (note) => note.entityType === 'company' && note.entityId === companyId,
      ),
    },
  };
}

export function onContactDeleted(c: Collections, contactId: ID): IntegrityResult {
  return {
    touched: {
      deals: c.deals.patchWhere(
        (deal) => deal.contactId === contactId,
        () => ({ contactId: undefined }),
      ),
      tasks: c.tasks.patchWhere(
        (task) => task.contactId === contactId,
        () => ({ contactId: undefined }),
      ),
      notes: c.notes.removeWhere(
        (note) => note.entityType === 'contact' && note.entityId === contactId,
      ),
    },
  };
}

export function onDealDeleted(c: Collections, dealId: ID): IntegrityResult {
  return {
    touched: {
      tasks: c.tasks.patchWhere(
        (task) => task.dealId === dealId,
        () => ({ dealId: undefined }),
      ),
      notes: c.notes.removeWhere((note) => note.entityType === 'deal' && note.entityId === dealId),
    },
  };
}

/**
 * Deleting a user would orphan ownership everywhere, so instead we reassign.
 * The caller picks the inheritor (in practice: the first admin).
 */
export function onUserDeleted(c: Collections, userId: ID, inheritorId: ID): IntegrityResult {
  const reassign = () => ({ ownerId: inheritorId });
  return {
    touched: {
      contacts: c.contacts.patchWhere((x) => x.ownerId === userId, reassign),
      companies: c.companies.patchWhere((x) => x.ownerId === userId, reassign),
      deals: c.deals.patchWhere((x) => x.ownerId === userId, reassign),
      tasks: c.tasks.patchWhere((x) => x.ownerId === userId, reassign),
    },
  };
}

/**
 * A stage can be deleted in Settings while deals still sit in it. Those deals
 * move to the fallback stage rather than vanishing from the board.
 */
export function onStageRemoved(c: Collections, stageId: ID, fallbackStageId: ID): IntegrityResult {
  const stamp = new Date().toISOString();
  return {
    touched: {
      deals: c.deals.patchWhere(
        (deal) => deal.stageId === stageId,
        () => ({ stageId: fallbackStageId, stageEnteredAt: stamp }),
      ),
    },
  };
}
