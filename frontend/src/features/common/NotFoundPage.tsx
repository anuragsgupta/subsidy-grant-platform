import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-text-primary">Page Not Found</h1>
      <Card className="border-gov-border">
        <CardContent className="pt-6">
          <p className="text-text-secondary mb-4">The page you are looking for does not exist.</p>
          <Link to="/dashboard" className="text-gov-blue hover:underline">
            Return to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
