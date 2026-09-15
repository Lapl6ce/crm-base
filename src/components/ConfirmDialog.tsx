import { Button } from './Button';
import { Modal } from './Overlay';

/* Every destructive action in the app routes through this, so the wording and
   the button order are consistent: cancel first, destructive last. */

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Say what will happen, including anything that survives (CONTEXT.md §1). */
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  tone?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      id="confirm-title"
      className="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-base text-ink-700">{description}</p>
    </Modal>
  );
}
