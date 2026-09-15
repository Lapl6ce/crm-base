import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { HeatLabel } from '@/components/HeatStripe';
import { IconPlus } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Pagination } from '@/components/Pagination';
import { Skeleton } from '@/components/Skeleton';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import type { Company, Contact } from '@/data/types';
import { useCompanyList } from '@/data/useCompanies';
import { useContactList, useContactLookups, useLastActivityByContact } from '@/data/useContacts';
import { useListQuery } from '@/data/useListQuery';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { fullName, pluralize } from '@/lib/format';
import { contactHeat } from '@/lib/heat';
import { can } from '@/lib/rbac';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CustomerForm } from './CustomerForm';
import {
    CUSTOMER_DEFAULT_SORT,
    CUSTOMER_STATUS_LABEL,
    CUSTOMER_STATUS_OPTIONS,
    CUSTOMER_STATUS_TONE,
} from './customerMeta';

export function CustomersPage() {
  const navigate = useNavigate();
  const { user, users } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'contacts' | 'accounts'>('contacts');

  const contactList = useListQuery({ defaultSort: CUSTOMER_DEFAULT_SORT });
  const companyList = useListQuery({ defaultSort: { field: 'name', dir: 'asc' } });

  const { data: contactsData, loading: contactsLoading, error: contactsError, refresh: refreshContacts } =
    useContactList(contactList.query);
  const { data: companiesData, loading: companiesLoading, error: companiesError, refresh: refreshCompanies } =
    useCompanyList(companyList.query);

  const { lookups } = useContactLookups();
  const lastActivity = useLastActivityByContact();

  const [formOpen, setFormOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ companyId?: string }>({});

  useEffect(() => {
    if (searchParams.get('new') === null) return;
    const companyId = searchParams.get('companyId') ?? undefined;
    setCreateDefaults({ companyId });
    setFormOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const openCreate = useCallback(() => {
    setCreateDefaults({});
    setFormOpen(true);
  }, []);

  const contactColumns = useMemo<Column<Contact>[]>(() => {
    const userById = new Map(users.map((u) => [u.id, u]));

    return [
      {
        id: 'name',
        header: 'Customer',
        sortable: true,
        render: (contact) => (
          <div className="flex items-center gap-2.5">
            <Avatar name={fullName(contact)} size="sm" />
            <div className="min-w-0">
              <span className="truncate font-semibold text-ink-900 group-hover:text-accent-600">
                {fullName(contact)}
              </span>
              {contact.jobTitle && (
                <span className="block truncate text-2xs text-ink-300">{contact.jobTitle}</span>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'companyId',
        header: 'Company Account',
        render: (contact) => {
          if (!contact.companyId) return <span className="text-ink-300">—</span>;
          const company = lookups.companyById.get(contact.companyId);
          return company ? (
            <span className="text-xs text-ink-700">{company.name}</span>
          ) : (
            <span className="text-ink-300">—</span>
          );
        },
      },
      {
        id: 'status',
        header: 'Relationship Status',
        sortable: true,
        render: (contact) => (
          <Tag tone={CUSTOMER_STATUS_TONE[contact.status]}>
            {CUSTOMER_STATUS_LABEL[contact.status]}
          </Tag>
        ),
      },
      {
        id: 'tags',
        header: 'Tags',
        render: (contact) =>
          contact.tags.length === 0 ? (
            <span className="text-ink-300">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          ),
      },
      {
        id: 'ownerId',
        header: 'Owner',
        render: (contact) => {
          const owner = userById.get(contact.ownerId);
          return owner ? (
            <span className="text-xs text-ink-700">{owner.name}</span>
          ) : (
            <span className="text-ink-300">—</span>
          );
        },
      },
      {
        id: 'activity',
        header: 'Engagement Heat',
        align: 'right',
        render: (contact) => {
          const heat = contactHeat({ lastActivityAt: lastActivity[contact.id] });
          return <HeatLabel heat={heat} />;
        },
      },
    ];
  }, [lastActivity, lookups.companyById, users]);

  const companyColumns = useMemo<Column<Company>[]>(() => {
    const userById = new Map(users.map((u) => [u.id, u]));

    return [
      {
        id: 'name',
        header: 'Account Name',
        sortable: true,
        render: (comp) => (
          <div>
            <p className="font-semibold text-ink-900 group-hover:text-accent-600">{comp.name}</p>
            {comp.domain && <p className="text-2xs text-ink-300">{comp.domain}</p>}
          </div>
        ),
      },
      {
        id: 'industry',
        header: 'Industry',
        render: (comp) => comp.industry ?? <span className="text-ink-300">—</span>,
      },
      {
        id: 'size',
        header: 'Company Size',
        render: (comp) => (comp.size ? `${comp.size} employees` : '—'),
      },
      {
        id: 'tags',
        header: 'Tags',
        render: (comp) => (
          <div className="flex flex-wrap gap-1">
            {comp.tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        ),
      },
      {
        id: 'ownerId',
        header: 'Account Exec',
        render: (comp) => userById.get(comp.ownerId)?.name ?? '—',
      },
    ];
  }, [users]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Customers"
        description="Active client relationships, converted accounts, key stakeholders, and historical engagement."
        actions={
          can(user, 'contacts.edit') && (
            <Button variant="primary" onClick={openCreate}>
              <IconPlus size={16} /> New Customer
            </Button>
          )
        }
      />

      <Card>
        {/* Toggle between Contact Profiles and Company Accounts */}
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2.5">
          <div className="flex rounded bg-surface-sunken p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('contacts')}
              className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                viewMode === 'contacts'
                  ? 'bg-surface-card text-ink-900 shadow-sm'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              Customer Contacts ({contactsData?.total ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('accounts')}
              className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                viewMode === 'accounts'
                  ? 'bg-surface-card text-ink-900 shadow-sm'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              Company Accounts ({companiesData?.total ?? 0})
            </button>
          </div>

          <span className="text-xs text-ink-500">
            {viewMode === 'contacts'
              ? pluralize(contactsData?.total ?? 0, 'contact')
              : pluralize(companiesData?.total ?? 0, 'company account')}
          </span>
        </div>

        {viewMode === 'contacts' ? (
          <>
            <ListToolbar
              search={contactList.query.search ?? ''}
              onSearchChange={contactList.setSearch}
              searchPlaceholder="Search customers by name, email, or company…"
              filters={
                <>
                  <FilterSelect
                    label="Status"
                    allLabel="All statuses"
                    value={(contactList.query.filters?.status as string) ?? ''}
                    onChange={(status) => contactList.setFilter('status', status)}
                    options={CUSTOMER_STATUS_OPTIONS}
                  />
                  {lookups.companies.length > 0 && (
                    <FilterSelect
                      label="Company"
                      allLabel="All companies"
                      value={(contactList.query.filters?.companyId as string) ?? ''}
                      onChange={(companyId) => contactList.setFilter('companyId', companyId)}
                      options={lookups.companies.map((c) => ({ value: c.id, label: c.name }))}
                    />
                  )}
                </>
              }
            />

            {contactsLoading ? (
              <div className="p-4">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : contactsError ? (
              <ErrorState description={contactsError.message} onRetry={refreshContacts} />
            ) : !contactsData || contactsData.items.length === 0 ? (
              <EmptyState
                title="No customers match this view"
                description="Add your first customer contact or adjust your search filters."
                action={
                  <Button variant="primary" onClick={openCreate}>
                    Add Customer
                  </Button>
                }
              />
            ) : (
              <>
                <Table
                  columns={contactColumns}
                  data={contactsData.items}
                  sort={contactList.sort}
                  onSort={contactList.setSort}
                  getRowLink={(contact) => `/crm/customers/${contact.id}`}
                  getRowHeat={(contact) => contactHeat({ lastActivityAt: lastActivity[contact.id] })}
                />
                <Pagination
                  page={contactsData.page}
                  pageSize={contactsData.pageSize}
                  total={contactsData.total}
                  onPageChange={contactList.setPage}
                />
              </>
            )}
          </>
        ) : (
          <>
            <ListToolbar
              search={companyList.query.search ?? ''}
              onSearchChange={companyList.setSearch}
              searchPlaceholder="Search accounts by name or domain…"
            />

            {companiesLoading ? (
              <div className="p-4">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : companiesError ? (
              <ErrorState description={companiesError.message} onRetry={refreshCompanies} />
            ) : !companiesData || companiesData.items.length === 0 ? (
              <EmptyState
                title="No company accounts found"
                description="Create a client company account to associate customer contacts."
              />
            ) : (
              <>
                <Table
                  columns={companyColumns}
                  data={companiesData.items}
                  sort={companyList.sort}
                  onSort={companyList.setSort}
                  getRowLink={(comp) => `/crm/customers/company/${comp.id}`}
                />
                <Pagination
                  page={companiesData.page}
                  pageSize={companiesData.pageSize}
                  total={companiesData.total}
                  onPageChange={companyList.setPage}
                />
              </>
            )}
          </>
        )}
      </Card>

      <CustomerForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaults={createDefaults}
        onSaved={(contact) => navigate(`/crm/customers/${contact.id}`)}
      />
    </div>
  );
}
