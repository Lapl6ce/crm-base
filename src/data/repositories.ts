/* Per-entity specializations of Repository, plus the DataProvider surface.
   Everything the UI is allowed to do to data is declared here. */

import type {
  ActivityEntityType,
  ActivityEvent,
  AppSettings,
  Company,
  Contact,
  Deal,
  ID,
  ListQuery,
  Managed,
  Note,
  Page,
  PipelineStage,
  Repository,
  Task,
  User,
} from './types';

/* Create inputs drop adapter-managed fields; update inputs are partial and can
   never move id/createdAt. Derived timestamps (stageEnteredAt, completedAt) are
   the repository's business, not the caller's. */

/** Makes the listed keys optional: the adapter supplies a default for each. */
type Defaulted<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ContactCreate = Defaulted<
  Omit<Contact, Managed>,
  'tags' | 'status' | 'ownerId'
>;
export type ContactUpdate = Partial<Omit<Contact, Managed>>;

export type CompanyCreate = Defaulted<Omit<Company, Managed>, 'tags' | 'ownerId'>;
export type CompanyUpdate = Partial<Omit<Company, Managed>>;

export type DealCreate = Defaulted<
  Omit<Deal, Managed | 'stageEnteredAt'>,
  'status' | 'currency' | 'ownerId' | 'stageId'
>;
export type DealUpdate = Partial<Omit<Deal, Managed | 'stageEnteredAt'>>;

export type TaskCreate = Defaulted<
  Omit<Task, Managed | 'completedAt'>,
  'completed' | 'priority' | 'ownerId'
>;
export type TaskUpdate = Partial<Omit<Task, Managed | 'completedAt'>>;

export type NoteCreate = Defaulted<Omit<Note, Managed>, 'authorId'>;
export type NoteUpdate = Partial<Pick<Note, 'body'>>;

export type UserCreate = Defaulted<Omit<User, Managed>, 'avatarColor' | 'role'>;
export type UserUpdate = Partial<Omit<User, Managed>>;

export interface ContactRepository extends Repository<Contact, ContactCreate, ContactUpdate> {
  listByCompany(companyId: ID): Promise<Contact[]>;
  /** Distinct tags across all contacts, for filter chips. */
  tags(): Promise<string[]>;
}

export interface CompanyRepository extends Repository<Company, CompanyCreate, CompanyUpdate> {
  tags(): Promise<string[]>;
}

export interface DealRepository extends Repository<Deal, DealCreate, DealUpdate> {
  /**
   * Moving a deal between stages is its own operation, not a generic update:
   * it stamps stageEnteredAt, derives status from the target stage's outcome,
   * and emits the stage_changed / won / lost activity event.
   */
  moveToStage(id: ID, stageId: ID, actorId: ID): Promise<Deal>;
  listByStage(): Promise<Record<ID, Deal[]>>;
  listByContact(contactId: ID): Promise<Deal[]>;
  listByCompany(companyId: ID): Promise<Deal[]>;
}

export interface TaskRepository extends Repository<Task, TaskCreate, TaskUpdate> {
  /** Toggling completion stamps completedAt and emits task.completed. */
  setCompleted(id: ID, completed: boolean, actorId: ID): Promise<Task>;
  listByContact(contactId: ID): Promise<Task[]>;
  listByDeal(dealId: ID): Promise<Task[]>;
}

export interface NoteRepository extends Repository<Note, NoteCreate, NoteUpdate> {
  listForEntity(entityType: Note['entityType'], entityId: ID): Promise<Note[]>;
}

export interface UserRepository extends Repository<User, UserCreate, UserUpdate> {
  /** Convenience for the user switcher and owner dropdowns. */
  all(): Promise<User[]>;
}

/** Read-mostly, append-only. Nothing in the app edits history. */
export interface ActivityRepository {
  list(query?: ListQuery): Promise<Page<ActivityEvent>>;
  /**
   * The merged feed for one record: its own events plus events on things it
   * owns (a contact sees its deals' stage changes and its tasks' completions).
   */
  listForEntity(
    entityType: ActivityEntityType,
    entityId: ID,
    opts?: { limit?: number },
  ): Promise<ActivityEvent[]>;
  append(event: Omit<ActivityEvent, 'id'>): Promise<ActivityEvent>;
  /** Most recent event per contact — feeds contact heat without an N+1. */
  lastActivityByContact(): Promise<Record<ID, string>>;
}

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  update(patch: DeepPartial<AppSettings>): Promise<AppSettings>;
  /** Stage edits are ordered writes; the adapter renumbers `order` for you. */
  saveStages(stages: PipelineStage[]): Promise<AppSettings>;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<U>
    : T[K] extends object | undefined
      ? DeepPartial<NonNullable<T[K]>>
      : T[K];
};

/**
 * The single object the UI is handed. One implementation exists today
 * (createMockProvider); a REST adapter is a second file, not a refactor.
 */
export interface DataProvider {
  contacts: ContactRepository;
  companies: CompanyRepository;
  deals: DealRepository;
  tasks: TaskRepository;
  notes: NoteRepository;
  users: UserRepository;
  activity: ActivityRepository;
  settings: SettingsRepository;
  /** Wipes and re-initializes. Demo Mode uses it; a real adapter may throw. */
  reset(): Promise<void>;
}
