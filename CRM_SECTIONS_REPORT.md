# CRM Sections Report

What this CRM is, what each section does, and what changed in the October 2026 pass.

---

## 1. What this CRM is

**CRM Base** is a reusable business-management app built to be **copied and customised for each client**, not shipped as-is. It is a React + TypeScript web app (Vite, Tailwind, Recharts) with **no backend yet**. Everything is stored in the browser's `localStorage`, behind one data layer that can be replaced by a real API later. That swap point is a single line in `src/main.tsx`.

It has grown from a classic sales CRM (contacts, companies, deals, tasks) into a small ERP. There are **7 sections with 34 submodules** covering sales, commerce, operations, finance, reporting and administration.

Three architecture rules are enforced automatically by `npm run lint` (see `CONTEXT.md`):

1. UI code never talks to the storage adapter directly. It goes through the data layer.
2. Feature modules never import each other. They share data only through `src/data`.
3. Demo Mode (`src/demo/`) can be deleted before client handoff without breaking the app.

### Where the data comes from

There are two kinds of data in the app, and it matters when you demo it:

| Data source | Used by | On a fresh install |
|---|---|---|
| **Core data layer** (contacts, companies, deals, tasks, notes, activity) | Leads, Customers, Pipeline & Deals, Action Center (tasks/deals), Revenue & Profit Overview, Live Activity Feed, Sales Reports | **Empty**. Go to *Administration → Settings → Demo Mode → Load demo data* to fill it. |
| **Bundled dummy datasets** (`src/data/mock/mockDatasets.ts`) | Everything in Commerce, Operations and Finance, plus Suppliers, Communication, AI Insights, Roles, Automation Rules and the new Business Overview | **Pre-filled** with sample records. Edits are saved in the browser. |
| **Hard-coded sample figures** inside the page | AI Analytics, Profit Intelligence, Purchase/Customer/Custom Reports (charts) | Always shows the same sample numbers. |

---

## 2. What changed in this pass

| Change | Where |
|---|---|
| **Modules separated by team.** Users can be put on a Sales, Operations, Finance or Management team. The sidebar, mobile nav and `Ctrl-K` command bar then show only that team's modules. | `src/lib/teams.ts`, `src/layout/navigation.ts`, Users page |
| **Business Overview page** (new landing page). One panel per team, built from the dummy data. | `/dashboard/overview` |
| **AI Analytics: Week / Month / Quarter selector.** All KPIs, both charts and the deal table recalculate for the chosen window. | `/reports/ai-analytics` |
| **New dummy data**: 16 forecast deals for AI Analytics, with close dates relative to today, plus two extra demo users (Operations and Finance). | `aiForecastData.ts`, `src/demo/names.ts` |
| **Administration menu is admin-only.** Sales reps no longer see it. Most of its pages already showed "Admins only" to them. | `navigation.ts` |

Following your "no big changes, wait for customer feedback" instruction, nothing was restructured. No folders moved, no existing routes changed, and existing users and data keep working unchanged.

---

## 3. Teams: who sees what

Set a user's team in **Administration → Users** (click a user → *Team*). Then use **View as** on that row to see the app the way that user does.

| Team | Sees |
|---|---|
| **No team** (default, and every existing user) | Everything their role allows, exactly as before |
| **Admin role** (any team) | Everything |
| **Management** | Everything except Administration (Administration needs the Admin role) |
| **Sales** | Dashboards · Leads, Customers, Pipeline & Deals, Communication · Products, Sales, Quotations, Orders · AI Analytics, Sales Reports, Customer Reports, Custom Reports |
| **Operations** | Dashboards · Suppliers · Products, Purchases, Orders · all of Operations · Purchase Reports, Custom Reports |
| **Finance** | Dashboards · Suppliers · Sales, Purchases · all of Finance · AI Analytics, Sales Reports, Purchase Reports, Custom Reports |

All five Dashboard pages are shared by every team. On the Business Overview, a team member sees only their own team's panel.

> **Note:** like the existing role system, teams **hide** modules; they do not **lock** them. Someone who types a URL directly can still open a page. That is consistent with how the app treats roles today ("demo-only, no server to enforce against"). It becomes real access control once a backend exists.

To change which team owns a module, edit the `teams: [...]` list on that line in `src/layout/navigation.ts`. That file is the only place to change.

---

## 4. Section by section

### 4.1 Dashboard (shared by all teams)

**Business Overview** (`/dashboard/overview`, *new, default landing page*)
A one-screen health check of the business, split into Sales, Operations and Finance panels. Each panel has four figures, and every figure links to the module it was counted from.
- *Sales*: revenue booked (completed sales), value of open quotations (draft or sent), sales orders still pending or processing, top customer by booked revenue.
- *Operations*: stock alerts (low + out of stock), shipments needing attention (delayed, exception or customs hold) and how many are in transit, open purchase orders and their value, average warehouse utilisation.
- *Finance*: money owed to us and how much of it is overdue, money we owe and how many bills are overdue, net cash from settled payments (in minus out), expenses awaiting approval.

The page reads the same stores the module pages edit, so changing a sale or a bill updates the overview immediately. Figures in red need action; figures in green are good news.

**AI Business Insights** (`/dashboard/ai-insights`)
Cards of AI-style observations (revenue growth, supply & operations, risk & compliance, velocity & efficiency). Each card has an impact level, a highlighted metric and a recommended action. A filter bar switches categories. *Execute Recommendation* jumps to the relevant module, and *Run Diagnostics* simulates a refresh. The content is sample data.

**Action Center** (`/dashboard/action-center`)
The daily to-do queue. It pulls together tasks that are overdue or due soon, open deals going stale, low or out-of-stock products, and overdue receivables, with tabs for All / Tasks / Deals / System Alerts. You can tick tasks off here. This replaced the old standalone Tasks page.

**Revenue & Profit Overview** (`/dashboard/revenue-profit`)
The sales-pipeline dashboard. It has four tiles (open pipeline value, won this quarter, win rate over 90 days, pending tasks) and two charts: open pipeline by stage, and deals won/lost per week for the last 12 weeks. It reads the core data, so it is empty until Demo Mode is loaded. Every chart has a Chart/Table toggle.

**Live Activity Feed** (`/dashboard/activity-feed`)
A chronological log of everything that happened: records created, deals moving stages, deals won or lost, tasks completed, notes added. It can be filtered by type.

### 4.2 CRM

**Leads** (`/crm/leads`, Sales)
Prospects not yet buying. You can search, filter, add, edit and delete them, and **convert** a lead into an active customer. Each lead can carry tags, a company and an owner.

**Customers** (`/crm/customers`, Sales)
Active and inactive customer contacts, plus a company-accounts view. Each row carries an **engagement heat** stripe: the coloured left edge that warms up the longer a customer goes without contact. The customer detail page shows the profile, related deals, outstanding tasks, notes and an activity stream.

**Suppliers** (`/crm/suppliers`, Operations + Finance)
The vendor directory: contact person, category, payment terms, rating and number of active contracts. The supplier detail page shows the vendor scorecard, purchase orders and linked contract documents.

**Pipeline & Deals** (`/crm/pipeline-deals`, Sales)
A drag-and-drop Kanban board with one column per pipeline stage. Columns are set in Settings. Dragging a deal into *Closed Won* or *Closed Lost* closes it and records the event in history. Cards are ordered by urgency (heat). You can drag with mouse, touch or keyboard (Space to pick up, arrows to move, Space to drop). The deal detail page shows the record, open tasks, notes and timeline.

**Communication** (`/crm/communication`, Sales)
A log of every interaction: email, call, meeting, SMS or internal note. Each entry records its direction (inbound/outbound/internal), status (completed, scheduled, missed, draft), contact, company and summary.

### 4.3 Commerce

**Products** (`/commerce/products`, Sales + Operations)
The product catalogue: SKU, category, unit price and cost (the margin % is calculated for you), stock on hand, reorder point and status (active, low stock, out of stock, archived).

**Sales** (`/commerce/sales`, Sales + Finance)
Sales invoices: invoice number, customer, amount, payment terms (Due on receipt / Net 15/30/60), number of line items and status (draft, issued, paid, overdue, completed, refunded…).

**Quotations** (`/commerce/quotations`, Sales)
Price quotes sent to prospects, with a valid-until date and status (draft, sent, accepted, declined, expired).

**Purchases** (`/commerce/purchases`, Operations + Finance)
Purchase orders sent to suppliers. Each has two separate statuses: delivery (draft → ordered → partially received → received) and payment (unpaid, partially paid, paid). It also tracks the expected delivery date.

**Orders** (`/commerce/orders`, Sales + Operations)
One tracker for both sales orders (outbound) and purchase orders (inbound). It follows fulfilment (pending → processing → shipped → delivered) with a tracking number.

### 4.4 Operations (Operations team)

**Inventory Intelligence** (`/operations/inventory-intelligence`)
A stock monitor built from the product catalogue. It shows stock against reorder threshold, stock value, and a health status that flags items close to running out. *Adjust Stock* corrects on-hand quantities.

**Warehouses** (`/operations/warehouses`)
Storage sites with code, location, manager, capacity, units used (shown as a utilisation bar) and status (operational, maintenance, full).

**Shipments** (`/operations/shipments`)
Inbound and outbound freight tracking: tracking number, carrier, origin → destination, ETA and status (pending, in transit, out for delivery, delivered, delayed, customs hold, exception, returned).

**Supplier Performance** (`/operations/supplier-performance`)
Quarterly scorecards for each vendor: on-time delivery %, quality acceptance %, defect rate, lead time, spend and a tier rating from A (elite) to D (high risk).

**Document Management** (`/operations/document-management`)
A central file index for contracts/NDAs, invoices, proposals, compliance documents and technical specs. Each document is tagged and linked to a customer, supplier or deal. It stores the record only; real file upload needs a backend.

### 4.5 Finance (Finance team)

**Payments** (`/finance/payments`)
Every payment in or out: reference number, counterparty, direction (inbound from customers, outbound to vendors), method (wire, ACH, card, check) and status (completed, pending, failed).

**Expenses** (`/finance/expenses`)
Internal spending (software, travel, marketing, office, legal…) with approver, receipt-attached flag, and status (pending, approved, rejected, paid).

**Profit Intelligence** (`/finance/profit-intelligence`)
Margin analysis. It charts revenue vs cost of goods vs net profit over six months, gross margin by product category, and a product-line profitability table with average price, cost and margin health.

**Receivables** (`/finance/receivables`)
Money customers owe us, grouped by **aging bucket** (current, 1–30, 31–60, 61–90, 90+ days overdue), with status (current, overdue, disputed, collected).

**Payables** (`/finance/payables`)
Bills we owe suppliers: due date, payment method and status (pending, scheduled, overdue, paid).

### 4.6 Reports & Intelligence

**AI Analytics** (`/reports/ai-analytics`, Sales + Finance, *updated*)
Sales forecasting. A **Week / Month / Quarter** switch at the top sets the time window (next 7, 30 or 90 days), and everything on the page recalculates for it:
- **Predicted Closed Won**: expected revenue, calculated as each deal's value × its win probability. The ± margin narrows for shorter windows.
- **Pipeline Health**: average win probability, with bigger deals counting for more.
- **Deals At Risk**: total value of deals under 40% win probability.
- **Forecast timeline** chart: expected revenue per **day** (Week), per **week** (Month) or per **month** (Quarter).
- **Win-probability distribution** chart: how much pipeline value sits in each confidence band.
- **Deal table**: the deals closing inside the window, soonest first, each with its expected close date, risk factor and a suggested next step.

The forecast data is dummy data (16 deals). Close dates are stored as "days from today", so the windows always have content whenever the app is opened. Model Accuracy is a fixed sample figure.

**Sales Reports** (`/reports/sales-reports`, Sales + Finance)
Open pipeline by stage, deals won/lost per week, and activity volume per week, all computed from the real deal history. Empty until Demo Mode is loaded.

**Purchase Reports** (`/reports/purchase-reports`, Operations + Finance)
Purchasing spend per month, and spend by vendor with each vendor's share of the total.

**Customer Reports** (`/reports/customer-reports`, Sales)
Customer lifetime value, average value by customer tier, and the top accounts with their growth trend.

**Custom Reports** (`/reports/custom-reports`, all teams)
A simple report builder. You pick a metric (revenue, margin, units), a grouping (customer, product category, sales rep) and a date range, then view the result as a chart and table and export it.

### 4.7 Administration (Admins only)

**Users** (`/administration/users`, *updated*)
The team directory. You can add or edit users, set their **role** (Admin / Sales Rep) and **team**, remove users (their records pass to an admin), and use **View as** to see the app as another user. A new *Teams* card explains each team. There is no login yet: the user switcher in the top bar stands in for one.

**Roles** (`/administration/roles`)
Defines roles with permission sets (view/edit CRM, manage commerce, operations, finance, reports, admin). This page is a configuration screen for now: the permissions the app actually enforces are still the Admin / Sales Rep rules in `src/lib/rbac.ts`.

**Automation Rules** (`/administration/automation-rules`)
"When X happens, if Y, do Z" rules. For example: a deal changes stage → create an urgent follow-up task; stock reaches its reorder level → draft a purchase order. Rules can be switched on and off, and each shows how many times it has run. These are configured but not executed yet; an automation engine is backend work.

**Settings** (`/administration/settings`)
Company name and logo, a **brand accent colour** that recolours the whole app instantly (with a contrast warning if the colour makes text hard to read), the **pipeline stage editor** (rename, reorder, choose which stages count as won or lost), and the **Demo Mode** switch that fills the core data with a realistic sample book of business.

---

## 5. Decisions I made that you may want to check

1. **"Cloudy"**: I couldn't find anything by that name on the machine or in the project, so I read it as "Claude" and generated the dummy data myself. If you meant a specific source (a cloud drive, an API, a file), point me at it and I'll load from there instead.
2. **Business Overview is now the landing page** (it was Revenue & Profit Overview). On a fresh install the old landing page is empty until Demo Mode is loaded, while the overview always has data.
3. **Teams hide modules but don't lock them** (see §3). Locking pages by URL is a small extra step if you want it now.
4. **Duration selector added only to AI Analytics**, the AI report. AI Business Insights (a dashboard page of fixed sample cards with 2024 dates) did not get one. It could get the same switch once its insights carry relative dates.
5. **Team-to-module mapping** (§3) is my best guess at a typical distribution business. It is one line per module in `navigation.ts`, so it is easy to change once customers say how their teams actually work.

## 6. Known gaps (unchanged, from `CONTEXT.md`)

No backend, login or multi-tenancy. No real file storage. No email or calendar integration. No bulk import/export. Text is English-only. The brand coral fails contrast with white button text (3.28:1 vs the 4.5:1 required); this is documented in `CONTEXT.md` §4 as a decision for each client.
