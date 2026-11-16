import { User } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';

export function Header() {
  return (
    <header className="h-16 bg-card-bg border-b border-gov-border flex items-center px-6 flex-shrink-0">
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-text-secondary">User</span>
        <div className="w-8 h-8 rounded-full bg-gov-blue flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    </header>
  );
}
