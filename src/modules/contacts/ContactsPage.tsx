import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { HeatLabel } from '@/components/HeatStripe';
import { IconPlus } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { useListQuery } from '@/data/useListQuery';
import { useSession } from '@/data/useSession';
import type { Contact } from '@/data/types';
import { PageHeader } from '@/layout/PageHeader';
import { fullName, pluralize } from '@/lib/format';
import { contactHeat } from '@/lib/heat';
import { can } from '@/lib/rbac';
import { CONTACT_DEFAULT_SORT, CONTACT_STATUS_LABEL, CONTACT_STATUS_OPTIONS, CONTACT_STATUS_TONE } from './contactMeta';
import { ContactForm } from './ContactForm';
import { useContactList, useContactLookups, useLastActivityByContact } from './useContacts';

/* The contact list: search, filter, sort, paginate — all of it server-shaped.
 *
 * Every narrowing goes into a ListQuery and back through the repository rather
 * than filtering an array in the browser. Against the mock adapter the two are
 * indistinguishable; against a real backend, only one of them still works.
 */

export function ContactsPage() {
  const navigate = useNavigate();
  const { user, users } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();

  const list = useListQuery({ defaultSort: CONTACT_DEFAULT_SORT });
  const { data, loading, error, refresh } = useContactList(list.query);
  const { lookups } = useContactLookups();
  const lastActivity = useLastActivityByContact();

  const [formOpen, setFormOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<{ companyId?: string }>({});

  /* The cross-module handshake: Companies cannot import this form (modules are
     islands, CONTEXT.md §3), so "Add contact" over there navigates here with
     ?new=1&companyId=… and we open prefilled. The URL is the contract. */
  useEffect(() => {
    if (searchParams.get('new') === null) return;
    const companyId = searchParams.get('companyId') ?? undefined;
    setCreateDefaults({ companyId });
    setFormOpen(true);
    // Consume the params so a refresh does not reopen the drawer.
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  /* Editing is reached from a contact's own page, not from a row here: a list
     is for finding, and a row that both navigates and edits does neither well. */
  const openCreate = useCallback(() => {
    setCreateDefaults({});
    setFormOpen(true);
  }, []);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const canEdit = can(user, 'contacts.edit');
  const narrowed = Boolean(list.query.search) || list.activeFilterCount > 0;

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      sortField: 'lastName',
      mobile: 'primary',
      render: (contact) => (
        <div className="flex items-center gap-2.5">
          <Avatar
            name={fullName(contact) || 'Unnamed'}
            color={userById.get(contact.ownerId)?.avatarColor}
            size="sm"
            className="md:hidden lg:inline-flex"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900">{fullName(contact) || 'Unnamed'}</p>
            {contact.jobTitle && (
              <p className="truncate text-xs text-ink-300">{contact.jobTitle}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      mobile: 'secondary',
      render: (contact) => {
        const company = contact.companyId ? lookups.companyById.get(contact.companyId) : undefined;
        return company ? (
          <span className="truncate">{company.name}</span>
        ) : (
          <span className="text-ink-300">—</span>
        );
      },
    },
    {
      key: 'email',
      header: 'Email',
      sortField: 'email',
      render: (contact) =>
        contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            onClick={(event) => event.stopPropagation()}
            className="truncate text-ink-700 underline-offset-2 hover:text-accent-600 hover:underline"
          >
            {contact.email}
          </a>
        ) : (
          <span className="text-ink-300">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortField: 'status',
      width: '7rem',
      render: (contact) => (
        <Tag tone={CONTACT_STATUS_TONE[contact.status]}>
          {CONTACT_STATUS_LABEL[contact.status]}
        </Tag>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      mobile: 'desktop',
      width: '10rem',
      render: (contact) => {
        const owner = userById.get(contact.ownerId);
        if (!owner) return <span className="text-ink-300">Unassigned</span>;
        return (
          <div className="flex items-center gap-2">
            <Avatar name={owner.name} color={owner.avatarColor} size="sm" />
            <span className="truncate text-xs text-ink-500">{owner.name}</span>
          </div>
        );
      },
    },
    {
      key: 'activity',
      header: 'Last touch',
      align: 'right',
      width: '9rem',
      /* The words beside the stripe. Heat never travels alone (CONTEXT.md §4). */
      render: (contact) => (
        <HeatLabel heat={contactHeat({ lastActivityAt: lastActivity[contact.id] })} />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Contacts"
        meta={loading ? undefined : pluralize(total, 'contact')}
        actions={
          canEdit && (
            <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
              New contact
            </Button>
          )
        }
        toolbar={
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search name, email, phone, tag…"
            activeFilterCount={list.activeFilterCount}
            onClearFilters={list.clearFilters}
            filters={
              <>
                <FilterSelect
                  label="Filter by status"
                  allLabel="Any status"
                  value={list.filters.status ?? ''}
                  onChange={(value) => list.setFilter('status', value)}
                  options={CONTACT_STATUS_OPTIONS}
                />
                <FilterSelect
                  label="Filter by company"
                  allLabel="Any company"
                  value={list.filters.companyId ?? ''}
                  onChange={(value) => list.setFilter('companyId', value)}
                  options={lookups.companies.map((company) => ({
                    value: company.id,
                    label: company.name,
                  }))}
                />
                <FilterSelect
                  label="Filter by owner"
                  allLabel="Any owner"
                  value={list.filters.ownerId ?? ''}
                  onChange={(value) => list.setFilter('ownerId', value)}
                  options={users.map((u) => ({ value: u.id, label: u.name }))}
                />
                {lookups.tags.length > 0 && (
                  <FilterSelect
                    label="Filter by tag"
                    allLabel="Any tag"
                    value={list.filters.tags ?? ''}
                    onChange={(value) => list.setFilter('tags', value)}
                    options={lookups.tags.map((tag) => ({ value: tag, label: tag }))}
                  />
                )}
              </>
            }
          />
        }
      />

      <Card className="overflow-hidden">
        {error ? (
          <ErrorState description={error.message} onRetry={refresh} />
        ) : (
          <>
            <Table
              items={items}
              columns={columns}
              rowKey={(contact) => contact.id}
              sort={list.sort}
              onSortChange={list.setSort}
              onRowClick={(contact) => navigate(`/contacts/${contact.id}`)}
              heat={(contact) => contactHeat({ lastActivityAt: lastActivity[contact.id] })}
              loading={loading}
              empty={
                narrowed ? (
                  <EmptyState
                    title="No contacts match"
                    description="Nothing here fits that search and those filters. Widen one of them to see people again."
                    action={
                      <Button
                        onClick={() => {
                          list.setSearch('');
                          list.clearFilters();
                        }}
                      >
                        Reset search and filters
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    title="No contacts yet"
                    description="Contacts are the people behind every deal. Add the first one and it will show up here."
                    action={
                      canEdit && (
                        <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
                          New contact
                        </Button>
                      )
                    }
                  />
                )
              }
            />
            {items.length > 0 && (
              <Pagination
                page={data?.page ?? 1}
                pageSize={data?.pageSize ?? list.pageSize}
                total={total}
                onPageChange={list.setPage}
                className="border-t border-ink-100 px-3"
              />
            )}
          </>
        )}
      </Card>

      <ContactForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        defaults={createDefaults}
      />
    </div>
  );
}
