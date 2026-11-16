import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';

export function AccessDeniedPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <ShieldX size={48} className="text-text-secondary mb-4" />
      <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
      <p className="text-text-secondary mb-6 max-w-md">
        You do not have permission to view this page. If you believe this is an error,
        please contact your administrator.
      </p>
      <Link to="/">
        <Button variant="outline">Go to Dashboard</Button>
      </Link>
    </div>
  );
}
