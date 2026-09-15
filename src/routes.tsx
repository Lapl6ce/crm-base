import { AppShell } from '@/layout/AppShell';
import { NotFoundPage } from '@/layout/NotFoundPage';
import { RequireRole } from '@/layout/RequireRole';
import { Navigate, Route, Routes } from 'react-router-dom';

// Dashboard
import { ActionCenterPage } from '@/features/dashboard/action-center/ActionCenterPage';
import { ActivityFeedPage } from '@/features/dashboard/activity-feed/ActivityFeedPage';
import { AIInsightsPage } from '@/features/dashboard/ai-insights/AIInsightsPage';
import { RevenueProfitPage } from '@/features/dashboard/revenue-profit/RevenueProfitPage';

// CRM
import { CommunicationPage } from '@/features/crm/communication/CommunicationPage';
import { CustomerDetailPage } from '@/features/crm/customers/CustomerDetailPage';
import { CustomersPage } from '@/features/crm/customers/CustomersPage';
import { LeadsPage } from '@/features/crm/leads/LeadsPage';
import { DealDetailPage } from '@/features/crm/pipeline-deals/DealDetailPage';
import { DealsPage } from '@/features/crm/pipeline-deals/DealsPage';
import { SupplierDetailPage } from '@/features/crm/suppliers/SupplierDetailPage';
import { SuppliersPage } from '@/features/crm/suppliers/SuppliersPage';

// Commerce
import { OrdersPage } from '@/features/commerce/orders/OrdersPage';
import { ProductsPage } from '@/features/commerce/products/ProductsPage';
import { PurchasesPage } from '@/features/commerce/purchases/PurchasesPage';
import { QuotationsPage } from '@/features/commerce/quotations/QuotationsPage';
import { SalesPage } from '@/features/commerce/sales/SalesPage';

// Operations
import { DocumentsPage } from '@/features/operations/documents/DocumentsPage';
import { InventoryPage } from '@/features/operations/inventory/InventoryPage';
import { ShipmentsPage } from '@/features/operations/shipments/ShipmentsPage';
import { SupplierPerformancePage } from '@/features/operations/supplier-performance/SupplierPerformancePage';
import { WarehousesPage } from '@/features/operations/warehouses/WarehousesPage';

// Finance
import { ExpensesPage } from '@/features/finance/expenses/ExpensesPage';
import { PayablesPage } from '@/features/finance/payables/PayablesPage';
import { PaymentsPage } from '@/features/finance/payments/PaymentsPage';
import { ProfitIntelligencePage } from '@/features/finance/profit/ProfitIntelligencePage';
import { ReceivablesPage } from '@/features/finance/receivables/ReceivablesPage';

// Reports
import { AIAnalyticsPage } from '@/features/reports/ai-analytics/AIAnalyticsPage';
import { CustomReportsPage } from '@/features/reports/custom-reports/CustomReportsPage';
import { CustomerReportsPage } from '@/features/reports/customer-reports/CustomerReportsPage';
import { PurchaseReportsPage } from '@/features/reports/purchase-reports/PurchaseReportsPage';
import { SalesReportsPage } from '@/features/reports/sales-reports/SalesReportsPage';

// Administration
import { AutomationRulesPage } from '@/features/administration/automation/AutomationRulesPage';
import { RolesPage } from '@/features/administration/roles/RolesPage';
import { SettingsPage } from '@/features/administration/settings/SettingsPage';
import { UsersPage } from '@/features/administration/users/UsersPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Default redirect to Revenue & Profit Overview */}
        <Route index element={<Navigate to="/dashboard/revenue-profit" replace />} />
        <Route path="dashboard" element={<Navigate to="/dashboard/revenue-profit" replace />} />

        {/* 1. Dashboard (4 submodules) */}
        <Route path="dashboard/revenue-profit" element={<RevenueProfitPage />} />
        <Route path="dashboard/action-center" element={<ActionCenterPage />} />
        <Route path="dashboard/activity-feed" element={<ActivityFeedPage />} />
        <Route path="dashboard/ai-insights" element={<AIInsightsPage />} />

        {/* 2. CRM (5 submodules + detail views) */}
        <Route path="crm" element={<Navigate to="/crm/leads" replace />} />
        <Route path="crm/leads" element={<LeadsPage />} />
        <Route path="crm/customers" element={<CustomersPage />} />
        <Route path="crm/customers/:id" element={<CustomerDetailPage />} />
        <Route path="crm/suppliers" element={<SuppliersPage />} />
        <Route path="crm/suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="crm/pipeline-deals" element={<DealsPage />} />
        <Route path="crm/pipeline-deals/:id" element={<DealDetailPage />} />
        <Route path="crm/communication" element={<CommunicationPage />} />

        {/* 3. Commerce (5 submodules) */}
        <Route path="commerce" element={<Navigate to="/commerce/products" replace />} />
        <Route path="commerce/products" element={<ProductsPage />} />
        <Route path="commerce/sales" element={<SalesPage />} />
        <Route path="commerce/quotations" element={<QuotationsPage />} />
        <Route path="commerce/purchases" element={<PurchasesPage />} />
        <Route path="commerce/orders" element={<OrdersPage />} />

        {/* 4. Operations (5 submodules) */}
        <Route path="operations" element={<Navigate to="/operations/inventory-intelligence" replace />} />
        <Route path="operations/inventory-intelligence" element={<InventoryPage />} />
        <Route path="operations/warehouses" element={<WarehousesPage />} />
        <Route path="operations/shipments" element={<ShipmentsPage />} />
        <Route path="operations/supplier-performance" element={<SupplierPerformancePage />} />
        <Route path="operations/document-management" element={<DocumentsPage />} />

        {/* 5. Finance (5 submodules) */}
        <Route path="finance" element={<Navigate to="/finance/payments" replace />} />
        <Route path="finance/payments" element={<PaymentsPage />} />
        <Route path="finance/expenses" element={<ExpensesPage />} />
        <Route path="finance/profit-intelligence" element={<ProfitIntelligencePage />} />
        <Route path="finance/receivables" element={<ReceivablesPage />} />
        <Route path="finance/payables" element={<PayablesPage />} />

        {/* 6. Reports (5 submodules) */}
        <Route path="reports" element={<Navigate to="/reports/sales-reports" replace />} />
        <Route path="reports/ai-analytics" element={<AIAnalyticsPage />} />
        <Route path="reports/sales-reports" element={<SalesReportsPage />} />
        <Route path="reports/purchase-reports" element={<PurchaseReportsPage />} />
        <Route path="reports/customer-reports" element={<CustomerReportsPage />} />
        <Route path="reports/custom-reports" element={<CustomReportsPage />} />

        {/* 7. Administration (4 submodules) */}
        <Route path="administration" element={<Navigate to="/administration/settings" replace />} />
        <Route
          path="administration/users"
          element={
            <RequireRole action="users.view">
              <UsersPage />
            </RequireRole>
          }
        />
        <Route path="administration/roles" element={<RolesPage />} />
        <Route path="administration/automation-rules" element={<AutomationRulesPage />} />
        <Route
          path="administration/settings"
          element={
            <RequireRole action="settings.manage">
              <SettingsPage />
            </RequireRole>
          }
        />

        {/* Legacy Backward-Compatible Route Redirects */}
        <Route path="contacts" element={<Navigate to="/crm/customers" replace />} />
        <Route path="contacts/:id" element={<CustomerDetailPage />} />
        <Route path="companies" element={<Navigate to="/crm/customers" replace />} />
        <Route path="companies/:id" element={<Navigate to="/crm/customers" replace />} />
        <Route path="deals" element={<Navigate to="/crm/pipeline-deals" replace />} />
        <Route path="deals/:id" element={<DealDetailPage />} />
        <Route path="tasks" element={<Navigate to="/dashboard/action-center" replace />} />
        <Route path="users" element={<Navigate to="/administration/users" replace />} />
        <Route path="settings" element={<Navigate to="/administration/settings" replace />} />

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
