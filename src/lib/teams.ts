import type { Team, User } from '@/data/types';

/* Team scoping. Like rbac.ts this hides UI rather than securing anything: a
   team decides which modules a user is shown, not which data they may read.

   Admins and the management team see every module, and so does a user with no
   team set — that keeps existing users (and a fresh install's lone admin)
   exactly as they were before teams existed. */

export const TEAMS: { value: Team; label: string; description: string }[] = [
  {
    value: 'sales',
    label: 'Sales',
    description: 'Leads, customers, the pipeline, quotations, sales orders and sales reporting.',
  },
  {
    value: 'operations',
    label: 'Operations',
    description: 'Suppliers, products, purchasing, inventory, warehouses, shipments and documents.',
  },
  {
    value: 'finance',
    label: 'Finance',
    description: 'Payments, expenses, receivables, payables, profit, plus sales and purchase figures.',
  },
  {
    value: 'management',
    label: 'Management',
    description: 'Every module, for leadership who need the whole picture.',
  },
];

export const teamLabel: Record<Team, string> = Object.fromEntries(
  TEAMS.map((team) => [team.value, team.label]),
) as Record<Team, string>;

/** Does this user see a module owned by `teams`? An unscoped module is everyone's. */
export function onTeam(user: Pick<User, 'role' | 'team'> | null | undefined, teams?: Team[]): boolean {
  if (!teams || teams.length === 0) return true;
  if (!user) return false;
  if (user.role === 'admin' || !user.team || user.team === 'management') return true;
  return teams.includes(user.team);
}
