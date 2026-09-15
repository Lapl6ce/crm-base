import { Button, IconButton } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Input, Select } from '@/components/Field';
import { IconChevronDown, IconPlus, IconTrash } from '@/components/icons';
import { Tag } from '@/components/Tag';
import { toast } from '@/components/Toast';
import { fieldErrors } from '@/data/formErrors';
import type { PipelineStage, StageOutcome } from '@/data/types';
import { useMutation } from '@/data/useResource';
import { useEffect, useState } from 'react';

/* The pipeline stage editor — the single most fork-specific screen in the app.
 *
 * Reordering is up/down buttons rather than drag-and-drop. The Kanban board
 * earns a DndContext because dragging *is* the interaction there; a settings
 * list of five rows does not, and buttons are keyboard- and screen-reader-
 * usable without any of the sensor and announcement machinery.
 *
 * Nothing is written until Save: `saveStages` renumbers, relocates the deals
 * of any stage that was removed and rewrites the status of any deal whose
 * stage changed outcome. That is one transaction, so the editor stages the
 * whole list locally and hands it over in one call.
 */

export interface StageEditorProps {
  stages: PipelineStage[];
  onSave: (stages: PipelineStage[]) => Promise<unknown>;
  disabled?: boolean;
}

const OUTCOME_OPTIONS: { value: StageOutcome; label: string }[] = [
  { value: 'open', label: 'Still open' },
  { value: 'won', label: 'Closes as won' },
  { value: 'lost', label: 'Closes as lost' },
];

let draftCounter = 0;

export function StageEditor({ stages, onSave, disabled }: StageEditorProps) {
  const [draft, setDraft] = useState<PipelineStage[]>(stages);
  const [removing, setRemoving] = useState<PipelineStage | null>(null);
  const save = useMutation(async (_provider, next: PipelineStage[]) => onSave(next));

  // Re-sync when the saved stages change under us (another tab, a demo reset).
  useEffect(() => setDraft(stages), [stages]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(stages);
  const errors = fieldErrors(save.error);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next.map((stage, order) => ({ ...stage, order })));
  };

  const patch = (id: string, changes: Partial<PipelineStage>) =>
    setDraft((current) => current.map((s) => (s.id === id ? { ...s, ...changes } : s)));

  const add = () => {
    draftCounter += 1;
    setDraft((current) => [
      ...current,
      {
        id: `stage_new_${Date.now()}_${draftCounter}`,
        name: '',
        order: current.length,
        outcome: 'open',
      },
    ]);
  };

  const confirmRemove = () => {
    if (!removing) return;
    setDraft((current) =>
      current.filter((s) => s.id !== removing.id).map((stage, order) => ({ ...stage, order })),
    );
    setRemoving(null);
  };

  const onSaveClick = async () => {
    try {
      await save.run(draft);
      toast.success('Pipeline updated');
    } catch (error) {
      const fields = fieldErrors(error);
      if (!fields.stages) {
        toast.error(error instanceof Error ? error.message : 'Could not save the pipeline');
      }
    }
  };

  const openCount = draft.filter((s) => s.outcome === 'open').length;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {draft.map((stage, index) => (
          <li
            key={stage.id}
            className="flex flex-wrap items-center gap-2 rounded border border-ink-100 bg-surface-card p-2"
          >
            <div className="flex shrink-0 flex-col">
              <IconButton
                label={`Move ${stage.name || 'this stage'} earlier`}
                variant="ghost"
                size="sm"
                className="h-5"
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              >
                <IconChevronDown size={12} className="rotate-180" />
              </IconButton>
              <IconButton
                label={`Move ${stage.name || 'this stage'} later`}
                variant="ghost"
                size="sm"
                className="h-5"
                disabled={disabled || index === draft.length - 1}
                onClick={() => move(index, 1)}
              >
                <IconChevronDown size={12} />
              </IconButton>
            </div>

            <span className="tnum w-5 shrink-0 text-center text-xs text-ink-300">{index + 1}</span>

            <Input
              value={stage.name}
              disabled={disabled}
              onChange={(event) => patch(stage.id, { name: event.target.value })}
              placeholder={`Stage ${index + 1}`}
              aria-label={`Stage ${index + 1} name`}
              className="min-w-[8rem] flex-1"
            />

            <Select
              value={stage.outcome}
              disabled={disabled}
              onChange={(event) => patch(stage.id, { outcome: event.target.value as StageOutcome })}
              aria-label={`What happens to a deal in ${stage.name || `stage ${index + 1}`}`}
              options={OUTCOME_OPTIONS}
              className="w-auto min-w-[10rem]"
            />

            <IconButton
              label={`Remove ${stage.name || `stage ${index + 1}`}`}
              variant="ghost"
              size="sm"
              disabled={disabled || draft.length <= 1}
              onClick={() => setRemoving(stage)}
              className="text-danger-600 hover:bg-danger-100 hover:text-danger-600"
            >
              <IconTrash size={14} />
            </IconButton>
          </li>
        ))}
      </ul>

      {errors.stages && (
        <p role="alert" className="rounded bg-danger-100 px-3 py-2 text-base text-danger-600">
          {errors.stages}
        </p>
      )}

      {openCount === 0 && (
        <p className="text-xs text-warn-500">
          At least one stage has to stay open, or there is nowhere for a new deal to go.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button icon={<IconPlus size={14} />} size="sm" onClick={add} disabled={disabled}>
          Add stage
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <Tag tone="warn">Unsaved</Tag>}
          {dirty && (
            <Button variant="ghost" size="sm" onClick={() => setDraft(stages)} disabled={save.pending}>
              Discard
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={onSaveClick}
            disabled={disabled || !dirty || openCount === 0}
            loading={save.pending}
          >
            Save pipeline
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${removing?.name || 'this stage'}?`}
        description="Deals sitting in it move to the first open stage rather than disappearing. Nothing is deleted, and nothing is written until you save the pipeline."
        confirmLabel="Remove stage"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

