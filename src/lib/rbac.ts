import type { Role, User } from '@/data/types';

/* Role gates. Demo-only: this hides UI, it does not secure anything — there is
   no server to enforce against yet (CONTEXT.md §0). When a real backend lands,
   these same action names become the permission checks on the API side. */

export type Action =
  | 'contacts.view'
  | 'contacts.edit'
  | 'contacts.delete'
  | 'companies.view'
  | 'companies.edit'
  | 'companies.delete'
  | 'deals.view'
  | 'deals.edit'
  | 'deals.delete'
  | 'tasks.view'
  | 'tasks.edit'
  | 'reports.view'
  | 'users.view'
  | 'users.manage'
  | 'settings.view'
  | 'settings.manage';

const SALES_REP: ReadonlySet<Action> = new Set<Action>([
  'contacts.view',
  'contacts.edit',
  'companies.view',
  'companies.edit',
  'deals.view',
  'deals.edit',
  'tasks.view',
  'tasks.edit',
  'settings.view',
]);

/** Admins can do everything; reps get the working set above. */
export function can(user: Pick<User, 'role'> | null | undefined, action: Action): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return SALES_REP.has(action);
}

export const roleLabel: Record<Role, string> = {
  admin: 'Admin',
  sales_rep: 'Sales Rep',
};
