import { emitChange } from '../bus';
import type {
  ActivityEntityType,
  ActivityEvent,
  AppSettings,
  Company,
  Contact,
  Deal,
  ID,
  ListQuery,
  Note,
  PipelineStage,
  Task,
  User,
} from '../types';
import { NotFoundError, ValidationError } from '../types';
import type {
  ActivityRepository,
  CompanyCreate,
  CompanyRepository,
  CompanyUpdate,
  ContactCreate,
  ContactRepository,
  ContactUpdate,
  DataProvider,
  DealCreate,
  DealRepository,
  DealUpdate,
  DeepPartial,
  NoteCreate,
  NoteRepository,
  NoteUpdate,
  SettingsRepository,
  TaskCreate,
  TaskRepository,
  TaskUpdate,
  UserCreate,
  UserRepository,
  UserUpdate,
} from '../repositories';
import * as activity from './activity';
import { Collection, generateId, nowISO } from './collection';
import { DEFAULT_ADMIN_ID, defaultSettings, defaultUsers, nextAvatarColor } from './defaults';
import * as integrity from './integrity';
import { clearAll, readJSON, writeJSON } from './storage';

/* ---------------------------------------------------------------------------
   The mock adapter: an in-memory + localStorage implementation of DataProvider.

   It is the reference implementation of the contract, so it deliberately does
   the unglamorous things a real backend does — validates input, keeps
   referential integrity, derives status from stage, writes its own timestamps,
   and emits activity events. UI code that works against this adapter will work
   against a REST one without edits, because it was never allowed to do any of
   that work itself.

   Nothing outside src/data may import this file (enforced in .eslintrc.cjs).
   --------------------------------------------------------------------------- */

export interface MockProviderOptions {
  /**
   * Artificial delay per call. 0 in normal use; set it to ~200 while building
   * loading/skeleton states so they are actually exercised.
   */
  latencyMs?: number;
}

const SETTINGS_KEY = 'settings';

export function createMockProvider(options: MockProviderOptions = {}): DataProvider {
  const { latencyMs = 0 } = options;

  const delay = <T>(value: T): Promise<T> =>
    latencyMs > 0
      ? new Promise((resolve) => setTimeout(() => resolve(value), latencyMs))
      : Promise.resolve(value);

  /* --- collections ------------------------------------------------------- */

  const contacts = new Collection<Contact>({
    name: 'contacts',
    searchFields: ['firstName', 'lastName', 'email', 'phone', 'jobTitle', 'tags'],
    defaultSort: { field: 'lastName', dir: 'asc' },
  });

  const companies = new Collection<Company>({
    name: 'companies',
    searchFields: ['name', 'domain', 'industry', 'tags'],
    defaultSort: { field: 'name', dir: 'asc' },
  });

  const deals = new Collection<Deal>({
    name: 'deals',
    searchFields: ['title'],
    defaultSort: { field: 'updatedAt', dir: 'desc' },
  });

  const tasks = new Collection<Task>({
    name: 'tasks',
    searchFields: ['title', 'description'],
    defaultSort: { field: 'dueDate', dir: 'asc' },
  });

  const notes = new Collection<Note>({
    name: 'notes',
    searchFields: ['body'],
    defaultSort: { field: 'createdAt', dir: 'desc' },
  });

  const users = new Collection<User>({
    name: 'users',
    searchFields: ['name', 'email'],
    defaultSort: { field: 'name', dir: 'asc' },
    initial: defaultUsers(),
  });

  const events = new Collection<ActivityEvent>({
    name: 'activity',
    defaultSort: { field: 'occurredAt', dir: 'desc' },
  });

  const collections: integrity.Collections = { contacts, companies, deals, tasks, notes };

  /* --- settings ---------------------------------------------------------- */

  let settings: AppSettings = { ...defaultSettings(), ...readJSON<Partial<AppSettings>>(SETTINGS_KEY, {}) };

  const persistSettings = () => writeJSON(SETTINGS_KEY, settings);

  const stageById = (id: ID): PipelineStage | undefined => settings.stages.find((s) => s.id === id);

  const firstOpenStage = (): PipelineStage =>
    settings.stages.find((s) => s.outcome === 'open') ?? settings.stages[0];

  /* --- shared helpers ---------------------------------------------------- */

  const record = (event: ActivityEvent) => {
    events.insert(event);
  };

  const requireUser = (id: ID | undefined): ID => {
    const fallback = users.snapshot()[0]?.id ?? DEFAULT_ADMIN_ID;
    if (!id) return fallback;
    return users.find(id) ? id : fallback;
  };

  const trim = (value: string | undefined): string | undefined => {
    const t = value?.trim();
    return t ? t : undefined;
  };

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* --- contacts ---------------------------------------------------------- */

  const contactRepo: ContactRepository = {
    async list(query?: ListQuery) {
      return delay(contacts.query(query));
    },
    async get(id) {
      return delay(contacts.find(id));
    },
    async create(input: ContactCreate) {
      const errors: Record<string, string> = {};
      const firstName = input.firstName?.trim() ?? '';
      const lastName = input.lastName?.trim() ?? '';
      if (!firstName && !lastName) errors.firstName = 'A first or last name is required';
      if (input.email && !EMAIL.test(input.email)) errors.email = 'Enter a valid email address';
      if (input.companyId && !companies.find(input.companyId)) {
        errors.companyId = 'That company no longer exists';
      }
      if (Object.keys(errors).length) throw new ValidationError(errors);

      const stamp = nowISO();
      const contact: Contact = {
        ...input,
        id: generateId('con'),
        firstName,
        lastName,
        email: trim(input.email),
        phone: trim(input.phone),
        jobTitle: trim(input.jobTitle),
        tags: input.tags ?? [],
        status: input.status ?? 'lead',
        ownerId: requireUser(input.ownerId),
        createdAt: stamp,
        updatedAt: stamp,
      };

      contacts.insert(contact);
      record(activity.contactCreated(contact, contact.ownerId));
      emitChange('contacts', 'activity');
      return delay(contact);
    },
    async update(id, patch: ContactUpdate) {
      if (!contacts.find(id)) throw new NotFoundError('Contact', id);
      if (patch.email && !EMAIL.test(patch.email)) {
        throw new ValidationError({ email: 'Enter a valid email address' });
      }
      const updated = contacts.patch(id, { ...patch, updatedAt: nowISO() });
      if (!updated) throw new NotFoundError('Contact', id);
      emitChange('contacts');
      return delay(updated);
    },
    async delete(id) {
      if (!contacts.find(id)) throw new NotFoundError('Contact', id);
      contacts.remove(id);
      integrity.onContactDeleted(collections, id);
      emitChange('contacts', 'deals', 'tasks', 'notes');
      return delay(undefined);
    },
    async listByCompany(companyId) {
      return delay(contacts.filter((c) => c.companyId === companyId));
    },
    async tags() {
      const all = new Set<string>();
      contacts.snapshot().forEach((c) => c.tags.forEach((t) => all.add(t)));
      return delay([...all].sort());
    },
  };

  /* --- companies --------------------------------------------------------- */

  const companyRepo: CompanyRepository = {
    async list(query?: ListQuery) {
      return delay(companies.query(query));
    },
    async get(id) {
      return delay(companies.find(id));
    },
    async create(input: CompanyCreate) {
      const name = input.name?.trim() ?? '';
      if (!name) throw new ValidationError({ name: 'A company name is required' });

      const stamp = nowISO();
      const company: Company = {
        ...input,
        id: generateId('com'),
        name,
        domain: trim(input.domain),
        industry: trim(input.industry),
        tags: input.tags ?? [],
        ownerId: requireUser(input.ownerId),
        createdAt: stamp,
        updatedAt: stamp,
      };

      companies.insert(company);
      record(activity.companyCreated(company, company.ownerId));
      emitChange('companies', 'activity');
      return delay(company);
    },
    async update(id, patch: CompanyUpdate) {
      if (!companies.find(id)) throw new NotFoundError('Company', id);
      const updated = companies.patch(id, { ...patch, updatedAt: nowISO() });
      if (!updated) throw new NotFoundError('Company', id);
      emitChange('companies');
      return delay(updated);
    },
    async delete(id) {
      if (!companies.find(id)) throw new NotFoundError('Company', id);
      companies.remove(id);
      // Contacts and deals survive; they just lose the link (CONTEXT.md §1).
      integrity.onCompanyDeleted(collections, id);
      emitChange('companies', 'contacts', 'deals', 'notes');
      return delay(undefined);
    },
    async tags() {
      const all = new Set<string>();
      companies.snapshot().forEach((c) => c.tags.forEach((t) => all.add(t)));
      return delay([...all].sort());
    },
  };

  /* --- deals ------------------------------------------------------------- */

  const statusForStage = (stageId: ID): Deal['status'] => stageById(stageId)?.outcome ?? 'open';

  const dealRepo: DealRepository = {
    async list(query?: ListQuery) {
      return delay(deals.query(query));
    },
    async get(id) {
      return delay(deals.find(id));
    },
    async create(input: DealCreate) {
      const errors: Record<string, string> = {};
      const title = input.title?.trim() ?? '';
      if (!title) errors.title = 'A deal title is required';
      if (input.value == null || Number.isNaN(input.value) || input.value < 0) {
        errors.value = 'Enter a value of 0 or more';
      }
      const stage = input.stageId ? stageById(input.stageId) : firstOpenStage();
      if (!stage) errors.stageId = 'Pick a pipeline stage';
      if (Object.keys(errors).length || !stage) throw new ValidationError(errors);

      const stamp = nowISO();
      const deal: Deal = {
        ...input,
        id: generateId('deal'),
        title,
        stageId: stage.id,
        // Status follows the stage, always. Two sources of truth here would
        // drift the moment someone drags a card.
        status: statusForStage(stage.id),
        currency: input.currency || settings.defaultCurrency,
        ownerId: requireUser(input.ownerId),
        createdAt: stamp,
        updatedAt: stamp,
        stageEnteredAt: stamp,
      };

      deals.insert(deal);
      record(activity.dealCreated(deal, deal.ownerId));
      emitChange('deals', 'activity');
      return delay(deal);
    },
    async update(id, patch: DealUpdate) {
      const existing = deals.find(id);
      if (!existing) throw new NotFoundError('Deal', id);
      if (patch.value != null && (Number.isNaN(patch.value) || patch.value < 0)) {
        throw new ValidationError({ value: 'Enter a value of 0 or more' });
      }

      // A stage change routed through update() still has to behave like a
      // stage change, or history depends on which form the user happened to use.
      if (patch.stageId && patch.stageId !== existing.stageId) {
        const moved = await dealRepo.moveToStage(id, patch.stageId, existing.ownerId);
        const rest = { ...patch };
        delete rest.stageId;
        if (Object.keys(rest).length === 0) return moved;
        const updated = deals.patch(id, { ...rest, updatedAt: nowISO() });
        if (!updated) throw new NotFoundError('Deal', id);
        emitChange('deals');
        return delay(updated);
      }

      const updated = deals.patch(id, { ...patch, updatedAt: nowISO() });
      if (!updated) throw new NotFoundError('Deal', id);
      emitChange('deals');
      return delay(updated);
    },
    async delete(id) {
      if (!deals.find(id)) throw new NotFoundError('Deal', id);
      deals.remove(id);
      integrity.onDealDeleted(collections, id);
      emitChange('deals', 'tasks', 'notes');
      return delay(undefined);
    },
    async moveToStage(id, stageId, actorId) {
      const existing = deals.find(id);
      if (!existing) throw new NotFoundError('Deal', id);
      const stage = stageById(stageId);
      if (!stage) throw new ValidationError({ stageId: 'That stage no longer exists' });
      if (existing.stageId === stageId) return delay(existing);

      const stamp = nowISO();
      const updated = deals.patch(id, {
        stageId,
        status: stage.outcome,
        stageEnteredAt: stamp,
        updatedAt: stamp,
      });
      if (!updated) throw new NotFoundError('Deal', id);

      record(
        activity.dealStageChanged(
          updated,
          existing.stageId,
          stageId,
          requireUser(actorId),
          stage.outcome,
        ),
      );
      emitChange('deals', 'activity');
      return delay(updated);
    },
    async listByStage() {
      const grouped: Record<ID, Deal[]> = {};
      settings.stages.forEach((stage) => {
        grouped[stage.id] = [];
      });
      deals.snapshot().forEach((deal) => {
        (grouped[deal.stageId] ??= []).push(deal);
      });
      Object.values(grouped).forEach((list) =>
        list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
      return delay(grouped);
    },
    async listByContact(contactId) {
      return delay(deals.filter((d) => d.contactId === contactId));
    },
    async listByCompany(companyId) {
      return delay(deals.filter((d) => d.companyId === companyId));
    },
  };

  /* --- tasks ------------------------------------------------------------- */

  /** A task inherits its company link from whatever it points at. */
  const companyForTask = (task: Pick<Task, 'contactId' | 'dealId'>): ID | undefined => {
    if (task.contactId) {
      const contact = contacts.find(task.contactId);
      if (contact?.companyId) return contact.companyId;
    }
    if (task.dealId) return deals.find(task.dealId)?.companyId;
    return undefined;
  };

  const taskRepo: TaskRepository = {
    async list(query?: ListQuery) {
      return delay(tasks.query(query));
    },
    async get(id) {
      return delay(tasks.find(id));
    },
    async create(input: TaskCreate) {
      const title = input.title?.trim() ?? '';
      if (!title) throw new ValidationError({ title: 'A task needs a title' });

      const stamp = nowISO();
      const task: Task = {
        ...input,
        id: generateId('task'),
        title,
        description: trim(input.description),
        priority: input.priority ?? 'medium',
        completed: input.completed ?? false,
        ownerId: requireUser(input.ownerId),
        createdAt: stamp,
        updatedAt: stamp,
      };

      tasks.insert(task);
      record(activity.taskCreated(task, task.ownerId, companyForTask(task)));
      emitChange('tasks', 'activity');
      return delay(task);
    },
    async update(id, patch: TaskUpdate) {
      const existing = tasks.find(id);
      if (!existing) throw new NotFoundError('Task', id);

      // Completion is an event, not a field write — route it through the one
      // method that stamps completedAt and emits.
      if (patch.completed != null && patch.completed !== existing.completed) {
        await taskRepo.setCompleted(id, patch.completed, existing.ownerId);
      }
      const rest = { ...patch };
      delete rest.completed;

      const updated = tasks.patch(id, { ...rest, updatedAt: nowISO() });
      if (!updated) throw new NotFoundError('Task', id);
      emitChange('tasks');
      return delay(updated);
    },
    async delete(id) {
      if (!tasks.find(id)) throw new NotFoundError('Task', id);
      tasks.remove(id);
      emitChange('tasks');
      return delay(undefined);
    },
    async setCompleted(id, completed, actorId) {
      const existing = tasks.find(id);
      if (!existing) throw new NotFoundError('Task', id);

      const stamp = nowISO();
      const updated = tasks.patch(id, {
        completed,
        completedAt: completed ? stamp : undefined,
        updatedAt: stamp,
      });
      if (!updated) throw new NotFoundError('Task', id);

      // Un-completing is a correction, not an event worth logging.
      if (completed) {
        record(activity.taskCompleted(updated, requireUser(actorId), companyForTask(updated)));
        emitChange('tasks', 'activity');
      } else {
        emitChange('tasks');
      }
      return delay(updated);
    },
    async listByContact(contactId) {
      return delay(tasks.filter((t) => t.contactId === contactId));
    },
    async listByDeal(dealId) {
      return delay(tasks.filter((t) => t.dealId === dealId));
    },
  };

  /* --- notes ------------------------------------------------------------- */

  const noteRepo: NoteRepository = {
    async list(query?: ListQuery) {
      return delay(notes.query(query));
    },
    async get(id) {
      return delay(notes.find(id));
    },
    async create(input: NoteCreate) {
      const body = input.body?.trim() ?? '';
      if (!body) throw new ValidationError({ body: 'Write something first' });

      const stamp = nowISO();
      const note: Note = {
        ...input,
        id: generateId('note'),
        body,
        authorId: requireUser(input.authorId),
        createdAt: stamp,
        updatedAt: stamp,
      };

      notes.insert(note);

      const deal = note.entityType === 'deal' ? deals.find(note.entityId) : null;
      const contact = note.entityType === 'contact' ? contacts.find(note.entityId) : null;
      record(
        activity.noteCreated(note, note.authorId, {
          relatedContactId: contact?.id ?? deal?.contactId,
          relatedCompanyId:
            note.entityType === 'company' ? note.entityId : (contact?.companyId ?? deal?.companyId),
          relatedDealId: deal?.id,
        }),
      );
      emitChange('notes', 'activity');
      return delay(note);
    },
    async update(id, patch: NoteUpdate) {
      if (!notes.find(id)) throw new NotFoundError('Note', id);
      const updated = notes.patch(id, { ...patch, updatedAt: nowISO() });
      if (!updated) throw new NotFoundError('Note', id);
      emitChange('notes');
      return delay(updated);
    },
    async delete(id) {
      if (!notes.find(id)) throw new NotFoundError('Note', id);
      notes.remove(id);
      emitChange('notes');
      return delay(undefined);
    },
    async listForEntity(entityType, entityId) {
      const found = notes.filter((n) => n.entityType === entityType && n.entityId === entityId);
      found.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return delay(found);
    },
  };

  /* --- users ------------------------------------------------------------- */

  const userRepo: UserRepository = {
    async list(query?: ListQuery) {
      return delay(users.query(query));
    },
    async get(id) {
      return delay(users.find(id));
    },
    async create(input: UserCreate) {
      const errors: Record<string, string> = {};
      const name = input.name?.trim() ?? '';
      const email = input.email?.trim().toLowerCase() ?? '';
      if (!name) errors.name = 'A name is required';
      if (!EMAIL.test(email)) errors.email = 'Enter a valid email address';
      if (users.snapshot().some((u) => u.email.toLowerCase() === email)) {
        errors.email = 'That email is already in use';
      }
      if (Object.keys(errors).length) throw new ValidationError(errors);

      const user: User = {
        ...input,
        id: generateId('user'),
        name,
        email,
        role: input.role ?? 'sales_rep',
        avatarColor: input.avatarColor ?? nextAvatarColor(users.snapshot().length),
        createdAt: nowISO(),
      };

      users.insert(user);
      emitChange('users');
      return delay(user);
    },
    async update(id, patch: UserUpdate) {
      const existing = users.find(id);
      if (!existing) throw new NotFoundError('User', id);

      // Never strand the app without an admin — the last one cannot demote itself.
      if (patch.role === 'sales_rep' && existing.role === 'admin') {
        const admins = users.snapshot().filter((u) => u.role === 'admin');
        if (admins.length <= 1) {
          throw new ValidationError({ role: 'At least one admin is required' });
        }
      }

      const updated = users.patch(id, patch);
      if (!updated) throw new NotFoundError('User', id);
      emitChange('users');
      return delay(updated);
    },
    async delete(id) {
      const existing = users.find(id);
      if (!existing) throw new NotFoundError('User', id);

      const remaining = users.snapshot().filter((u) => u.id !== id);
      if (remaining.length === 0) {
        throw new ValidationError({ id: 'The last user cannot be deleted' });
      }
      if (existing.role === 'admin' && !remaining.some((u) => u.role === 'admin')) {
        throw new ValidationError({ id: 'At least one admin is required' });
      }

      // Records are reassigned, never orphaned (CONTEXT.md §1).
      const inheritor = remaining.find((u) => u.role === 'admin') ?? remaining[0];
      users.remove(id);
      integrity.onUserDeleted(collections, id, inheritor.id);

      if (settings.currentUserId === id) {
        settings = { ...settings, currentUserId: inheritor.id };
        persistSettings();
        emitChange('settings');
      }

      emitChange('users', 'contacts', 'companies', 'deals', 'tasks');
      return delay(undefined);
    },
    async all() {
      return delay(users.query({ pageSize: 0 }).items);
    },
  };

  /* --- activity ---------------------------------------------------------- */

  const activityRepo: ActivityRepository = {
    async list(query?: ListQuery) {
      return delay(events.query(query));
    },
    async listForEntity(entityType: ActivityEntityType, entityId, opts) {
      return delay(activity.eventsForEntity(events, entityType, entityId, opts?.limit));
    },
    async append(event) {
      const stored = activity.createEvent(event);
      events.insert(stored);
      emitChange('activity');
      return delay(stored);
    },
    async lastActivityByContact() {
      const latest: Record<ID, string> = {};
      events.snapshot().forEach((event) => {
        const contactId =
          event.relatedContactId ?? (event.entityType === 'contact' ? event.entityId : undefined);
        if (!contactId) return;
        if (!latest[contactId] || event.occurredAt > latest[contactId]) {
          latest[contactId] = event.occurredAt;
        }
      });
      return delay(latest);
    },
  };

  /* --- settings ---------------------------------------------------------- */

  const mergeSettings = (patch: DeepPartial<AppSettings>): AppSettings => ({
    ...settings,
    ...patch,
    company: { ...settings.company, ...(patch.company ?? {}) },
    stages: (patch.stages as PipelineStage[] | undefined) ?? settings.stages,
  });

  const settingsRepo: SettingsRepository = {
    async get() {
      return delay(settings);
    },
    async update(patch) {
      settings = mergeSettings(patch);
      persistSettings();
      emitChange('settings');
      return delay(settings);
    },
    async saveStages(stages) {
      if (stages.length === 0) throw new ValidationError({ stages: 'Keep at least one stage' });
      if (!stages.some((s) => s.outcome === 'open')) {
        throw new ValidationError({ stages: 'Keep at least one open stage' });
      }

      const renumbered = stages.map((stage, index) => ({
        ...stage,
        name: stage.name.trim() || `Stage ${index + 1}`,
        order: index,
      }));

      // Deals in a deleted stage move rather than disappear from the board.
      const survivingIds = new Set(renumbered.map((s) => s.id));
      const fallback = renumbered.find((s) => s.outcome === 'open') ?? renumbered[0];
      const removed = settings.stages.filter((s) => !survivingIds.has(s.id));

      settings = { ...settings, stages: renumbered };
      persistSettings();

      removed.forEach((stage) => integrity.onStageRemoved(collections, stage.id, fallback.id));

      // A stage whose outcome changed retroactively changes its deals' status.
      renumbered.forEach((stage) => {
        deals.patchWhere(
          (deal) => deal.stageId === stage.id && deal.status !== stage.outcome,
          () => ({ status: stage.outcome, updatedAt: nowISO() }),
        );
      });

      emitChange('settings', 'deals');
      return delay(settings);
    },
  };

  /* --- reset ------------------------------------------------------------- */

  return {
    contacts: contactRepo,
    companies: companyRepo,
    deals: dealRepo,
    tasks: taskRepo,
    notes: noteRepo,
    users: userRepo,
    activity: activityRepo,
    settings: settingsRepo,

    /** Demo Mode's "Reset" lands here. A real adapter would throw instead. */
    async reset() {
      clearAll();
      contacts.clear();
      companies.clear();
      deals.clear();
      tasks.clear();
      notes.clear();
      events.clear();
      users.replaceAll(defaultUsers());
      settings = defaultSettings();
      persistSettings();
      emitChange(
        'contacts',
        'companies',
        'deals',
        'tasks',
        'notes',
        'users',
        'activity',
        'settings',
      );
      return delay(undefined);
    },
  };
}
