import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { FilterSelect, ListToolbar } from '@/components/ListToolbar';
import { Pagination } from '@/components/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { IconPlus, IconTrash } from '@/components/icons';
import { initialSuppliers } from '@/data/datasets';
import type { ID, SupplierRecord } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SupplierForm } from './SupplierForm';

export function SuppliersPage() {
  const navigate = useNavigate();
  const {
    items: suppliers,
    total,
    page,
    pageSize,
    search,
    setSearch,
    filters,
    setFilter,
    setPage,
    createItem,
    updateItem,
    deleteItem,
  } = useLocalCollection<SupplierRecord>('suppliers', initialSuppliers, {
    searchFields: ['name', 'code', 'category', 'contactPerson', 'city', 'country'],
    defaultSort: { field: 'name', dir: 'asc' },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);
  const [deletingId, setDeletingId] = useState<ID | null>(null);

  const categories = Array.from(new Set(initialSuppliers.map((s) => s.category)));

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (sup: SupplierRecord) => {
    setEditingSupplier(sup);
    setFormOpen(true);
  };

  const handleSave = (data: Omit<SupplierRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingSupplier) {
      updateItem(editingSupplier.id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
    } else {
      createItem({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteItem(deletingId);
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Suppliers"
        description="Vendor profiles, commercial terms, manufacturing partners, and procurement contracts."
        actions={
          <Button variant="primary" onClick={handleOpenCreate}>
            <IconPlus size={16} /> Register Supplier
          </Button>
        }
      />

      <Card>
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search suppliers by name, code, contact, or location…"
          filters={
            <FilterSelect
              label="Category"
              allLabel="All categories"
              value={(filters.category as string) ?? ''}
              onChange={(cat) => setFilter('category', cat)}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
          }
        />

        {suppliers.length === 0 ? (
          <EmptyState
            title="No suppliers match"
            description="Adjust your search filters or register a new vendor partner."
            action={
              <Button variant="primary" onClick={handleOpenCreate}>
                Add Supplier
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Contact Lead</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Active Contracts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((sup) => (
                  <TableRow
                    key={sup.id}
                    onClick={() => navigate(`/crm/suppliers/${sup.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div>
                        <span className="font-semibold text-ink-900 group-hover:text-accent-600">
                          {sup.name}
                        </span>
                        <p className="text-2xs text-ink-500">
                          {sup.code} · {sup.city}, {sup.country}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tag tone="neutral">{sup.category}</Tag>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-medium text-ink-900">{sup.contactPerson}</p>
                        <p className="text-2xs text-ink-500">{sup.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-ink-700">{sup.paymentTerms}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-positive-600">
                        ★ {sup.rating.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-ink-700">{sup.activeContracts} active</span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(sup)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingId(sup.id)}
                          className="text-danger-600 hover:bg-danger-100"
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <SupplierForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        supplier={editingSupplier}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deletingId)}
        title="Delete Supplier Record"
        description="Are you sure you want to remove this supplier profile? Associated purchase records will remain archived."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
