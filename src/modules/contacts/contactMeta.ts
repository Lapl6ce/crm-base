import type { TagTone } from '@/components/Tag';
import type { ContactStatus, SortDirection } from '@/data/types';

/* Module-local vocabulary: how a contact's status is worded and coloured, and
   what "sorted" means before anyone clicks a column. Kept out of lib/ because
   nothing outside Contacts has an opinion about it. */

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  lead: 'Lead',
  active: 'Active',
  inactive: 'Inactive',
};

/* Tone is semantic (CONTEXT.md §4): a lead is the one that wants work, so it
   gets the accent; an active relationship is settled and positive; inactive is
   metadata and should recede. */
export const CONTACT_STATUS_TONE: Record<ContactStatus, TagTone> = {
  lead: 'accent',
  active: 'positive',
  inactive: 'neutral',
};

export const CONTACT_STATUS_OPTIONS = (
  Object.keys(CONTACT_STATUS_LABEL) as ContactStatus[]
).map((value) => ({ value, label: CONTACT_STATUS_LABEL[value] }));

/** People are looked up by name far more often than by anything else. */
export const CONTACT_DEFAULT_SORT: { field: string; dir: SortDirection } = {
  field: 'lastName',
  dir: 'asc',
};
