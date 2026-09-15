# CRM Architecture Migration Notes

## Overview
This document records the migration of the CRM codebase from the legacy flat `src/modules/` layout to the target 7-section Information Architecture (IA) encompassing 33 functional submodules.

---

## Target Information Architecture Mapping

| Section | Submodule | Target Route | Source / Origin | Status & Notes |
|---|---|---|---|---|
| **Dashboard** | AI Business Insights | `/dashboard/ai-insights` | New scaffolded submodule | Predictive business observations, trend detections, and recommendations. |
| **Dashboard** | Action Center | `/dashboard/action-center` | Migrated from `dashboard/DashboardPage` ("Needs attention" & "Due next") + `tasks/TasksPage` | High-urgency operational triage queue for tasks, stale deals, and inventory alerts. |
| **Dashboard** | Revenue & Profit Overview | `/dashboard/revenue-profit` | Migrated from `dashboard/DashboardPage` stat tiles + `dashboard/ReportsPage` | Top-line KPI summary cards and pipeline/revenue charts. Default landing page. |
| **Dashboard** | Live Activity Feed | `/dashboard/activity-feed` | Migrated from `components/ActivityTimeline` & `dashboard/DashboardPage` | Chronological activity log with multi-type event filtering and details. |
| **CRM** | Leads | `/crm/leads` | Migrated from `contacts` (`status: 'lead'`) | Pre-sale prospect intake, lead scoring, status pipeline, and convert-to-customer action. |
| **CRM** | Customers | `/crm/customers` | Migrated from `contacts` (`status: 'active' | 'inactive'`) & `companies` | Converted client accounts, detail routes (`/crm/customers/:id`), deal history, and customer drawer. |
| **CRM** | Suppliers | `/crm/suppliers` | Migrated & evolved from vendor `companies` | Vendor relationship profiles, rating, payment terms, contact info, and purchase links. Detail route (`/crm/suppliers/:id`). |
| **CRM** | Pipeline & Deals | `/crm/pipeline-deals` | Migrated from `deals` (`DealsPage`, `PipelineBoard`, `DealDetailPage`) | Drag-and-drop Kanban board, stage columns, heat stripes, detail routes (`/crm/pipeline-deals/:id`), and deal drawer. |
| **CRM** | Communication | `/crm/communication` | New submodule leveraging `NotesPanel` & `ActivityTimeline` | Unified communication log (calls, emails, meetings, notes) linked to accounts and leads. |
| **Commerce** | Products | `/commerce/products` | New scaffolded submodule | Product catalog with SKU, category, unit price, unit cost, stock on hand, and CRUD drawer. Detail route (`/commerce/products/:id`). |
| **Commerce** | Sales | `/commerce/sales` | New scaffolded submodule | Completed sales transaction history, invoice numbers, totals, payment status, and detail route (`/commerce/sales/:id`). |
| **Commerce** | Quotations | `/commerce/quotations` | New scaffolded submodule | Pre-sale quotes and proposals, quote status, validity dates, line items, and detail route (`/commerce/quotations/:id`). |
| **Commerce** | Purchases | `/commerce/purchases` | New scaffolded submodule | Purchase orders issued to suppliers, order dates, receiving status, and detail route (`/commerce/purchases/:id`). |
| **Commerce** | Orders | `/commerce/orders` | New scaffolded submodule | Central order lifecycle tracker (Sales Orders & Purchase Orders), fulfillment stages, and detail route (`/commerce/orders/:id`). |
| **Operations** | Inventory Intelligence | `/operations/inventory-intelligence` | New scaffolded submodule | Stock velocity analytics, reorder point alerts, turnover rates, and low-stock forecasting. |
| **Operations** | Warehouses | `/operations/warehouses` | New scaffolded submodule | Fulfillment facilities, capacity utilization, warehouse manager, and detail route (`/operations/warehouses/:id`). |
| **Operations** | Shipments | `/operations/shipments` | New scaffolded submodule | Logistics shipment tracker, tracking numbers, carriers, origin/destinations, and status. Detail route (`/operations/shipments/:id`). |
| **Operations** | Supplier Performance | `/operations/supplier-performance` | New scaffolded submodule | Vendor scorecards tracking On-Time Delivery %, Quality Acceptance %, Lead Time, and Risk Rating. |
| **Operations** | Document Management | `/operations/document-management` | New scaffolded submodule | Central repository for contracts, compliance documents, invoices, and specs with tag filters and upload modal. |
| **Finance** | Payments | `/finance/payments` | New scaffolded submodule | Inbound & outbound transaction log, payment methods, transaction references, and detail route (`/finance/payments/:id`). |
| **Finance** | Expenses | `/finance/expenses` | New scaffolded submodule | Internal operational expenditures, cost categories, approval manager, and receipt status. |
| **Finance** | Profit Intelligence | `/finance/profit-intelligence` | New scaffolded submodule | Gross/net margin analytics, product line profitability, and revenue vs cost breakdown. |
| **Finance** | Receivables | `/finance/receivables` | New scaffolded submodule | Accounts receivable aging buckets (0–30, 31–60, 61–90, 90+ days), debtor tracking, and overdue status. |
| **Finance** | Payables | `/finance/payables` | New scaffolded submodule | Accounts payable bills, supplier due dates, payment status, and cash outflow schedule. |
| **Reports & Intelligence** | AI Analytics | `/reports/ai-analytics` | New scaffolded submodule | Predictive pipeline win forecasting, deal churn risk model, and revenue projection graphs. |
| **Reports & Intelligence** | Sales Reports | `/reports/sales-reports` | Migrated from `dashboard/ReportsPage` | Deep-dive sales performance reports, stage velocity, won/lost analytics, and table views. |
| **Reports & Intelligence** | Purchase Reports | `/reports/purchase-reports` | New scaffolded submodule | Procurement spend analysis by vendor, spend trends over time, and category breakdowns. |
| **Reports & Intelligence** | Customer Reports | `/reports/customer-reports` | New scaffolded submodule | Customer lifetime value (LTV), cohort retention, churn rates, and top customer accounts. |
| **Reports & Intelligence** | Custom Reports | `/reports/custom-reports` | New scaffolded submodule | Configurable report builder with metric selection, dimension grouping, and exportable data tables. |
| **Administration** | Users | `/administration/users` | Migrated from `users/UsersPage` | Team directory, user creation/edit drawer, and user profile management. |
| **Administration** | Roles | `/administration/roles` | New scaffolded submodule | Role-Based Access Control (RBAC) role definitions and granular permissions matrix. |
| **Administration** | Automation Rules | `/administration/automation-rules` | New scaffolded submodule | Workflow automation engine with Trigger → Condition → Action rule builder and status toggles. |
| **Administration** | Settings | `/administration/settings` | Migrated from `settings/SettingsPage` | Company Profile, Pipeline Stage Editor, brand accent color picker, and Demo Mode toggle. |

---

## Architectural Decisions & Clarifications for Review

1. **Companies Entity Mapping**:
   - In the legacy codebase, `Company` was a generic entity without clear distinction between customers and suppliers.
   - In the target IA, `Companies` that are buyer accounts are unified with **Customers** (`/crm/customers`), while vendor companies are represented in **Suppliers** (`/crm/suppliers`).
   - The original `Company` data repository remains fully intact and backwards-compatible.

2. **Tasks Relocation**:
   - The target IA has no top-level "Tasks" module. Tasks naturally serve as items needing action.
   - Tasks are relocated to `/dashboard/action-center` as an urgent triage queue, while remaining embedded on record detail pages (leads, customers, deals).
   - In addition, an "All Tasks" toggle view is integrated into the Action Center for full task management.

3. **Backward Compatibility & Redirects**:
   - To ensure no links or bookmarks break, legacy URLs are configured with automatic redirects:
     - `/` → `/dashboard/revenue-profit`
     - `/dashboard` → `/dashboard/revenue-profit`
     - `/contacts` → `/crm/customers`
     - `/contacts/:id` → `/crm/customers/:id`
     - `/companies` → `/crm/customers`
     - `/companies/:id` → `/crm/customers/:id`
     - `/deals` → `/crm/pipeline-deals`
     - `/deals/:id` → `/crm/pipeline-deals/:id`
     - `/tasks` → `/dashboard/action-center`
     - `/reports` → `/reports/sales-reports`
     - `/users` → `/administration/users`
     - `/settings` → `/administration/settings`

4. **Data Layer Strategy**:
   - Maintains 100% mock/local data (zero backend required).
   - A generic local store manager (`useLocalCollection`) builds upon the project's existing `Collection<T>` engine, ensuring that all newly scaffolded modules have realistic typed datasets, full reactivity, search, filter, and local CRUD (create, update, delete) operations that persist to `localStorage`.
