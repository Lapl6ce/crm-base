import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { OwnerSelect } from '@/components/OwnerSelect';
import { Drawer } from '@/components/Overlay';
import { TagInput } from '@/components/TagInput';
import { toast } from '@/components/Toast';
import { fieldErrors, formMessage } from '@/data/formErrors';
import { useSession } from '@/data/useSession';
import type { ContactCreate, ContactUpdate } from '@/data/repositories';
import type { Contact, ContactStatus, ID } from '@/data/types';
import { CONTACT_STATUS_OPTIONS } from './contactMeta';
import { useContactLookups, useContactMutations } from './useContacts';

/* Create and edit in one drawer: the fields are identical, and two components
   that must stay identical eventually will not.
 *
 * Validation is the adapter's (data/formErrors.ts). This form submits, catches
 * the ValidationError and renders its field map — the same code path a server
 * response will take.
 */

export interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  /** Omit to create. */
  contact?: Contact | null;
  /** Prefill for a create, e.g. the company you came from. */
  defaults?: { companyId?: ID };
  onSaved?: (contact: Contact) => void;
}

interface Values {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyId: string;
  status: ContactStatus;
  ownerId: string;
  tags: string[];
}

const EMPTY: Values = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
  companyId: '',
  status: 'lead',
  ownerId: '',
  tags: [],
};

const fromContact = (contact: Contact): Values => ({
  firstName: contact.firstName,
  lastName: contact.lastName,
  email: contact.email ?? '',
  phone: contact.phone ?? '',
  jobTitle: contact.jobTitle ?? '',
  companyId: contact.companyId ?? '',
  status: contact.status,
  ownerId: contact.ownerId,
  tags: [...contact.tags],
});

/** '' means "cleared" on the way out, and the patch must carry the key as
    undefined — omitting it would leave the old value in place. */
const orUndefined = (value: string): string | undefined => value.trim() || undefined;

export function ContactForm({ open, onClose, contact, defaults, onSaved }: ContactFormProps) {
  const formId = useId();
  const { user } = useSession();
  const { lookups } = useContactLookups();
  const { create, update, reset } = useContactMutations();

  const [values, setValues] = useState<Values>(EMPTY);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const editing = Boolean(contact);
  const pending = create.pending || update.pending;

  // Reset on every open so a cancelled edit never leaks into the next one.
  useEffect(() => {
    if (!open) return;
    setValues(
      contact
        ? fromContact(contact)
        : { ...EMPTY, ownerId: user?.id ?? '', companyId: defaults?.companyId ?? '' },
    );
    setLocalErrors({});
    reset();
    // `defaults` is a fresh object per render; its one field is the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact, user?.id, defaults?.companyId]);

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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // One local check, for the rule the user can see being broken as they type.
    if (!values.firstName.trim() && !values.lastName.trim()) {
      setLocalErrors({ firstName: 'A first or last name is required' });
      return;
    }

    try {
      let saved: Contact;
      if (contact) {
        const patch: ContactUpdate = {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: orUndefined(values.email),
          phone: orUndefined(values.phone),
          jobTitle: orUndefined(values.jobTitle),
          companyId: values.companyId || undefined,
          status: values.status,
          ownerId: values.ownerId || contact.ownerId,
          tags: values.tags,
        };
        saved = await update.run(contact.id, patch);
        toast.success('Contact updated');
      } else {
        const input: ContactCreate = {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: orUndefined(values.email),
          phone: orUndefined(values.phone),
          jobTitle: orUndefined(values.jobTitle),
          companyId: values.companyId || undefined,
          status: values.status,
          ownerId: values.ownerId || undefined,
          tags: values.tags,
        };
        saved = await create.run(input);
        toast.success(`${saved.firstName} ${saved.lastName}`.trim() + ' added');
      }
      onSaved?.(saved);
      onClose();
    } catch {
      // Rendered from `errors` / `message`; useMutation already captured it.
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? 'Edit contact' : 'New contact'}
      description={editing ? undefined : 'Only a name is required — the rest can follow.'}
      id="contact-form-title"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={pending}>
            {editing ? 'Save changes' : 'Create contact'}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={values.firstName}
                onChange={(event) => set('firstName', event.target.value)}
                autoComplete="given-name"
                autoFocus
              />
            )}
          </Field>
          <Field label="Last name" error={errors.lastName}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={values.lastName}
                onChange={(event) => set('lastName', event.target.value)}
                autoComplete="family-name"
              />
            )}
          </Field>
        </div>

        <Field label="Email" error={errors.email}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.email}
              onChange={(event) => set('email', event.target.value)}
              autoComplete="email"
              placeholder="name@company.com"
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone" error={errors.phone}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="tel"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={values.phone}
                onChange={(event) => set('phone', event.target.value)}
                autoComplete="tel"
              />
            )}
          </Field>
          <Field label="Job title" error={errors.jobTitle}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={values.jobTitle}
                onChange={(event) => set('jobTitle', event.target.value)}
                placeholder="Head of Operations"
              />
            )}
          </Field>
        </div>

        <Field
          label="Company"
          error={errors.companyId}
          hint={lookups.companies.length === 0 ? 'No companies yet — create one first.' : undefined}
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.companyId}
              onChange={(event) => set('companyId', event.target.value)}
              placeholder="No company"
              options={lookups.companies.map((company) => ({
                value: company.id,
                label: company.name,
              }))}
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status" error={errors.status}>
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={values.status}
                onChange={(event) => set('status', event.target.value as ContactStatus)}
                options={CONTACT_STATUS_OPTIONS}
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
        </div>

        <Field label="Tags" hint="Enter or comma to add. Used by the list filters.">
          {({ id, describedBy }) => (
            <TagInput
              id={id}
              describedBy={describedBy}
              value={values.tags}
              onChange={(tags) => set('tags', tags)}
              suggestions={lookups.tags}
            />
          )}
        </Field>
      </form>
    </Drawer>
  );
}
