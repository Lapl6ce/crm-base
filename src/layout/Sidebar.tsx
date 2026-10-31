import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import type { User } from '@/data/types';
import { IconChevronDown } from '@/components/icons';
/* DEMO TOUCHPOINT 1 of 2. Deleting src/demo/ breaks this import and the footer
   block below; nothing else in the frame knows Demo Mode exists. */
import { DemoBadge } from '@/demo/DemoBadge';
import { useDemoMode } from '@/demo/useDemoMode';
import { navigationSections, visibleSections as sectionsFor, type NavSection } from './navigation';

export interface SidebarProps {
  user: User | null;
  companyName: string;
  collapsed: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ user, companyName, collapsed, onNavigate }: SidebarProps) {
  const { enabled: demoMode } = useDemoMode();
  const location = useLocation();

  // Determine which section the active route belongs to
  const activeSectionId = navigationSections.find((sec) =>
    sec.items.some((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)),
  )?.id ?? 'dashboard';

  // Sections open/closed state; auto-expand active section
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    [activeSectionId]: true,
    dashboard: true,
  });

  // When route changes, make sure the active section is expanded
  useEffect(() => {
    if (activeSectionId) {
      setOpenSections((prev) => ({ ...prev, [activeSectionId]: true }));
    }
  }, [activeSectionId]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const visibleSections = sectionsFor(user);

  return (
    <nav
      aria-label="Main"
      className={cn(
        'on-dark flex h-full flex-col bg-ink-900 text-ink-150',
        collapsed ? 'w-rail items-center' : 'w-sidebar',
      )}
    >
      <div className={cn('flex h-14 shrink-0 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <Wordmark />
        {!collapsed && (
          <span className="truncate font-display text-base font-semibold text-white">
            {companyName}
          </span>
        )}
      </div>

      <div className={cn('scroll-slim flex flex-1 flex-col gap-3 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')}>
        {visibleSections.map((section) => (
          <SidebarSection
            key={section.id}
            section={section}
            isOpen={openSections[section.id] ?? false}
            onToggle={() => toggleSection(section.id)}
            collapsed={collapsed}
            onNavigate={onNavigate}
            currentPath={location.pathname}
          />
        ))}
      </div>

      {demoMode && (
        <div className={cn('shrink-0 border-t border-white/10 p-3', collapsed && 'px-2')}>
          <DemoBadge collapsed={collapsed} />
        </div>
      )}
    </nav>
  );
}

function SidebarSection({
  section,
  isOpen,
  onToggle,
  collapsed,
  onNavigate,
  currentPath,
}: {
  section: NavSection;
  isOpen: boolean;
  onToggle: () => void;
  collapsed: boolean;
  onNavigate?: () => void;
  currentPath: string;
}) {
  const isAnyChildActive = section.items.some(
    (item) => currentPath === item.to || currentPath.startsWith(`${item.to}/`),
  );

  if (collapsed) {
    // In collapsed icon-rail mode: click icon to navigate to first submodule
    const firstItem = section.items[0];
    return (
      <div className="relative flex justify-center py-1">
        <NavLink
          to={firstItem.to}
          onClick={onNavigate}
          title={section.label}
          className={cn(
            'group flex h-9 w-9 items-center justify-center rounded text-ink-300 motion-safe:transition-colors',
            isAnyChildActive
              ? 'bg-white/15 text-white'
              : 'hover:bg-white/10 hover:text-white',
          )}
        >
          {isAnyChildActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 h-5 w-[3px] rounded-r-full bg-accent-500"
            />
          )}
          <section.icon size={18} />
          <span className="sr-only">{section.label}</span>
        </NavLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'group flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider',
          'motion-safe:transition-colors',
          isAnyChildActive ? 'text-white' : 'text-ink-500 hover:text-ink-150',
        )}
      >
        <div className="flex items-center gap-2">
          <section.icon size={15} className={cn(isAnyChildActive ? 'text-accent-500' : 'text-ink-500 group-hover:text-ink-300')} />
          <span>{section.label}</span>
        </div>
        <IconChevronDown
          size={14}
          className={cn(
            'text-ink-500 motion-safe:transition-transform motion-safe:duration-150 group-hover:text-ink-300',
            isOpen ? 'rotate-0' : '-rotate-90',
          )}
        />
      </button>

      {isOpen && (
        <div className="mt-0.5 flex flex-col gap-0.5 pl-2">
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-2.5 rounded px-2.5 py-1.5 text-sm font-medium',
                  'motion-safe:transition-colors motion-safe:duration-150',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-ink-300 hover:bg-white/5 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute left-0 h-4 w-[3px] rounded-r-full bg-accent-500',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <item.icon size={16} className={cn('shrink-0', isActive ? 'text-accent-500' : 'text-ink-500 group-hover:text-ink-300')} />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-accent-500/20 px-1.5 py-0.5 text-2xs font-semibold text-accent-500">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
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
