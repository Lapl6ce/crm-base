import type { ComponentType } from 'react';
import type { Action } from '@/lib/rbac';
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

/* Single source of truth for the Target Information Architecture (7 modules, 33 submodules). */

export interface NavSubItem {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
  requires?: Action;
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
      { to: '/crm/leads', label: 'Leads', icon: IconContacts, mobile: true },
      { to: '/crm/customers', label: 'Customers', icon: IconContacts },
      { to: '/crm/suppliers', label: 'Suppliers', icon: IconWarehouse },
      { to: '/crm/pipeline-deals', label: 'Pipeline & Deals', icon: IconDeals, mobile: true },
      { to: '/crm/communication', label: 'Communication', icon: IconMessage },
    ],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    icon: IconCart,
    items: [
      { to: '/commerce/products', label: 'Products', icon: IconPackage },
      { to: '/commerce/sales', label: 'Sales', icon: IconDollar },
      { to: '/commerce/quotations', label: 'Quotations', icon: IconFileText },
      { to: '/commerce/purchases', label: 'Purchases', icon: IconReceipt },
      { to: '/commerce/orders', label: 'Orders', icon: IconCart, mobile: true },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: IconTruck,
    items: [
      { to: '/operations/inventory-intelligence', label: 'Inventory Intelligence', icon: IconTrendingUp },
      { to: '/operations/warehouses', label: 'Warehouses', icon: IconWarehouse },
      { to: '/operations/shipments', label: 'Shipments', icon: IconTruck },
      { to: '/operations/supplier-performance', label: 'Supplier Performance', icon: IconSpark },
      { to: '/operations/document-management', label: 'Document Management', icon: IconFileText },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: IconDollar,
    items: [
      { to: '/finance/payments', label: 'Payments', icon: IconDollar },
      { to: '/finance/expenses', label: 'Expenses', icon: IconReceipt },
      { to: '/finance/profit-intelligence', label: 'Profit Intelligence', icon: IconTrendingUp },
      { to: '/finance/receivables', label: 'Receivables', icon: IconReceipt },
      { to: '/finance/payables', label: 'Payables', icon: IconDollar },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Intelligence',
    icon: IconReports,
    items: [
      { to: '/reports/ai-analytics', label: 'AI Analytics', icon: IconSpark },
      { to: '/reports/sales-reports', label: 'Sales Reports', icon: IconTrendingUp },
      { to: '/reports/purchase-reports', label: 'Purchase Reports', icon: IconReceipt },
      { to: '/reports/customer-reports', label: 'Customer Reports', icon: IconContacts },
      { to: '/reports/custom-reports', label: 'Custom Reports', icon: IconReports },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: IconSettings,
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

// Backward compatibility alias
export type NavItem = FlatNavItem;
export const primaryNav: FlatNavItem[] = allNavItems;
export const secondaryNav: FlatNavItem[] = [];
