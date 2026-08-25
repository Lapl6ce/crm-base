import { cn } from '@/lib/cn';
import { roleLabel } from '@/lib/rbac';
import type { User } from '@/data/types';
import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/Button';
import { IconMenu, IconSearch } from '@/components/icons';

/* Topbar: the command bar trigger, and the user switcher that stands in for
   auth. The switcher is a plain <select> on purpose — it is a demo affordance,
   and it should look like one rather than like a real account menu. */

export interface TopbarProps {
  user: User | null;
  users: User[];
  onSwitchUser: (id: string) => void;
  onOpenCommandBar: () => void;
  onOpenNav: () => void;
}

export function Topbar({ user, users, onSwitchUser, onOpenCommandBar, onOpenNav }: TopbarProps) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-ink-100 bg-surface-card/95 px-3 backdrop-blur sm:px-4">
      <IconButton label="Open navigation" variant="ghost" onClick={onOpenNav} className="md:hidden">
        <IconMenu size={18} />
      </IconButton>

      {/* Not a hidden shortcut: the bar is visible, and says its own keystroke. */}
      <button
        type="button"
        onClick={onOpenCommandBar}
        className={cn(
          'group flex h-9 min-w-0 flex-1 items-center gap-2 rounded border border-ink-150 bg-surface-app px-2.5',
          'text-left text-base text-ink-300 hover:border-ink-300 hover:text-ink-500 md:max-w-md',
          'motion-safe:transition-colors',
        )}
      >
        <IconSearch size={16} className="shrink-0" />
        <span className="truncate">Jump to anything…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-ink-150 bg-surface-card px-1.5 py-0.5 text-2xs text-ink-300 sm:block">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {user && (
          <>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium leading-4 text-ink-900">{user.name}</p>
              <p className="text-2xs leading-4 text-ink-300">{roleLabel[user.role]}</p>
            </div>
            <Avatar name={user.name} color={user.avatarColor} size="md" />
          </>
        )}

        <label className="sr-only" htmlFor="user-switcher">
          Acting as
        </label>
        <select
          id="user-switcher"
          value={user?.id ?? ''}
          onChange={(event) => onSwitchUser(event.target.value)}
          className="h-9 max-w-[8.5rem] rounded border border-ink-150 bg-surface-card px-2 text-xs text-ink-700 hover:border-ink-300"
          title="Acting as — stands in for sign-in until real auth exists"
        >
          {users.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} · {roleLabel[option.role]}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
