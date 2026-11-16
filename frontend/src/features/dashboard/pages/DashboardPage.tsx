import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

const NAV_SECTIONS = [
  { name: 'Schemes',        description: 'Manage subsidy schemes, criteria, and budgets' },
  { name: 'Beneficiaries',  description: 'Register and manage beneficiary profiles' },
  { name: 'Applications',   description: 'Track applications through the workflow' },
  { name: 'Verification',   description: 'Field and district verification workflow (Coming Soon)' },
  { name: 'Disbursement',   description: 'Tranche release and payment tracking (Coming Soon)' },
  { name: 'Compliance',     description: 'Milestone compliance and flags (Coming Soon)' },
  { name: 'Analytics',      description: 'Reports and utilization analytics (Coming Soon)' },
  { name: 'Administration', description: 'Users, regions, settings, and audit logs' },
];

export default function DashboardPage() {
  const location = useLocation();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Government Subsidy &amp; Grant Disbursement Tracking System
        </h1>
        <p className="text-text-secondary mt-1">
          Welcome to GSDTS — Current route:{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
            {location.pathname}
          </code>
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {NAV_SECTIONS.map((section) => (
          <Card
            key={section.name}
            className="border-gov-border hover:shadow-sm transition-shadow"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-text-primary">{section.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">{section.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
