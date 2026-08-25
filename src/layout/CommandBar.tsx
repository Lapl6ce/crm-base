import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { can, type Action } from '@/lib/rbac';
import type { User } from '@/data/types';
import { IconArrowRight, IconSearch } from '@/components/icons';
import { primaryNav, secondaryNav } from './navigation';

/* The command bar (CONTEXT.md §4). Half of the signature, and the reason the
   app feels fast rather than clicked-through.
 *
 * Phase 1 ships navigation and verb commands. Entity search — jump straight to
 * a contact, company or deal — plugs in through `extraItems`, which the module
 * phases will supply from the data layer. The keyboard model is done here so
 * later phases only add rows.
 */

export interface CommandItem {
  id: string;
  label: string;
  /** Right-aligned context: "Deal", "Contact · Acme". */
  hint?: string;
  group: string;
  icon?: ReactNode;
  keywords?: string;
  requires?: Action;
  run: () => void;
}

export interface CommandBarProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  /** Results contributed by later phases (records, module verbs). */
  extraItems?: CommandItem[];
}

/** Subsequence match — "nd" finds "New deal". Cheap and forgiving. */
function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 1;
  const text = haystack.toLowerCase();
  const term = needle.toLowerCase();

  const direct = text.indexOf(term);
  if (direct === 0) return 1000;
  if (direct > 0) return 800 - direct;

  let score = 0;
  let cursor = 0;
  for (const char of term) {
    const found = text.indexOf(char, cursor);
    if (found === -1) return 0;
    score += found === cursor ? 8 : 3;
    cursor = found + 1;
  }
  return score;
}

export function CommandBar({ open, onClose, user, extraItems = [] }: CommandBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const navItems = useMemo<CommandItem[]>(
    () =>
      [...primaryNav, ...secondaryNav].map((item) => ({
        id: `nav:${item.to}`,
        label: item.label,
        group: 'Go to',
        hint: item.to,
        icon: <item.icon size={16} />,
        requires: item.requires,
        run: () => navigate(item.to),
      })),
    [navigate],
  );

  const items = useMemo(() => {
    const all = [...navItems, ...extraItems].filter(
      (item) => !item.requires || can(user, item.requires),
    );
    if (!query.trim()) return all.slice(0, 12);

    return all
      .map((item) => ({
        item,
        score: Math.max(
          fuzzyScore(item.label, query),
          item.keywords ? fuzzyScore(item.keywords, query) * 0.8 : 0,
        ),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((entry) => entry.item);
  }, [navItems, extraItems, query, user]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Autofocus after paint so the portal node exists.
      const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open || typeof document === 'undefined') return null;

  const runItem = (item: CommandItem | undefined) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runItem(items[activeIndex]);
    }
  };

  let lastGroup = '';

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 sm:pt-[12vh]">
      <div className="absolute inset-0 bg-ink-900/40 motion-safe:animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command bar"
        onKeyDown={onKeyDown}
        className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-overlay bg-surface-card shadow-lg motion-safe:animate-slide-up"
      >
        <div className="flex items-center gap-2.5 border-b border-ink-100 px-4">
          <IconSearch size={18} className="shrink-0 text-ink-300" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to anything, or type a command…"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={items[activeIndex] ? `command-${items[activeIndex].id}` : undefined}
            className="h-12 w-full bg-transparent text-md text-ink-900 outline-none placeholder:text-ink-300"
          />
          <kbd className="hidden shrink-0 rounded border border-ink-150 px-1.5 py-0.5 text-2xs text-ink-300 sm:block">
            esc
          </kbd>
        </div>

        <ul
          ref={listRef}
          id="command-list"
          role="listbox"
          className="scroll-slim max-h-[min(24rem,60vh)] overflow-y-auto p-1.5"
        >
          {items.length === 0 && (
            <li className="px-3 py-8 text-center text-base text-ink-300">
              Nothing matches “{query}”.
            </li>
          )}
          {items.map((item, index) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <li key={item.id}>
                {showGroup && (
                  <p className="px-2.5 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide text-ink-300">
                    {item.group}
                  </p>
                )}
                <button
                  type="button"
                  id={`command-${item.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  data-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runItem(item)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-base',
                    index === activeIndex ? 'bg-accent-100 text-ink-900' : 'text-ink-700',
                  )}
                >
                  <span className={cn('shrink-0', index === activeIndex ? 'text-accent-600' : 'text-ink-300')}>
                    {item.icon ?? <IconArrowRight size={16} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="shrink-0 text-xs text-ink-300">{item.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

/** Registers ⌘K / Ctrl-K once, at the shell. */
export function useCommandBarShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
}
