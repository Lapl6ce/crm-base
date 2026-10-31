import type { ComponentType } from 'react';
import type { Team, User } from '@/data/types';
import { can, type Action } from '@/lib/rbac';
import { onTeam } from '@/lib/teams';
import {
  IconActivity,
  IconCart,
  IconContacts,
  IconDashboard,
  IconDeals,
  IconDollar,
  IconFileText,
  IconMessage,
  IconPackage,
  IconReceipt,
  IconReports,
  IconSettings,
  IconShield,
  IconSpark,
  IconTrendingUp,
  IconTruck,
  IconUsers,
  IconWarehouse,
  IconZap,
  type IconProps,
} from '@/components/icons';

/* Single source of truth for the Target Information Architecture (7 modules, 34 submodules).

   `teams` says which departments a submodule belongs to (see lib/teams.ts).
   Leave it off for something every team uses, like the dashboards. */

export interface NavSubItem {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
  requires?: Action;
  teams?: Team[];
  mobile?: boolean;
  badge?: string;
}

export interface NavSection {
  id: string;
  label: string;
  icon: ComponentType<IconProps>;
  items: NavSubItem[];
  requires?: Action;
}

export const navigationSections: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: IconDashboard,
    items: [
      { to: '/dashboard/overview', label: 'Business Overview', icon: IconDashboard, mobile: true },
      { to: '/dashboard/ai-insights', label: 'AI Business Insights', icon: IconSpark },
      { to: '/dashboard/action-center', label: 'Action Center', icon: IconActivity, mobile: true },
      { to: '/dashboard/revenue-profit', label: 'Revenue & Profit Overview', icon: IconTrendingUp, mobile: true },
      { to: '/dashboard/activity-feed', label: 'Live Activity Feed', icon: IconActivity },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: IconContacts,
    items: [
      { to: '/crm/leads', label: 'Leads', icon: IconContacts, mobile: true, teams: ['sales'] },
      { to: '/crm/customers', label: 'Customers', icon: IconContacts, teams: ['sales'] },
      { to: '/crm/suppliers', label: 'Suppliers', icon: IconWarehouse, teams: ['operations', 'finance'] },
      { to: '/crm/pipeline-deals', label: 'Pipeline & Deals', icon: IconDeals, mobile: true, teams: ['sales'] },
      { to: '/crm/communication', label: 'Communication', icon: IconMessage, teams: ['sales'] },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    icon: IconCart,
    items: [
      { to: '/commerce/products', label: 'Products', icon: IconPackage, teams: ['sales', 'operations'] },
      { to: '/commerce/sales', label: 'Sales', icon: IconDollar, teams: ['sales', 'finance'] },
      { to: '/commerce/quotations', label: 'Quotations', icon: IconFileText, teams: ['sales'] },
      { to: '/commerce/purchases', label: 'Purchases', icon: IconReceipt, teams: ['operations', 'finance'] },
      { to: '/commerce/orders', label: 'Orders', icon: IconCart, mobile: true, teams: ['sales', 'operations'] },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: IconTruck,
    items: [
      { to: '/operations/inventory-intelligence', label: 'Inventory Intelligence', icon: IconTrendingUp, teams: ['operations'] },
      { to: '/operations/warehouses', label: 'Warehouses', icon: IconWarehouse, teams: ['operations'] },
      { to: '/operations/shipments', label: 'Shipments', icon: IconTruck, teams: ['operations'] },
      { to: '/operations/supplier-performance', label: 'Supplier Performance', icon: IconSpark, teams: ['operations'] },
      { to: '/operations/document-management', label: 'Document Management', icon: IconFileText, teams: ['operations'] },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: IconDollar,
    items: [
      { to: '/finance/payments', label: 'Payments', icon: IconDollar, teams: ['finance'] },
      { to: '/finance/expenses', label: 'Expenses', icon: IconReceipt, teams: ['finance'] },
      { to: '/finance/profit-intelligence', label: 'Profit Intelligence', icon: IconTrendingUp, teams: ['finance'] },
      { to: '/finance/receivables', label: 'Receivables', icon: IconReceipt, teams: ['finance'] },
      { to: '/finance/payables', label: 'Payables', icon: IconDollar, teams: ['finance'] },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Intelligence',
    icon: IconReports,
    items: [
      { to: '/reports/ai-analytics', label: 'AI Analytics', icon: IconSpark, teams: ['sales', 'finance'] },
      { to: '/reports/sales-reports', label: 'Sales Reports', icon: IconTrendingUp, teams: ['sales', 'finance'] },
      { to: '/reports/purchase-reports', label: 'Purchase Reports', icon: IconReceipt, teams: ['operations', 'finance'] },
      { to: '/reports/customer-reports', label: 'Customer Reports', icon: IconContacts, teams: ['sales'] },
      { to: '/reports/custom-reports', label: 'Custom Reports', icon: IconReports },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: IconSettings,
    requires: 'settings.manage',
    items: [
      { to: '/administration/users', label: 'Users', icon: IconUsers },
      { to: '/administration/roles', label: 'Roles', icon: IconShield },
      { to: '/administration/automation-rules', label: 'Automation Rules', icon: IconZap },
      { to: '/administration/settings', label: 'Settings', icon: IconSettings, mobile: true },
    ],
  },
];

export interface FlatNavItem extends NavSubItem {
  sectionId: string;
  sectionLabel: string;
}

export const allNavItems: FlatNavItem[] = navigationSections.flatMap((section) =>
  section.items.map((item) => ({
    ...item,
    sectionId: section.id,
    sectionLabel: section.label,
  })),
);

/** The sections and submodules this user's role and team let them see, empty sections dropped. */
export function visibleSections(user: Pick<User, 'role' | 'team'> | null | undefined): NavSection[] {
  return navigationSections
    .filter((section) => !section.requires || can(user, section.requires))
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => (!item.requires || can(user, item.requires)) && onTeam(user, item.teams),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function visibleNavItems(user: Pick<User, 'role' | 'team'> | null | undefined): FlatNavItem[] {
  const visible = new Set(visibleSections(user).flatMap((section) => section.items.map((item) => item.to)));
  return allNavItems.filter((item) => visible.has(item.to));
}

// Backward compatibility alias
export type NavItem = FlatNavItem;
export const primaryNav: FlatNavItem[] = allNavItems;
export const secondaryNav: FlatNavItem[] = [];
