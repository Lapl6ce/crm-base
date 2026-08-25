import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { can } from '@/lib/rbac';
import type { User } from '@/data/types';
import { primaryNav, secondaryNav, type NavItem } from './navigation';

/* Graphite rail. Full width on lg, icon-only on md, replaced by a bottom bar
   below that (see AppShell).
 *
 * The .on-dark class flips the focus ring to white — a coral ring on graphite
 * is legible but muddy, and focus visibility is not the place to compromise. */

export interface SidebarProps {
  user: User | null;
  companyName: string;
  collapsed: boolean;
  /** Demo Mode's badge slot. One of exactly two demo touchpoints in core code. */
  footerSlot?: ReactNode;
  onNavigate?: () => void;
}

export function Sidebar({ user, companyName, collapsed, footerSlot, onNavigate }: SidebarProps) {
  const visible = (items: NavItem[]) => items.filter((item) => !item.requires || can(user, item.requires));

  return (
    <nav
      aria-label="Main"
      className={cn(
        'on-dark flex h-full flex-col bg-ink-900 text-ink-150',
        collapsed ? 'w-rail items-center' : 'w-sidebar',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <Wordmark />
        {!collapsed && (
          <span className="truncate font-display text-base font-semibold text-white">
            {companyName}
          </span>
        )}
      </div>

      <div className={cn('flex flex-1 flex-col gap-6 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        <NavGroup items={visible(primaryNav)} collapsed={collapsed} onNavigate={onNavigate} />
        {visible(secondaryNav).length > 0 && (
          <NavGroup
            label="Manage"
            items={visible(secondaryNav)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        )}
      </div>

      {footerSlot && (
        <div className={cn('border-t border-white/10 p-3', collapsed && 'px-2')}>{footerSlot}</div>
      )}
    </nav>
  );
}

function NavGroup({
  label,
  items,
  collapsed,
  onNavigate,
}: {
  label?: string;
  items: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {label && !collapsed && (
        <p className="mb-1 px-2.5 text-2xs font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-2.5 rounded px-2.5 py-2 text-base font-medium',
              'motion-safe:transition-colors motion-safe:duration-150',
              collapsed && 'justify-center px-0',
              isActive ? 'bg-white/10 text-white' : 'text-ink-150 hover:bg-white/5 hover:text-white',
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* The active marker is the heat stripe again, at rest. */}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-0 h-5 w-[3px] rounded-r-full bg-accent-500',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {collapsed && <span className="sr-only">{item.label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

function Wordmark() {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-accent-500"
      aria-hidden="true"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2.5" y="3" width="2" height="10" rx="1" fill="white" />
        <rect x="7" y="5.5" width="2" height="7.5" rx="1" fill="white" fillOpacity="0.75" />
        <rect x="11.5" y="8" width="2" height="5" rx="1" fill="white" fillOpacity="0.5" />
      </svg>
    </span>
  );
}
