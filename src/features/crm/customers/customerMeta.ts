import type { TagTone } from '@/components/Tag';
import type { ContactStatus, SortDirection } from '@/data/types';

export const CUSTOMER_STATUS_LABEL: Record<ContactStatus, string> = {
  lead: 'Lead',
  active: 'Active Customer',
  inactive: 'Inactive Account',
};

export const CUSTOMER_STATUS_TONE: Record<ContactStatus, TagTone> = {
  lead: 'accent',
  active: 'positive',
  inactive: 'neutral',
};

export const CUSTOMER_STATUS_OPTIONS = (
  Object.keys(CUSTOMER_STATUS_LABEL) as ContactStatus[]
).map((value) => ({ value, label: CUSTOMER_STATUS_LABEL[value] }));

export const CUSTOMER_DEFAULT_SORT: { field: string; dir: SortDirection } = {
  field: 'lastName',
  dir: 'asc',
};
