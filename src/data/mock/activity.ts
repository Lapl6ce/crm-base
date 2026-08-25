import type { ActivityEvent, Company, Contact, Deal, ID, Note, Task } from '../types';
import { generateId, nowISO, type Collection } from './collection';

/* Event construction lives here so every repository stamps the same shape, and
   so the denormalized related* links are filled in one way only.

   Rule (CONTEXT.md §2.3): repositories are the ONLY writers of ActivityEvent.
   A Kanban card never emits "stage changed" — DealRepository.moveToStage does,
   which means the same history exists whether the move came from a drag, the
   deal detail form, or a future API call. */

export type NewActivityEvent = Omit<ActivityEvent, 'id'>;

export function createEvent(
  input: Omit<NewActivityEvent, 'occurredAt'> & { occurredAt?: string },
): ActivityEvent {
  // Destructured rather than spread-then-override: an explicit `occurredAt:
  // undefined` in the input must fall back to now, not blank the field.
  const { occurredAt, ...rest } = input;
  return { id: generateId('act'), occurredAt: occurredAt ?? nowISO(), ...rest };
}

export const contactCreated = (contact: Contact, actorId: ID): ActivityEvent =>
  createEvent({
    type: 'contact.created',
    entityType: 'contact',
    entityId: contact.id,
    actorId,
    occurredAt: contact.createdAt,
    relatedContactId: contact.id,
    relatedCompanyId: contact.companyId,
    payload: { name: `${contact.firstName} ${contact.lastName}`.trim() },
  });

export const companyCreated = (company: Company, actorId: ID): ActivityEvent =>
  createEvent({
    type: 'company.created',
    entityType: 'company',
    entityId: company.id,
    actorId,
    occurredAt: company.createdAt,
    relatedCompanyId: company.id,
    payload: { name: company.name },
  });

export const dealCreated = (deal: Deal, actorId: ID): ActivityEvent =>
  createEvent({
    type: 'deal.created',
    entityType: 'deal',
    entityId: deal.id,
    actorId,
    occurredAt: deal.createdAt,
    relatedDealId: deal.id,
    relatedContactId: deal.contactId,
    relatedCompanyId: deal.companyId,
    payload: { title: deal.title, value: deal.value, currency: deal.currency },
  });

export const dealStageChanged = (
  deal: Deal,
  fromStageId: ID,
  toStageId: ID,
  actorId: ID,
  outcome: 'open' | 'won' | 'lost',
): ActivityEvent =>
  createEvent({
    type: outcome === 'won' ? 'deal.won' : outcome === 'lost' ? 'deal.lost' : 'deal.stage_changed',
    entityType: 'deal',
    entityId: deal.id,
    actorId,
    relatedDealId: deal.id,
    relatedContactId: deal.contactId,
    relatedCompanyId: deal.companyId,
    payload: { fromStageId, toStageId, title: deal.title, value: deal.value },
  });

export const taskCreated = (task: Task, actorId: ID, relatedCompanyId?: ID): ActivityEvent =>
  createEvent({
    type: 'task.created',
    entityType: 'task',
    entityId: task.id,
    actorId,
    occurredAt: task.createdAt,
    relatedContactId: task.contactId,
    relatedDealId: task.dealId,
    relatedCompanyId,
    payload: { title: task.title, dueDate: task.dueDate, priority: task.priority },
  });

export const taskCompleted = (task: Task, actorId: ID, relatedCompanyId?: ID): ActivityEvent =>
  createEvent({
    type: 'task.completed',
    entityType: 'task',
    entityId: task.id,
    actorId,
    occurredAt: task.completedAt,
    relatedContactId: task.contactId,
    relatedDealId: task.dealId,
    relatedCompanyId,
    payload: { title: task.title },
  });

export const noteCreated = (note: Note, actorId: ID, links: Partial<Pick<ActivityEvent, 'relatedContactId' | 'relatedCompanyId' | 'relatedDealId'>>): ActivityEvent =>
  createEvent({
    type: 'note.created',
    entityType: note.entityType,
    entityId: note.entityId,
    actorId,
    occurredAt: note.createdAt,
    ...links,
    payload: { noteId: note.id, excerpt: note.body.slice(0, 140) },
  });

/**
 * The merged feed for one record (CONTEXT.md §1, Module 4). A contact's timeline
 * is its own events plus everything that happened on the deals and tasks that
 * point at it — which is exactly what the related* columns are indexed for.
 */
export function eventsForEntity(
  events: Collection<ActivityEvent>,
  entityType: ActivityEvent['entityType'],
  entityId: ID,
  limit?: number,
): ActivityEvent[] {
  const relatedField =
    entityType === 'contact'
      ? 'relatedContactId'
      : entityType === 'company'
        ? 'relatedCompanyId'
        : entityType === 'deal'
          ? 'relatedDealId'
          : null;

  const matched = events.filter((event) => {
    if (event.entityType === entityType && event.entityId === entityId) return true;
    if (!relatedField) return false;
    return event[relatedField] === entityId;
  });

  matched.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return limit ? matched.slice(0, limit) : matched;
}
