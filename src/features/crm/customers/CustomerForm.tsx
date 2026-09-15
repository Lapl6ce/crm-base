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
import { CUSTOMER_STATUS_OPTIONS } from './customerMeta';
import { useContactLookups, useContactMutations } from '@/data/useContacts';

export interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  contact?: Contact | null;
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
  status: 'active',
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

const orUndefined = (value: string): string | undefined => value.trim() || undefined;

export function CustomerForm({ open, onClose, contact, defaults, onSaved }: CustomerFormProps) {
  const formId = useId();
  const { user } = useSession();
  const { lookups } = useContactLookups();
  const { create, update, reset } = useContactMutations();

  const [values, setValues] = useState<Values>(EMPTY);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const editing = Boolean(contact);
  const pending = create.pending || update.pending;

  useEffect(() => {
    if (!open) return;
    setValues(
      contact
        ? fromContact(contact)
        : { ...EMPTY, ownerId: user?.id ?? '', companyId: defaults?.companyId ?? '' },
    );
    setLocalErrors({});
    reset();
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
        toast.success('Customer profile updated');
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
      // captured by form errors
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Customer' : 'New Customer'}
      description={editing ? undefined : 'Enter key details to record an active client relationship.'}
      id="customer-form-title"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={pending}>
            {editing ? 'Save changes' : 'Create customer'}
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
                placeholder="Chief Technology Officer"
              />
            )}
          </Field>
        </div>

        <Field
          label="Company / Account"
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
              placeholder="Select account"
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
                options={CUSTOMER_STATUS_OPTIONS}
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

        <Field label="Tags" hint="Enter or comma to add.">
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
