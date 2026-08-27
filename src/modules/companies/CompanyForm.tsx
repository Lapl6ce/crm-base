import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { OwnerSelect } from '@/components/OwnerSelect';
import { Drawer } from '@/components/Overlay';
import { TagInput } from '@/components/TagInput';
import { toast } from '@/components/Toast';
import { fieldErrors, formMessage } from '@/data/formErrors';
import { useSession } from '@/data/useSession';
import type { CompanyCreate, CompanyUpdate } from '@/data/repositories';
import type { Company, CompanySize } from '@/data/types';
import { COMPANY_SIZE_OPTIONS } from './companyMeta';
import { useCompanyLookups, useCompanyMutations } from './useCompanies';

/* Create and edit a company. Same contract as ContactForm: local checks for
   what the user can see, and the adapter's ValidationError for the rest. */

export interface CompanyFormProps {
  open: boolean;
  onClose: () => void;
  /** Omit to create. */
  company?: Company | null;
  onSaved?: (company: Company) => void;
}

interface Values {
  name: string;
  domain: string;
  industry: string;
  size: string;
  phone: string;
  website: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  ownerId: string;
  tags: string[];
}

const EMPTY: Values = {
  name: '',
  domain: '',
  industry: '',
  size: '',
  phone: '',
  website: '',
  line1: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
  ownerId: '',
  tags: [],
};

const fromCompany = (company: Company): Values => ({
  name: company.name,
  domain: company.domain ?? '',
  industry: company.industry ?? '',
  size: company.size ?? '',
  phone: company.phone ?? '',
  website: company.website ?? '',
  line1: company.address?.line1 ?? '',
  city: company.address?.city ?? '',
  region: company.address?.region ?? '',
  postalCode: company.address?.postalCode ?? '',
  country: company.address?.country ?? '',
  ownerId: company.ownerId,
  tags: [...company.tags],
});

const orUndefined = (value: string): string | undefined => value.trim() || undefined;

/** An address of nothing is no address at all — do not store an empty object. */
function buildAddress(values: Values): Company['address'] {
  const address = {
    line1: orUndefined(values.line1),
    city: orUndefined(values.city),
    region: orUndefined(values.region),
    postalCode: orUndefined(values.postalCode),
    country: orUndefined(values.country),
  };
  return Object.values(address).some(Boolean) ? address : undefined;
}

export function CompanyForm({ open, onClose, company, onSaved }: CompanyFormProps) {
  const formId = useId();
  const { user } = useSession();
  const { lookups } = useCompanyLookups();
  const { create, update, reset } = useCompanyMutations();

  const [values, setValues] = useState<Values>(EMPTY);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const editing = Boolean(company);
  const pending = create.pending || update.pending;
  const industryListId = `${formId}-industries`;

  useEffect(() => {
    if (!open) return;
    setValues(company ? fromCompany(company) : { ...EMPTY, ownerId: user?.id ?? '' });
    setLocalErrors({});
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company, user?.id]);

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
    if (!values.name.trim()) {
      setLocalErrors({ name: 'A company name is required' });
      return;
    }

    const shared = {
      name: values.name.trim(),
      domain: orUndefined(values.domain),
      industry: orUndefined(values.industry),
      size: (values.size || undefined) as CompanySize | undefined,
      phone: orUndefined(values.phone),
      website: orUndefined(values.website),
      address: buildAddress(values),
      tags: values.tags,
    };

    try {
      let saved: Company;
      if (company) {
        const patch: CompanyUpdate = { ...shared, ownerId: values.ownerId || company.ownerId };
        saved = await update.run(company.id, patch);
        toast.success('Company updated');
      } else {
        const input: CompanyCreate = { ...shared, ownerId: values.ownerId || undefined };
        saved = await create.run(input);
        toast.success(`${saved.name} added`);
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
      title={editing ? 'Edit company' : 'New company'}
      description={editing ? undefined : 'Only the name is required.'}
      id="company-form-title"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={pending}>
            {editing ? 'Save changes' : 'Create company'}
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

        <Field label="Company name" error={errors.name} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              autoComplete="organization"
              autoFocus
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Domain" error={errors.domain} hint="acme.com">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={values.domain}
                onChange={(event) => set('domain', event.target.value)}
                placeholder="acme.com"
              />
            )}
          </Field>
          <Field label="Website" error={errors.website}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                value={values.website}
                onChange={(event) => set('website', event.target.value)}
                placeholder="https://acme.com"
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Industry" error={errors.industry}>
            {({ id, describedBy, invalid }) => (
              <>
                <Input
                  id={id}
                  list={industryListId}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={values.industry}
                  onChange={(event) => set('industry', event.target.value)}
                  placeholder="Logistics"
                />
                {/* Free text, but offering what is already in use keeps the
                    filter list from filling up with near-duplicates. */}
                <datalist id={industryListId}>
                  {lookups.industries.map((industry) => (
                    <option key={industry} value={industry} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Size" error={errors.size}>
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={values.size}
                onChange={(event) => set('size', event.target.value)}
                placeholder="Unknown"
                options={COMPANY_SIZE_OPTIONS}
              />
            )}
          </Field>
        </div>

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

        <fieldset className="flex flex-col gap-4 rounded border border-ink-100 p-3">
          <legend className="px-1 text-xs font-medium text-ink-500">Address</legend>
          <Field label="Street" hideLabel error={errors.line1}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                value={values.line1}
                onChange={(event) => set('line1', event.target.value)}
                placeholder="Street address"
                autoComplete="address-line1"
              />
            )}
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              {({ id }) => (
                <Input
                  id={id}
                  value={values.city}
                  onChange={(event) => set('city', event.target.value)}
                  autoComplete="address-level2"
                />
              )}
            </Field>
            <Field label="Region">
              {({ id }) => (
                <Input
                  id={id}
                  value={values.region}
                  onChange={(event) => set('region', event.target.value)}
                  autoComplete="address-level1"
                />
              )}
            </Field>
            <Field label="Postal code">
              {({ id }) => (
                <Input
                  id={id}
                  value={values.postalCode}
                  onChange={(event) => set('postalCode', event.target.value)}
                  autoComplete="postal-code"
                />
              )}
            </Field>
            <Field label="Country">
              {({ id }) => (
                <Input
                  id={id}
                  value={values.country}
                  onChange={(event) => set('country', event.target.value)}
                  autoComplete="country-name"
                />
              )}
            </Field>
          </div>
        </fieldset>

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
