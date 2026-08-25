import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';
import { IconClose } from './icons';

/* Modal and Drawer share one implementation: a portal, a scrim, focus capture,
   Escape to close, and body-scroll lock. Written once so no module reinvents
   half of it and forgets the focus trap. */

function useOverlayBehavior(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the panel itself rather than its first control: landing on a
    // destructive button because it happens to be first is a real hazard.
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      window.clearTimeout(focusTimer);
      restoreFocusTo.current?.focus?.();
    };
  }, [open, onClose]);

  return panelRef;
}

interface OverlayShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  variant: 'modal' | 'drawer';
  labelledBy: string;
}

function OverlayShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  variant,
  labelledBy,
}: OverlayShellProps) {
  const panelRef = useOverlayBehavior(open, onClose);
  const onScrimClick = useCallback(() => onClose(), [onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex" role="presentation">
      <div
        className="absolute inset-0 bg-ink-900/40 motion-safe:animate-fade-in"
        onClick={onScrimClick}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex flex-col bg-surface-card shadow-lg outline-none',
          variant === 'modal'
            ? 'm-auto max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] rounded-overlay motion-safe:animate-slide-up'
            : 'ml-auto h-full w-[min(30rem,100vw)] rounded-l-overlay motion-safe:animate-slide-in-right',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id={labelledBy} className="font-display text-md font-semibold text-ink-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
          </div>
          <IconButton label="Close" variant="ghost" size="sm" onClick={onClose}>
            <IconClose size={16} />
          </IconButton>
        </header>

        <div className="scroll-slim flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

export type OverlayProps = Omit<OverlayShellProps, 'variant' | 'labelledBy'> & { id?: string };

export function Modal({ id = 'modal-title', ...props }: OverlayProps) {
  return <OverlayShell {...props} variant="modal" labelledBy={id} />;
}

/** Right-side panel. Detail views and record forms live here. */
export function Drawer({ id = 'drawer-title', ...props }: OverlayProps) {
  return <OverlayShell {...props} variant="drawer" labelledBy={id} />;
}
