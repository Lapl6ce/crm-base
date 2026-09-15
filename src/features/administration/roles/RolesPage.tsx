import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Textarea } from '@/components/Field';
import { IconEdit, IconPlus, IconShield, IconTrash } from '@/components/icons';
import { ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialRoles } from '@/data/datasets';
import type { RoleDefinition } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { pluralize } from '@/lib/format';
import { useState } from 'react';

const ALL_PERMISSIONS = [
  { key: 'crm.view', label: 'View CRM (Leads, Customers, Deals)' },
  { key: 'crm.edit', label: 'Create & Edit CRM records' },
  { key: 'commerce.view', label: 'View Orders, Products & Sales' },
  { key: 'commerce.manage', label: 'Create & Manage Commercial Invoices' },
  { key: 'operations.manage', label: 'Manage Inventory, Warehouses & Shipments' },
  { key: 'finance.manage', label: 'Manage Payments, Expenses & AR/AP' },
  { key: 'reports.view', label: 'View Business Intelligence & Reports' },
  { key: 'admin.manage', label: 'Manage System Settings & Access Control' },
];

export function RolesPage() {
  const {
    items: roles,
    total,
    search,
    setSearch,
    create,
    update,
    remove,
  } = useLocalCollection<RoleDefinition>({
    collectionKey: 'roles',
    initialData: initialRoles,
    defaultSort: { field: 'name', dir: 'asc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleDefinition | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const openCreate = () => {
    setEditingRole(null);
    setName('');
    setCode('');
    setDescription('');
    setSelectedPermissions(['crm.view']);
    setDrawerOpen(true);
  };

  const openEdit = (r: RoleDefinition) => {
    setEditingRole(r);
    setName(r.name);
    setCode(r.code);
    setDescription(r.description);
    setSelectedPermissions(r.permissions);
    setDrawerOpen(true);
  };

  const togglePermission = (permKey: string) => {
    setSelectedPermissions((curr) =>
      curr.includes(permKey) ? curr.filter((p) => p !== permKey) : [...curr, permKey],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Role name and code are required');
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim().toLowerCase().replace(/\s+/g, '_'),
      description: description.trim(),
      userCount: editingRole?.userCount ?? 0,
      permissions: selectedPermissions,
      isSystem: editingRole?.isSystem ?? false,
    };

    if (editingRole) {
      await update(editingRole.id, payload);
      toast.success(`Role ${payload.name} updated`);
    } else {
      await create(payload);
      toast.success(`Role ${payload.name} created`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.isSystem) {
      toast.error('System roles cannot be removed.');
      setDeleteTarget(null);
      return;
    }
    await remove(deleteTarget.id);
    toast.success(`Role ${deleteTarget.name} removed`);
    setDeleteTarget(null);
  };

  const columns: Column<RoleDefinition>[] = [
    {
      key: 'name',
      header: 'Role Name',
      render: (r) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-900">{r.name}</span>
            {r.isSystem && <Tag tone="neutral">SYSTEM</Tag>}
          </div>
          <span className="text-xs text-ink-500">{r.description}</span>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Identifier',
      render: (r) => (
        <span className="font-mono text-xs text-ink-700 bg-surface-sunken px-1.5 py-0.5 rounded">
          {r.code}
        </span>
      ),
    },
    {
      key: 'users',
      header: 'Assigned Users',
      align: 'right',
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-ink-900">
          {pluralize(r.userCount, 'user')}
        </span>
      ),
    },
    {
      key: 'permissions',
      header: 'Permission Gates',
      render: (r) => (
        <span className="text-xs text-ink-600">
          {r.permissions.length} active permissions
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEdit size={14} />}
            onClick={() => openEdit(r)}
            aria-label={`Edit ${r.name}`}
          />
          {!r.isSystem && (
            <Button
              size="sm"
              variant="ghost"
              icon={<IconTrash size={14} />}
              onClick={() => setDeleteTarget(r)}
              aria-label={`Delete ${r.name}`}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Role-Based Access Control (RBAC)"
        meta={`${pluralize(total, 'role')} configured · Granular system authorization`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            Create role
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search roles by name, identifier, description…"
          />
        }
      />

      <Card className="overflow-hidden">
        {roles.length === 0 ? (
          <EmptyState
            icon={<IconShield size={32} />}
            title="No roles configured"
            description="Create access control roles to restrict module and action visibility."
          />
        ) : (
          <Table
            items={roles}
            columns={columns}
            rowKey={(r) => r.id}
          />
        )}
      </Card>

      {/* Permissions Matrix Reference */}
      <Card>
        <CardHeader title="Authorization Architecture Reference" />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ALL_PERMISSIONS.map((perm) => (
              <div key={perm.key} className="rounded border border-ink-100 bg-surface-sunken/40 p-3">
                <span className="font-mono text-xs font-semibold text-accent-700">{perm.key}</span>
                <p className="mt-1 text-xs text-ink-600">{perm.label}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingRole ? `Edit Role: ${editingRole.name}` : 'Create Authorization Role'}
        description="Configure permissions, module gates, and role attributes."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="role-form">
              {editingRole ? 'Save changes' : 'Create role'}
            </Button>
          </>
        }
      >
        <form id="role-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Role Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Operations Coordinator"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Role Identifier / Code" required hint="Used by permission checks in source code">
            {({ id }) => (
              <Input
                id={id}
                placeholder="ops_coordinator"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Description">
            {({ id }) => (
              <Textarea
                id={id}
                rows={2}
                placeholder="Brief summary of duties and responsibilities..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-700">Granted Permissions</span>
            <div className="flex flex-col gap-2 rounded border border-ink-100 p-3">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm.key} className="flex items-center gap-2 text-xs text-ink-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.key)}
                    onChange={() => togglePermission(perm.key)}
                    className="rounded border-ink-300 text-accent-600 focus:ring-accent-500"
                  />
                  <span>{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Role ${deleteTarget?.name}?`}
        description="Are you sure you want to remove this role? Users assigned to this role will lose their granted permissions."
        confirmLabel="Delete role"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

