import { useEffect } from 'react';
import { create } from 'zustand';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { IconCheck, IconClose, IconAlert } from './icons';

/* Transient feedback. This is UI state, so it lives in Zustand — the one kind
   of state that store is for (CONTEXT.md §2 rule 4). */

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  /** Optional single action, e.g. Undo. */
  action?: { label: string; onClick: () => void };
  duration: number;
}

interface ToastStore {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts, { duration: 4500, ...toast, id }],
    }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helper so callers do not need the hook: toast.success('Saved'). */
export const toast = {
  success: (message: string, action?: ToastItem['action']) =>
    useToastStore.getState().push({ message, tone: 'success', action }),
  error: (message: string, action?: ToastItem['action']) =>
    useToastStore.getState().push({ message, tone: 'error', action, duration: 7000 }),
  info: (message: string, action?: ToastItem['action']) =>
    useToastStore.getState().push({ message, tone: 'info', action }),
};

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-l-positive-500',
  error: 'border-l-danger-600',
  info: 'border-l-ink-300',
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((item) => (
        <ToastRow key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </div>,
    document.body,
  );
}

function ToastRow({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, item.duration);
    return () => window.clearTimeout(timer);
  }, [item.duration, onDismiss]);

  return (
    <div
      // Errors interrupt; successes wait their turn.
      role={item.tone === 'error' ? 'alert' : 'status'}
      aria-live={item.tone === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto flex items-center gap-2.5 rounded-card border border-ink-100 border-l-[3px] bg-surface-card px-3 py-2.5 shadow-lg',
        'motion-safe:animate-slide-up',
        TONE_STYLES[item.tone],
      )}
    >
      <span
        className={cn(
          'shrink-0',
          item.tone === 'success' ? 'text-positive-500' : item.tone === 'error' ? 'text-danger-600' : 'text-ink-300',
        )}
      >
        {item.tone === 'error' ? <IconAlert size={16} /> : <IconCheck size={16} />}
      </span>
      <p className="min-w-0 flex-1 text-base text-ink-700">{item.message}</p>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action?.onClick();
            onDismiss();
          }}
          className="shrink-0 rounded px-1.5 py-0.5 text-base font-medium text-accent-600 hover:bg-accent-100"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 text-ink-300 hover:text-ink-700"
      >
        <IconClose size={14} />
      </button>
    </div>
  );
}
