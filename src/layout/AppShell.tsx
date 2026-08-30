import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { can } from '@/lib/rbac';
import { applyAccent } from '@/lib/tokens';
import { useSession } from '@/data/useSession';
import { Toaster } from '@/components/Toast';
import { CommandBar, useCommandBarShortcut } from './CommandBar';
import { ErrorBoundary } from './ErrorBoundary';
import { RouteAnnouncer } from './RouteAnnouncer';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { primaryNav, secondaryNav, type NavItem } from './navigation';

/* The frame every route renders inside.
 *
 * Responsive model (CONTEXT.md §4):
 *   lg+  full sidebar
 *   md   icon rail
 *   <md  bottom bar, plus a slide-over for the full nav
 */

export function AppShell() {
  const { user, users, settings, switchUser } = useSession();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  useCommandBarShortcut(useCallback(() => setCommandOpen(true), []));

  // The client customization hook: one settings field repaints the app.
  useEffect(() => {
    if (settings?.company.accentColor) applyAccent(settings.company.accentColor);
  }, [settings?.company.accentColor]);

  // Route changes close the mobile nav; leaving it open over the new page is a
  // small thing that feels broken.
  useEffect(() => setMobileNavOpen(false), [location.pathname]);

  const mobileItems = [...primaryNav, ...secondaryNav]
    .filter((item) => item.mobile && (!item.requires || can(user, item.requires)))
    .slice(0, 5);

  const companyName = settings?.company.name ?? 'CRM';

  return (
    <div className="flex min-h-dvh bg-surface-app">
      {/* First thing in the tab order, visible only when focused: a keyboard
          user should not have to tab through the whole nav on every page. */}
      <a
        href="#main"
        className="sr-only left-3 top-3 z-[80] rounded bg-ink-900 px-3 py-2 text-base font-medium text-white focus:not-sr-only focus:fixed"
      >
        Skip to content
      </a>
      <RouteAnnouncer companyName={companyName} />
      {/* md: icon rail, lg: full */}
      <div className="sticky top-0 hidden h-dvh md:block lg:hidden">
        <Sidebar user={user} companyName={companyName} collapsed />
      </div>
      <div className="sticky top-0 hidden h-dvh lg:block">
        <Sidebar user={user} companyName={companyName} collapsed={false} />
      </div>

      {/* Below md: slide-over nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-ink-900/40 motion-safe:animate-fade-in"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="relative h-full w-sidebar shadow-lg">
            <Sidebar
              user={user}
              companyName={companyName}
              collapsed={false}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          users={users}
          onSwitchUser={switchUser}
          onOpenCommandBar={() => setCommandOpen(true)}
          onOpenNav={() => setMobileNavOpen(true)}
        />

        <main
          id="main"
          /* -1 so RouteAnnouncer can move focus here after a navigation, without
             adding a stop to the normal tab order. */
          tabIndex={-1}
          className="mx-auto w-full max-w-[100rem] flex-1 px-3 py-5 pb-20 outline-none sm:px-5 md:pb-6"
        >
          {/* Keyed on the path: a screen that failed does not stay failed once
              you navigate somewhere else. */}
          <ErrorBoundary key={location.pathname} label={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>

        <MobileNav items={mobileItems} />
      </div>

      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} user={user} />
      <Toaster />
    </div>
  );
}

function MobileNav({ items }: { items: NavItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-100 bg-surface-card/95 backdrop-blur md:hidden"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-2xs font-medium',
              isActive ? 'text-accent-600' : 'text-ink-300',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden="true"
                className={cn('h-[3px] w-6 rounded-full bg-accent-500', !isActive && 'opacity-0')}
              />
              <item.icon size={18} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
