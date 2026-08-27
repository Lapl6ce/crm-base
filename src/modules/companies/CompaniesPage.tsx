import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { IconPlus } from '@/components/icons';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Pagination } from '@/components/Pagination';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { useListQuery } from '@/data/useListQuery';
import { useSession } from '@/data/useSession';
import type { Company } from '@/data/types';
import { PageHeader } from '@/layout/PageHeader';
import { formatNumber, pluralize } from '@/lib/format';
import { can } from '@/lib/rbac';
import { CompanyForm } from './CompanyForm';
import { COMPANY_DEFAULT_SORT, COMPANY_SIZE_LABEL, COMPANY_SIZE_OPTIONS } from './companyMeta';
import { useCompanyList, useCompanyLookups } from './useCompanies';

/* The company list. Same machinery as Contacts — one useListQuery, one
   repository call, one Table — because the two screens behaving identically is
   worth more than either of them being individually clever.
 *
 * No heat stripe here on purpose: heat answers "how much does this need me
 * right now?" and a company has no due date of its own (CONTEXT.md §4). Its
 * urgency lives on its deals and its people, and a stripe with nothing behind
 * it would be decoration pretending to be signal.
 */

export function CompaniesPage() {
  const navigate = useNavigate();
  const { user, users } = useSession();

  const list = useListQuery({ defaultSort: COMPANY_DEFAULT_SORT });
  const { data, loading, error, refresh } = useCompanyList(list.query);
  const { lookups } = useCompanyLookups();

  const [formOpen, setFormOpen] = useState(false);

  const openCreate = useCallback(() => setFormOpen(true), []);

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const canEdit = can(user, 'companies.edit');
  const narrowed = Boolean(list.query.search) || list.activeFilterCount > 0;

  const columns: Column<Company>[] = [
    {
      key: 'name',
      header: 'Company',
      sortField: 'name',
      mobile: 'primary',
      render: (company) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-900">{company.name}</p>
          {company.domain && <p className="truncate text-xs text-ink-300">{company.domain}</p>}
        </div>
      ),
    },
    {
      key: 'industry',
      header: 'Industry',
      sortField: 'industry',
      mobile: 'secondary',
      render: (company) =>
        company.industry ? (
          <span className="truncate">{company.industry}</span>
        ) : (
          <span className="text-ink-300">—</span>
        ),
    },
    {
      key: 'size',
      header: 'Size',
      sortField: 'size',
      width: '9rem',
      render: (company) =>
        company.size ? (
          <span className="text-xs text-ink-500">{COMPANY_SIZE_LABEL[company.size]}</span>
        ) : (
          <span className="text-ink-300">—</span>
        ),
    },
    {
      key: 'contacts',
      header: 'Contacts',
      align: 'right',
      width: '6rem',
      render: (company) => {
        const count = lookups.contactCounts[company.id] ?? 0;
        return count === 0 ? (
          <span className="text-ink-300">—</span>
        ) : (
          <span className="tnum text-ink-700">{formatNumber(count)}</span>
        );
      },
    },
    {
      key: 'tags',
      header: 'Tags',
      mobile: 'desktop',
      render: (company) =>
        company.tags.length === 0 ? (
          <span className="text-ink-300">—</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {company.tags.slice(0, 2).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            {company.tags.length > 2 && (
              <span className="self-center text-2xs text-ink-300">
                +{company.tags.length - 2}
              </span>
            )}
          </span>
        ),
    },
    {
      key: 'owner',
      header: 'Owner',
      mobile: 'desktop',
      width: '10rem',
      render: (company) => {
        const owner = userById.get(company.ownerId);
        if (!owner) return <span className="text-ink-300">Unassigned</span>;
        return (
          <div className="flex items-center gap-2">
            <Avatar name={owner.name} color={owner.avatarColor} size="sm" />
            <span className="truncate text-xs text-ink-500">{owner.name}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Companies"
        meta={loading ? undefined : pluralize(total, 'company', 'companies')}
        actions={
          canEdit && (
            <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
              New company
            </Button>
          )
        }
        toolbar={
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search name, domain, industry, tag…"
            activeFilterCount={list.activeFilterCount}
            onClearFilters={list.clearFilters}
            filters={
              <>
                {lookups.industries.length > 0 && (
                  <FilterSelect
                    label="Filter by industry"
                    allLabel="Any industry"
                    value={list.filters.industry ?? ''}
                    onChange={(value) => list.setFilter('industry', value)}
                    options={lookups.industries.map((industry) => ({
                      value: industry,
                      label: industry,
                    }))}
                  />
                )}
                <FilterSelect
                  label="Filter by size"
                  allLabel="Any size"
                  value={list.filters.size ?? ''}
                  onChange={(value) => list.setFilter('size', value)}
                  options={COMPANY_SIZE_OPTIONS}
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
              rowKey={(company) => company.id}
              sort={list.sort}
              onSortChange={list.setSort}
              onRowClick={(company) => navigate(`/companies/${company.id}`)}
              loading={loading}
              empty={
                narrowed ? (
                  <EmptyState
                    title="No companies match"
                    description="Nothing here fits that search and those filters. Widen one of them to see accounts again."
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
                    title="No companies yet"
                    description="Companies group the people you talk to and the deals you run with them. Add the first account."
                    action={
                      canEdit && (
                        <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
                          New company
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

      <CompanyForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
