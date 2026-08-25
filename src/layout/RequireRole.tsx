import type { ReactNode } from 'react';
import { can, type Action } from '@/lib/rbac';
import { useSession } from '@/data/useSession';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';

/* Route-level role gate. Demo-only, like every other role check here: it hides
   UI, it does not secure data (CONTEXT.md §0). */

export function RequireRole({ action, children }: { action: Action; children: ReactNode }) {
  const { user, loading } = useSession();

  if (loading) return null;
  if (can(user, action)) return <>{children}</>;

  return (
    <Card>
      <EmptyState
        title="Admins only"
        description="Your role does not include this area. Switch to an admin user in the top bar to see it."
      />
    </Card>
  );
}
