/* ---------------------------------------------------------------------------
   Entity model + the repository contract (CONTEXT.md §1, §2).

   This file is the boundary. UI code imports from here; it never imports from
   data/mock. Swapping the mock adapter for a REST or SQL adapter means writing
   a new object that satisfies DataProvider — no UI file changes.

   Conventions:
     - IDs are opaque strings. Never parse them.
     - Timestamps are ISO-8601 strings, never Date: they cross a serialization
       boundary, and a real API will hand us strings anyway.
     - Money is a number of major units plus an explicit currency code.
   --------------------------------------------------------------------------- */

export type ID = string;
export type ISODateString = string;

/* --- users --------------------------------------------------------------- */

export type Role = 'admin' | 'sales_rep';

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  /** Token-derived hex, for initials chips. */
  avatarColor: string;
  createdAt: ISODateString;
}

/* --- companies ----------------------------------------------------------- */

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-1000' | '1000+';

export interface Address {
  line1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export interface Company {
  id: ID;
  name: string;
  domain?: string;
  industry?: string;
  size?: CompanySize;
  phone?: string;
  website?: string;
  address?: Address;
  ownerId: ID;
  tags: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --- contacts ------------------------------------------------------------ */

export type ContactStatus = 'lead' | 'active' | 'inactive';

export interface Contact {
  id: ID;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyId?: ID;
  /** The spec calls this "role"; renamed to avoid colliding with User.role. */
  jobTitle?: string;
  tags: string[];
  ownerId: ID;
  status: ContactStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --- deals --------------------------------------------------------------- */

export type DealStatus = 'open' | 'won' | 'lost';

export interface Deal {
  id: ID;
  title: string;
  value: number;
  currency: string;
  stageId: ID;
  status: DealStatus;
  contactId?: ID;
  companyId?: ID;
  ownerId: ID;
  expectedCloseDate?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** Powers the heat stripe's staleness term. Set by the repository, not the UI. */
  stageEnteredAt: ISODateString;
}

/* --- tasks --------------------------------------------------------------- */

export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: ID;
  title: string;
  description?: string;
  dueDate?: ISODateString;
  priority: Priority;
  completed: boolean;
  completedAt?: ISODateString;
  contactId?: ID;
  dealId?: ID;
  ownerId: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --- notes --------------------------------------------------------------- */

export type NoteParentType = 'contact' | 'company' | 'deal';

export interface Note {
  id: ID;
  body: string;
  entityType: NoteParentType;
  entityId: ID;
  authorId: ID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/* --- activity ------------------------------------------------------------ */

export type ActivityType =
  | 'contact.created'
  | 'company.created'
  | 'deal.created'
  | 'deal.stage_changed'
  | 'deal.won'
  | 'deal.lost'
  | 'task.created'
  | 'task.completed'
  | 'note.created';

export type ActivityEntityType = 'contact' | 'company' | 'deal' | 'task';

/**
 * The timeline substrate. Modules never write to each other — they emit events,
 * and the timeline module reads them. This is the one mechanism that lets a
 * contact's timeline show its deal's stage changes without a cross-module import.
 */
export interface ActivityEvent {
  id: ID;
  type: ActivityType;
  entityType: ActivityEntityType;
  entityId: ID;
  actorId: ID;
  occurredAt: ISODateString;
  payload?: Record<string, unknown>;
  /** Denormalized links, so one indexed lookup answers "what happened here?". */
  relatedContactId?: ID;
  relatedCompanyId?: ID;
  relatedDealId?: ID;
}

/* --- settings ------------------------------------------------------------ */

export type StageOutcome = 'open' | 'won' | 'lost';

export interface PipelineStage {
  id: ID;
  name: string;
  order: number;
  /** Terminal stages drive Deal.status when a deal is dropped into them. */
  outcome: StageOutcome;
}

export interface CompanyProfile {
  name: string;
  logoUrl: string | null;
  accentColor: string;
}

export interface AppSettings {
  company: CompanyProfile;
  stages: PipelineStage[];
  defaultCurrency: string;
  demoMode: boolean;
  /** Stands in for a session until real auth exists. */
  currentUserId: ID;
}

/* --- query shapes -------------------------------------------------------- */

export type SortDirection = 'asc' | 'desc';

export interface ListQuery {
  search?: string;
  /** Field -> value. Arrays mean "any of"; undefined/null/'' are ignored. */
  filters?: Record<string, unknown>;
  sort?: { field: string; dir: SortDirection };
  page?: number;
  pageSize?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* --- the repository contract --------------------------------------------- */

/**
 * Every repository is async, including the mock one. A synchronous mock would
 * let callers depend on synchronous reads, and swapping in a network adapter
 * would then break every one of them.
 */
export interface Repository<T, TCreate, TUpdate> {
  list(query?: ListQuery): Promise<Page<T>>;
  get(id: ID): Promise<T | null>;
  create(input: TCreate): Promise<T>;
  update(id: ID, patch: TUpdate): Promise<T>;
  delete(id: ID): Promise<void>;
}

/** Fields every adapter owns; callers never supply them. */
export type Managed = 'id' | 'createdAt' | 'updatedAt';

export class NotFoundError extends Error {
  constructor(entity: string, id: ID) {
    super(`${entity} ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  /** Field name -> message, ready to feed a form. */
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>, message = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}
