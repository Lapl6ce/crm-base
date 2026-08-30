import { useMemo, useState, type FormEvent } from 'react';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Textarea } from '@/components/Field';
import { IconTrash } from '@/components/icons';
import { Skeleton } from '@/components/Skeleton';
import { toast } from '@/components/Toast';
import { useMutation, useResource } from '@/data/useResource';
import { useSession } from '@/data/useSession';
import type { ID, Note, NoteParentType } from '@/data/types';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/format';

/* Notes on any record. Shared for the same reason the timeline is: contacts,
   companies and deals each need one and cannot import each other.
 *
 * Writing a note emits a note.created ActivityEvent from the repository, so
 * anything written here shows up in that record's timeline without this
 * component knowing the timeline exists.
 */

export interface NotesPanelProps {
  entityType: NoteParentType;
  entityId: ID;
  canWrite?: boolean;
  className?: string;
}

export function NotesPanel({ entityType, entityId, canWrite = true, className }: NotesPanelProps) {
  const { user, users } = useSession();
  const [draft, setDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Note | null>(null);

  const { data, loading } = useResource(
    (provider) => provider.notes.listForEntity(entityType, entityId),
    [entityType, entityId],
    { watch: ['notes'], enabled: Boolean(entityId) },
  );

  const create = useMutation((provider, body: string) =>
    provider.notes.create({ entityType, entityId, body, authorId: user?.id }),
  );
  const remove = useMutation((provider, id: ID) => provider.notes.delete(id));

  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const notes = data ?? [];

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    try {
      await create.run(draft);
      setDraft('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'That note did not save');
    }
  };

  const onDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove.run(confirmDelete.id);
      toast.success('Note deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete that note');
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {canWrite && (
        <form onSubmit={onSubmit} className="flex flex-col gap-2 border-b border-ink-100 p-4">
          <label htmlFor={`note-${entityId}`} className="sr-only">
            Write a note
          </label>
          <Textarea
            id={`note-${entityId}`}
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What happened? Anyone on the account will see this."
            // Ctrl/Cmd+Enter is the convention people already have their hands on.
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void onSubmit(event as unknown as FormEvent);
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-ink-300">{draft.trim() ? 'Ctrl + Enter to save' : ''}</p>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!draft.trim()}
              loading={create.pending}
            >
              Add note
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          size="sm"
          title="No notes yet"
          description={
            canWrite
              ? 'Write down what was said while it is still fresh — it is the part nobody remembers later.'
              : 'Notes written on this record will appear here.'
          }
        />
      ) : (
        <ul className="divide-y divide-ink-100">
          {notes.map((note) => {
            const author = userById.get(note.authorId);
            const mine = note.authorId === user?.id;
            return (
              <li key={note.id} className="group flex gap-3 px-4 py-3">
                <Avatar
                  name={author?.name ?? 'Unknown'}
                  color={author?.avatarColor}
                  size="sm"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-base font-medium text-ink-900">
                      {author?.name ?? 'Unknown'}
                    </span>
                    <span className="text-xs text-ink-300" title={formatDateTime(note.createdAt)}>
                      {formatRelative(note.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-base leading-relaxed text-ink-700">
                    {note.body}
                  </p>
                </div>
                {mine && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(note)}
                    aria-label="Delete this note"
                    className={cn(
                      'h-7 w-7 shrink-0 rounded text-ink-300',
                      'hover:bg-danger-100 hover:text-danger-600',
                      // Revealed on hover, but always reachable by keyboard.
                      'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
                    )}
                  >
                    <IconTrash size={14} className="mx-auto" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this note?"
        description="The note is removed for everyone. The fact that it was written stays in the activity log."
        confirmLabel="Delete note"
        pending={remove.pending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
