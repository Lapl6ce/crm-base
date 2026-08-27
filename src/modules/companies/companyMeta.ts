import type { CompanySize, SortDirection } from '@/data/types';

/* Module-local vocabulary for companies: the size buckets as people say them,
   and the sort a company list opens on. */

export const COMPANY_SIZE_LABEL: Record<CompanySize, string> = {
  '1-10': '1–10 people',
  '11-50': '11–50 people',
  '51-200': '51–200 people',
  '201-1000': '201–1,000 people',
  '1000+': '1,000+ people',
};

export const COMPANY_SIZES = Object.keys(COMPANY_SIZE_LABEL) as CompanySize[];

export const COMPANY_SIZE_OPTIONS = COMPANY_SIZES.map((value) => ({
  value,
  label: COMPANY_SIZE_LABEL[value],
}));

/** Accounts are scanned alphabetically; nobody looks for "the newest company". */
export const COMPANY_DEFAULT_SORT: { field: string; dir: SortDirection } = {
  field: 'name',
  dir: 'asc',
};

/** Domains are stored bare ("acme.com"); links need a scheme. */
export function websiteUrl(company: { website?: string; domain?: string }): string | null {
  const raw = company.website?.trim() || company.domain?.trim();
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** "12 Alder St, Bristol, BS1, UK" — one line, skipping what is missing. */
export function formatAddress(address?: {
  line1?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}): string {
  if (!address) return '';
  return [address.line1, address.city, address.region, address.postalCode, address.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}
