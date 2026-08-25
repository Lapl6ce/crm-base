import type { ComponentType } from 'react';
import type { Action } from '@/lib/rbac';
import {
  IconCompanies,
  IconContacts,
  IconDashboard,
  IconDeals,
  IconReports,
  IconSettings,
  IconTasks,
  IconUsers,
  type IconProps,
} from '@/components/icons';

/* The nav is data, not markup. Adding or removing a module is one entry here
   plus one route — which is the whole point of module isolation (CONTEXT.md §3). */

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
  /** Hidden unless the current user can do this. */
  requires?: Action;
  /** Pinned to the mobile bottom bar. Max five. */
  mobile?: boolean;
}

export const primaryNav: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, requires: 'contacts.view', mobile: true },
  { to: '/contacts', label: 'Contacts', icon: IconContacts, requires: 'contacts.view', mobile: true },
  { to: '/companies', label: 'Companies', icon: IconCompanies, requires: 'companies.view' },
  { to: '/deals', label: 'Pipeline', icon: IconDeals, requires: 'deals.view', mobile: true },
  { to: '/tasks', label: 'Tasks', icon: IconTasks, requires: 'tasks.view', mobile: true },
  { to: '/reports', label: 'Reports', icon: IconReports, requires: 'reports.view' },
];

export const secondaryNav: NavItem[] = [
  { to: '/users', label: 'Users', icon: IconUsers, requires: 'users.view' },
  { to: '/settings', label: 'Settings', icon: IconSettings, requires: 'settings.view', mobile: true },
];
