import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Card>
      <EmptyState
        title="That page does not exist"
        description="The link may be out of date, or the record may have been deleted."
        action={
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to dashboard
          </Button>
        }
      />
    </Card>
  );
}
