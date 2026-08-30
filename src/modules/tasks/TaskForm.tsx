import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { OwnerSelect } from '@/components/OwnerSelect';
import { Drawer } from '@/components/Overlay';
import { toast } from '@/components/Toast';
import { fieldErrors, formMessage } from '@/data/formErrors';
import { useSession } from '@/data/useSession';
import type { TaskCreate, TaskUpdate } from '@/data/repositories';
import type { ID, Priority, Task } from '@/data/types';
import { fromDateInputValue, fullName, toDateInputValue } from '@/lib/format';
import { PRIORITY_OPTIONS } from './taskMeta';
import { useTaskLookups, useTaskMutations } from './useTasks';

/* Create and edit a task.
 *
 * `completed` is not a field here: ticking a task is its own operation
 * (setCompleted), which stamps completedAt and writes the activity event. The
 * checkbox in the list is the only way to change it, and that is deliberate.
 */

export interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  /** Omit to create. */
  task?: Task | null;
  defaults?: { contactId?: ID; dealId?: ID };
  onSaved?: (task: Task) => void;
}

interface Values {
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  contactId: string;
  dealId: string;
  ownerId: string;
}

const EMPTY: Values = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  contactId: '',
  dealId: '',
  ownerId: '',
};

const fromTask = (task: Task): Values => ({
  title: task.title,
  description: task.description ?? '',
  dueDate: toDateInputValue(task.dueDate),
  priority: task.priority,
  contactId: task.contactId ?? '',
  dealId: task.dealId ?? '',
  ownerId: task.ownerId,
});

const orUndefined = (value: string): string | undefined => value.trim() || undefined;

export function TaskForm({ open, onClose, task, defaults, onSaved }: TaskFormProps) {
  const formId = useId();
  const { user } = useSession();
  const { lookups } = useTaskLookups();
  const { create, update, reset } = useTaskMutations();

  const [values, setValues] = useState<Values>(EMPTY);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const editing = Boolean(task);
  const pending = create.pending || update.pending;

  useEffect(() => {
    if (!open) return;
    setValues(
      task
        ? fromTask(task)
        : {
            ...EMPTY,
            ownerId: user?.id ?? '',
            contactId: defaults?.contactId ?? '',
            dealId: defaults?.dealId ?? '',
          },
    );
    setLocalErrors({});
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task, user?.id, defaults?.contactId, defaults?.dealId]);

  const errors = useMemo(
    () => ({ ...fieldErrors(create.error), ...fieldErrors(update.error), ...localErrors }),
    [create.error, update.error, localErrors],
  );
  const message = formMessage(create.error) ?? formMessage(update.error);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setLocalErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  /* Attaching a task to a deal usually means the deal's contact too. Fill it
     in only when it is still blank. */
  const onDealChange = (dealId: string) => {
    setValues((current) => {
      const deal = lookups.dealById.get(dealId);
      return { ...current, dealId, contactId: current.contactId || deal?.contactId || '' };
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!values.title.trim()) {
      setLocalErrors({ title: 'A task needs a title' });
      return;
    }

    const shared = {
      title: values.title.trim(),
      description: orUndefined(values.description),
      dueDate: fromDateInputValue(values.dueDate),
      priority: values.priority,
      contactId: values.contactId || undefined,
      dealId: values.dealId || undefined,
    };

    try {
      let saved: Task;
      if (task) {
        const patch: TaskUpdate = { ...shared, ownerId: values.ownerId || task.ownerId };
        saved = await update.run(task.id, patch);
        toast.success('Task updated');
      } else {
        const input: TaskCreate = { ...shared, ownerId: values.ownerId || undefined };
        saved = await create.run(input);
        toast.success('Task added');
      }
      onSaved?.(saved);
      onClose();
    } catch {
      // Surfaced through `errors` / `message`.
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? 'Edit task' : 'New task'}
      description={editing ? undefined : 'A title is enough. A due date makes it show up when it matters.'}
      id="task-form-title"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={pending}>
            {editing ? 'Save changes' : 'Add task'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {message && (
          <p role="alert" className="rounded bg-danger-100 px-3 py-2 text-base text-danger-600">
            {message}
          </p>
        )}

        <Field label="Task" error={errors.title} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="Send the revised quote"
              autoFocus
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Due date" error={errors.dueDate}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="date"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={values.dueDate}
                onChange={(event) => set('dueDate', event.target.value)}
              />
            )}
          </Field>
          <Field label="Priority" error={errors.priority}>
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={values.priority}
                onChange={(event) => set('priority', event.target.value as Priority)}
                options={PRIORITY_OPTIONS}
              />
            )}
          </Field>
        </div>

        <Field label="Deal" error={errors.dealId} hint={lookups.deals.length === 0 ? 'No deals yet.' : undefined}>
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={values.dealId}
              onChange={(event) => onDealChange(event.target.value)}
              placeholder="Not about a deal"
              options={lookups.deals.map((deal) => ({ value: deal.id, label: deal.title }))}
            />
          )}
        </Field>

        <Field
          label="Contact"
          error={errors.contactId}
          hint={lookups.contacts.length === 0 ? 'No contacts yet.' : undefined}
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={values.contactId}
              onChange={(event) => set('contactId', event.target.value)}
              placeholder="Not about a person"
              options={lookups.contacts.map((contact) => ({
                value: contact.id,
                label: fullName(contact) || 'Unnamed',
              }))}
            />
          )}
        </Field>

        <Field label="Owner" error={errors.ownerId}>
          {({ id, describedBy }) => (
            <OwnerSelect
              id={id}
              aria-describedby={describedBy}
              value={values.ownerId}
              onChange={(ownerId) => set('ownerId', ownerId)}
            />
          )}
        </Field>

        <Field label="Notes" error={errors.description}>
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              rows={3}
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              placeholder="Anything you need in front of you when you pick this up."
            />
          )}
        </Field>
      </form>
    </Drawer>
  );
}
