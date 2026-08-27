import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/layout/AppShell';
import { NotFoundPage } from '@/layout/NotFoundPage';
import { RequireRole } from '@/layout/RequireRole';
import { CompaniesPage } from '@/modules/companies/CompaniesPage';
import { CompanyDetailPage } from '@/modules/companies/CompanyDetailPage';
import { ContactDetailPage } from '@/modules/contacts/ContactDetailPage';
import { ContactsPage } from '@/modules/contacts/ContactsPage';
import { DashboardPage } from '@/modules/dashboard/DashboardPage';
import { ReportsPage } from '@/modules/dashboard/ReportsPage';
import { DealsPage } from '@/modules/deals/DealsPage';
import { SettingsPage } from '@/modules/settings/SettingsPage';
import { TasksPage } from '@/modules/tasks/TasksPage';
import { UsersPage } from '@/modules/users/UsersPage';

/* One route per module. Adding a module is an entry here plus one in
   layout/navigation.ts — nothing else in the app needs to know about it. */

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        {/* Detail views are routes, not drawers: a record you can send someone
            a link to is worth more than one that only exists over a list. */}
        <Route path="contacts/:id" element={<ContactDetailPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="companies/:id" element={<CompanyDetailPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route
          path="reports"
          element={
            <RequireRole action="reports.view">
              <ReportsPage />
            </RequireRole>
          }
        />
        <Route
          path="users"
          element={
            <RequireRole action="users.view">
              <UsersPage />
            </RequireRole>
          }
        />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
