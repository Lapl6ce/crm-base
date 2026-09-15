import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Field, Input, Select } from '@/components/Field';
import { Drawer } from '@/components/Overlay';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { fieldErrors, formMessage } from '@/data/formErrors';
import type { ID, Role, User } from '@/data/types';
import { useMutation, useResource } from '@/data/useResource';
import { useSession } from '@/data/useSession';
import { PageHeader } from '@/layout/PageHeader';
import { formatDate } from '@/lib/format';
import { can, roleLabel } from '@/lib/rbac';
import { useState, type FormEvent } from 'react';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'admin', label: roleLabel.admin },
  { value: 'sales_rep', label: roleLabel.sales_rep },
];

export function UsersPage() {
  const { user: currentUser, switchUser } = useSession();
  const { data, loading, error, refresh } = useResource((provider) => provider.users.all(), [], {
    watch: ['users', 'settings'],
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [removing, setRemoving] = useState<User | null>(null);

  const remove = useMutation((provider, id: ID) => provider.users.delete(id));
  const users = data ?? [];
  const canManage = can(currentUser, 'users.manage');
  const admins = users.filter((u) => u.role === 'admin').length;

  const onDelete = async () => {
    if (!removing) return;
    try {
      await remove.run(removing.id);
      toast.success(`${removing.name} removed — their records moved to an admin`);
      setRemoving(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove that user');
      setRemoving(null);
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      sortField: 'name',
      mobile: 'primary',
      render: (user) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} color={user.avatarColor} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-900">{user.name}</p>
            {user.id === currentUser?.id && <p className="text-2xs text-ink-300">That&rsquo;s you</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortField: 'email',
      mobile: 'secondary',
      render: (user) => <span className="truncate text-ink-700">{user.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      sortField: 'role',
      width: '9rem',
      render: (user) => (
        <Tag tone={user.role === 'admin' ? 'accent' : 'neutral'}>{roleLabel[user.role]}</Tag>
      ),
    },
    {
      key: 'created',
      header: 'Added',
      sortField: 'createdAt',
      mobile: 'desktop',
      width: '8rem',
      render: (user) => <span className="tnum text-xs text-ink-500">{formatDate(user.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      width: '11rem',
      render: (user) => (
        <div className="flex justify-end gap-1">
          {user.id !== currentUser?.id && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                void switchUser(user.id).then(() => toast.info(`Now viewing as ${user.name}`));
              }}
            >
              View as
            </Button>
          )}
          {canManage && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                setRemoving(user);
              }}
              disabled={users.length <= 1 || (user.role === 'admin' && admins <= 1)}
              className="text-danger-600 hover:bg-danger-100 hover:text-danger-600"
            >
              Remove
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Users & Team Directory"
        meta={loading ? undefined : `${users.length} users · ${admins} admin`}
        description="Roles determine accessible actions and modules across the CRM."
        actions={
          canManage && (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add user
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        {error ? (
          <ErrorState description={error.message} onRetry={refresh} />
        ) : (
          <Table
            items={users}
            columns={columns}
            rowKey={(user) => user.id}
            onRowClick={
              canManage
                ? (user) => {
                    setEditing(user);
                    setFormOpen(true);
                  }
                : undefined
            }
            loading={loading}
            empty={<EmptyState title="No users" description="There should always be at least one." />}
          />
        )}
      </Card>

      <Card>
        <CardHeader title="Role Permissions Overview" />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Tag tone="accent">Admin</Tag>
              <p className="mt-2 text-base text-ink-500">
                Full governance: financial transactions, supplier scorecards, user access, and system settings.
              </p>
            </div>
            <div>
              <Tag>Sales Rep</Tag>
              <p className="mt-2 text-base text-ink-500">
                Commercial and CRM workflows: leads, customer accounts, deals pipeline, quotations, and communications.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <UserForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        user={editing}
        lastAdmin={editing?.role === 'admin' && admins <= 1}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${removing?.name}?`}
        description="Their contacts, companies, deals and tasks are reassigned to an admin rather than deleted. This cannot be undone."
        confirmLabel="Remove user"
        pending={remove.pending}
        onConfirm={onDelete}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

function UserForm({
  open,
  onClose,
  user,
  lastAdmin,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  lastAdmin: boolean;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('sales_rep');

  const create = useMutation((provider, input: { name: string; email: string; role: Role }) =>
    provider.users.create(input),
  );
  const update = useMutation(
    (provider, id: ID, patch: { name: string; email: string; role: Role }) =>
      provider.users.update(id, patch),
  );

  const pending = create.pending || update.pending;
  const errors = { ...fieldErrors(create.error), ...fieldErrors(update.error) };
  const message = formMessage(create.error) ?? formMessage(update.error);

  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
      setRole(user?.role ?? 'sales_rep');
      create.reset();
      update.reset();
    }
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { name: name.trim(), email: email.trim(), role };
    try {
      if (user) {
        await update.run(user.id, payload);
        toast.success('User updated');
      } else {
        await create.run(payload);
        toast.success(`${payload.name} added`);
      }
      onClose();
    } catch {
      // Rendered from errors / message
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={user ? 'Edit user' : 'Add user'}
      id="user-form-title"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="user-form" loading={pending}>
            {user ? 'Save changes' : 'Add user'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {message && (
          <p role="alert" className="rounded bg-danger-100 px-3 py-2 text-base text-danger-600">
            {message}
          </p>
        )}

        <Field label="Name" error={errors.name} required>
          {({ id, invalid }) => (
            <Input
              id={id}
              aria-invalid={invalid}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              autoFocus
            />
          )}
        </Field>

        <Field label="Email" error={errors.email} required>
          {({ id, invalid }) => (
            <Input
              id={id}
              type="email"
              aria-invalid={invalid}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          )}
        </Field>

        <Field
          label="Role"
          error={errors.role}
          hint={lastAdmin ? 'This is the only admin, so the role cannot be changed.' : undefined}
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={role}
              disabled={lastAdmin}
              onChange={(event) => setRole(event.target.value as Role)}
              options={ROLE_OPTIONS}
            />
          )}
        </Field>
      </form>
    </Drawer>
  );
}

