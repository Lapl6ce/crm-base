import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { OwnerSelect } from '@/components/OwnerSelect';
import { Drawer } from '@/components/Overlay';
import { toast } from '@/components/Toast';
import { fieldErrors, formMessage } from '@/data/formErrors';
import { useSession } from '@/data/useSession';
import type { DealCreate, DealUpdate } from '@/data/repositories';
import type { Deal, ID } from '@/data/types';
import { fromDateInputValue, fullName, toDateInputValue } from '@/lib/format';
import { STAGE_OUTCOME_LABEL } from './dealMeta';
import { useDealLookups, useDealMutations } from './useDeals';

/* Create and edit a deal.
 *
 * `status` is not a field here on purpose: it is derived from the stage's
 * outcome by the repository (CONTEXT.md §1). Offering a status dropdown next
 * to a stage dropdown would let a user put the two into a state the data layer
 * would immediately overwrite.
 */

export interface DealFormProps {
  open: boolean;
  onClose: () => void;
  /** Omit to create. */
  deal?: Deal | null;
  /** Prefill for a create — the column you clicked "New deal" in. */
  defaults?: { stageId?: ID; contactId?: ID; companyId?: ID };
  onSaved?: (deal: Deal) => void;
}

interface Values {
  title: string;
  value: string;
  currency: string;
  stageId: string;
  contactId: string;
  companyId: string;
  ownerId: string;
  expectedCloseDate: string;
}

const EMPTY: Values = {
  title: '',
  value: '',
  currency: '',
  stageId: '',
  contactId: '',
  companyId: '',
  ownerId: '',
  expectedCloseDate: '',
};

const fromDeal = (deal: Deal): Values => ({
  title: deal.title,
  value: String(deal.value),
  currency: deal.currency,
  stageId: deal.stageId,
  contactId: deal.contactId ?? '',
  companyId: deal.companyId ?? '',
  ownerId: deal.ownerId,
  expectedCloseDate: toDateInputValue(deal.expectedCloseDate),
});

export function DealForm({ open, onClose, deal, defaults, onSaved }: DealFormProps) {
  const formId = useId();
  const { user, settings, stages } = useSession();
  const { lookups } = useDealLookups();
  const { create, update, reset } = useDealMutations();

  const [values, setValues] = useState<Values>(EMPTY);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const editing = Boolean(deal);
  const pending = create.pending || update.pending;
  const firstOpenStage = stages.find((s) => s.outcome === 'open') ?? stages[0];

  useEffect(() => {
    if (!open) return;
    setValues(
      deal
        ? fromDeal(deal)
        : {
            ...EMPTY,
            ownerId: user?.id ?? '',
            currency: settings?.defaultCurrency ?? 'USD',
            stageId: defaults?.stageId ?? firstOpenStage?.id ?? '',
            contactId: defaults?.contactId ?? '',
            companyId: defaults?.companyId ?? '',
          },
    );
    setLocalErrors({});
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal, user?.id, settings?.defaultCurrency, firstOpenStage?.id, defaults?.stageId, defaults?.contactId, defaults?.companyId]);

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

  /* Picking a person usually implies the account. Fill it in, but only when it
     is still blank — never overwrite a choice the user already made. */
  const onContactChange = (contactId: string) => {
    setValues((current) => {
      const contact = lookups.contactById.get(contactId);
      return {
        ...current,
        contactId,
        companyId: current.companyId || contact?.companyId || '',
      };
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const local: Record<string, string> = {};
    if (!values.title.trim()) local.title = 'A deal title is required';
    const numericValue = Number(values.value);
    if (values.value.trim() === '' || Number.isNaN(numericValue) || numericValue < 0) {
      local.value = 'Enter a value of 0 or more';
    }
    if (Object.keys(local).length > 0) {
      setLocalErrors(local);
      return;
    }

    const shared = {
      title: values.title.trim(),
      value: numericValue,
      currency: values.currency || settings?.defaultCurrency || 'USD',
      contactId: values.contactId || undefined,
      companyId: values.companyId || undefined,
      expectedCloseDate: fromDateInputValue(values.expectedCloseDate),
    };

    try {
      let saved: Deal;
      if (deal) {
        // stageId goes through update(), which routes a stage change back into
        // moveToStage() for us — history does not depend on which form the
        // user happened to use.
        const patch: DealUpdate = {
          ...shared,
          stageId: values.stageId || deal.stageId,
          ownerId: values.ownerId || deal.ownerId,
        };
        saved = await update.run(deal.id, patch);
        toast.success('Deal updated');
      } else {
        const input: DealCreate = {
          ...shared,
          stageId: values.stageId || undefined,
          ownerId: values.ownerId || undefined,
        };
        saved = await create.run(input);
        toast.success(`${saved.title} created`);
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
      title={editing ? 'Edit deal' : 'New deal'}
      description={editing ? undefined : 'Won and lost are set by the stage, not here.'}
      id="deal-form-title"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={pending}>
            {editing ? 'Save changes' : 'Create deal'}
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

        <Field label="Title" error={errors.title} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.title}
              onChange={(event) => set('title', event.target.value)}
              placeholder="Q3 fleet renewal"
              autoFocus
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Value" error={errors.value} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={values.value}
                onChange={(event) => set('value', event.target.value)}
                className="tnum font-mono"
                placeholder="0"
              />
            )}
          </Field>
          <Field label="Currency" error={errors.currency} hint="ISO code, e.g. USD">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={values.currency}
                onChange={(event) => set('currency', event.target.value.toUpperCase())}
                maxLength={3}
                className="uppercase"
              />
            )}
          </Field>
        </div>

        <Field
          label="Stage"
          error={errors.stageId}
          hint="A stage that closes a deal sets it to won or lost."
        >
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.stageId}
              onChange={(event) => set('stageId', event.target.value)}
              options={stages.map((stage) => ({
                value: stage.id,
                label:
                  stage.outcome === 'open'
                    ? stage.name
                    : `${stage.name} (${STAGE_OUTCOME_LABEL[stage.outcome].toLowerCase()})`,
              }))}
            />
          )}
        </Field>

        <Field label="Expected close date" error={errors.expectedCloseDate}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="date"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.expectedCloseDate}
              onChange={(event) => set('expectedCloseDate', event.target.value)}
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
              onChange={(event) => onContactChange(event.target.value)}
              placeholder="No contact"
              options={lookups.contacts.map((contact) => ({
                value: contact.id,
                label: fullName(contact) || 'Unnamed',
              }))}
            />
          )}
        </Field>

        <Field
          label="Company"
          error={errors.companyId}
          hint={lookups.companies.length === 0 ? 'No companies yet.' : undefined}
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
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
      </form>
    </Drawer>
  );
}
