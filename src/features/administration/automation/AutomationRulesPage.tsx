import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { IconEdit, IconPlus, IconTrash, IconZap } from '@/components/icons';
import { ListToolbar } from '@/components/ListToolbar';
import { Drawer } from '@/components/Overlay';
import { Table, type Column } from '@/components/Table';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { initialAutomationRules } from '@/data/datasets';
import type { AutomationRule } from '@/data/types';
import { useLocalCollection } from '@/data/useLocalCollection';
import { PageHeader } from '@/layout/PageHeader';
import { formatDate, pluralize } from '@/lib/format';
import { useState } from 'react';

export function AutomationRulesPage() {
  const {
    items: rules,
    total,
    search,
    setSearch,
    create,
    update,
    remove,
  } = useLocalCollection<AutomationRule>({
    collectionKey: 'automation-rules',
    initialData: initialAutomationRules,
    defaultSort: { field: 'createdAt', dir: 'desc' },
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AutomationRule | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState('deal.stage_changed');
  const [condition, setCondition] = useState('deal.stage == "Closed Won"');
  const [action, setAction] = useState('create_sales_order');
  const [active, setActive] = useState(true);

  const openCreate = () => {
    setEditingRule(null);
    setName('');
    setDescription('');
    setTrigger('deal.stage_changed');
    setCondition('deal.stage == "Closed Won"');
    setAction('create_sales_order');
    setActive(true);
    setDrawerOpen(true);
  };

  const openEdit = (r: AutomationRule) => {
    setEditingRule(r);
    setName(r.name);
    setDescription(r.description);
    setTrigger(r.trigger);
    setCondition(r.condition);
    setAction(r.action);
    setActive(r.active);
    setDrawerOpen(true);
  };

  const toggleActive = async (r: AutomationRule) => {
    const next = !r.active;
    await update(r.id, { active: next });
    toast.success(`Rule "${r.name}" ${next ? 'activated' : 'paused'}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Rule name is required');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      trigger,
      condition: condition.trim(),
      action,
      active,
      executionCount: editingRule?.executionCount ?? 0,
      lastTriggeredAt: editingRule?.lastTriggeredAt,
    };

    if (editingRule) {
      await update(editingRule.id, payload);
      toast.success(`Rule "${payload.name}" updated`);
    } else {
      await create(payload);
      toast.success(`Rule "${payload.name}" created`);
    }

    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    toast.success(`Rule "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

  const activeCount = rules.filter((r) => r.active).length;
  const totalExecutions = rules.reduce((acc, r) => acc + r.executionCount, 0);

  const columns: Column<AutomationRule>[] = [
    {
      key: 'name',
      header: 'Automation Rule',
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-semibold text-ink-900">{r.name}</span>
          <span className="text-xs text-ink-500">{r.description}</span>
        </div>
      ),
    },
    {
      key: 'logic',
      header: 'Workflow Logic (Trigger → Action)',
      render: (r) => (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-mono bg-surface-sunken px-1.5 py-0.5 rounded text-ink-700">
            {r.trigger}
          </span>
          <span className="text-ink-400">→</span>
          <span className="font-mono bg-accent-50 text-accent-700 px-1.5 py-0.5 rounded font-medium">
            {r.action}
          </span>
        </div>
      ),
    },
    {
      key: 'executions',
      header: 'Executions',
      align: 'right',
      render: (r) => (
        <div className="flex flex-col text-right">
          <span className="font-mono text-xs font-semibold text-ink-900">
            {r.executionCount.toLocaleString()} runs
          </span>
          {r.lastTriggeredAt && (
            <span className="text-[11px] text-ink-400">
              Last: {formatDate(r.lastTriggeredAt)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'State',
      render: (r) => (
        <button
          type="button"
          onClick={() => toggleActive(r)}
          className="cursor-pointer"
        >
          <Tag tone={r.active ? 'success' : 'neutral'}>
            {r.active ? 'ACTIVE' : 'PAUSED'}
          </Tag>
        </button>
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
          <Button
            size="sm"
            variant="ghost"
            icon={<IconTrash size={14} />}
            onClick={() => setDeleteTarget(r)}
            aria-label={`Delete ${r.name}`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Workflow Automation Rules"
        meta={`${pluralize(total, 'rule')} configured · ${totalExecutions.toLocaleString()} total automated executions`}
        actions={
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={openCreate}>
            New automation
          </Button>
        }
        toolbar={
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search automation rules by name, trigger…"
          />
        }
      />

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Total Configured Rules</span>
            <p className="mt-1 font-mono text-2xl font-bold text-ink-900">{total}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Active Automations</span>
            <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">{activeCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <span className="text-xs font-medium text-ink-500">Executions Completed</span>
            <p className="mt-1 font-mono text-2xl font-bold text-accent-600">
              {totalExecutions.toLocaleString()}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {rules.length === 0 ? (
          <EmptyState
            icon={<IconZap size={32} />}
            title="No automation rules configured"
            description="Build event-driven rules to trigger tasks, generate sales orders, and send notifications automatically."
            action={<Button variant="primary" onClick={openCreate}>New automation</Button>}
          />
        ) : (
          <Table
            items={rules}
            columns={columns}
            rowKey={(r) => r.id}
          />
        )}
      </Card>

      {/* Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingRule ? `Edit Rule: ${editingRule.name}` : 'Create Automation Rule'}
        description="Configure event triggers, conditional expressions, and target automated actions."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="rule-form">
              {editingRule ? 'Save changes' : 'Create automation'}
            </Button>
          </>
        }
      >
        <form id="rule-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Rule Name" required>
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. Auto-generate Sales Order on Won Deal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
          </Field>

          <Field label="Description">
            {({ id }) => (
              <Textarea
                id={id}
                rows={2}
                placeholder="Describe what this workflow automation accomplishes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>

          <Field label="Trigger Event" required>
            {({ id }) => (
              <Select
                id={id}
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                options={[
                  { value: 'deal.stage_changed', label: 'Deal Stage Changed' },
                  { value: 'lead.converted', label: 'Lead Converted' },
                  { value: 'inventory.low_stock', label: 'Inventory Reorder Level Reached' },
                  { value: 'invoice.overdue', label: 'Invoice Due Date Passed' },
                  { value: 'shipment.delivered', label: 'Shipment Delivered' },
                ]}
              />
            )}
          </Field>

          <Field label="Condition Filter Expression" hint="JavaScript evaluation expression">
            {({ id }) => (
              <Input
                id={id}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="font-mono text-xs"
              />
            )}
          </Field>

          <Field label="Target Action" required>
            {({ id }) => (
              <Select
                id={id}
                value={action}
                onChange={(e) => setAction(e.target.value)}
                options={[
                  { value: 'create_sales_order', label: 'Create Sales Order' },
                  { value: 'issue_purchase_order', label: 'Draft Vendor Purchase Order' },
                  { value: 'send_email_notification', label: 'Send Email Notification' },
                  { value: 'create_urgent_task', label: 'Create Urgent Follow-up Task' },
                  { value: 'apply_account_tag', label: 'Apply Account Tag' },
                ]}
              />
            )}
          </Field>

          <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-ink-300 text-accent-600 focus:ring-accent-500"
            />
            Rule is active and listening for trigger events
          </label>
        </form>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete Rule "${deleteTarget?.name}"?`}
        description="Are you sure you want to delete this automation rule? It will no longer execute."
        confirmLabel="Delete rule"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

