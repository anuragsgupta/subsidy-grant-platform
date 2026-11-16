import { Link, useLocation } from 'react-router-dom';

const ROUTE_LABEL_MAP: Record<string, string> = {
  'dashboard':      'Dashboard',
  'admin':          'Administration',
  'users':          'Users',
  'new':            'New',
  'regions':        'Regions',
  'settings':       'Settings',
  'audit':          'Audit Logs',
  'schemes':        'Schemes',
  'beneficiaries':  'Beneficiaries',
  'applications':   'Applications',
  'verification':   'Verification',
  'disbursement':   'Disbursement',
  'compliance':     'Compliance',
  'analytics':      'Analytics',
  'profile':        'Profile',
  'beneficiary':    'Beneficiary',
};

interface BreadcrumbItem {
  label: string;
  href: string | null;
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  const items: BreadcrumbItem[] = segments.map((seg, idx) => ({
    label: ROUTE_LABEL_MAP[seg] ?? seg,
    href: '/' + segments.slice(0, idx + 1).join('/'),
  }));

  // Truncate middle segments if more than 4
  let displayed: BreadcrumbItem[];
  if (items.length > 4) {
    displayed = [
      items[0],
      { label: '…', href: null },
      items[items.length - 2],
      items[items.length - 1],
    ];
  } else {
    displayed = items;
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-text-secondary" aria-label="Breadcrumb">
      <Link to="/dashboard" className="hover:text-text-primary transition-colors">
        Home
      </Link>
      {displayed.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1">
          <span className="text-gov-border">/</span>
          {idx === displayed.length - 1 || item.href === null ? (
            <span className="text-text-primary font-medium">{item.label}</span>
          ) : (
            <Link to={item.href} className="hover:text-text-primary transition-colors">
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
