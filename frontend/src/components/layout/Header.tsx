import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, Loader2 } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABELS } from '../../types/auth';

export function Header() {
  const { user, isInitializing, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // While the session is initializing, show a minimal skeleton
  if (isInitializing || !user) {
    return (
      <header className="h-16 bg-card-bg border-b border-gov-border flex items-center px-6 flex-shrink-0">
        <Breadcrumbs />
        <div className="ml-auto flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-text-secondary" />
        </div>
      </header>
    );
  }

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-16 bg-card-bg border-b border-gov-border flex items-center px-6 flex-shrink-0">
      <Breadcrumbs />
      <div className="ml-auto relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gov-blue/5 transition-colors"
          aria-label="User menu"
        >
          <div className="w-8 h-8 rounded-full bg-gov-blue flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-text-primary leading-tight">{user.fullName}</p>
            <p className="text-xs text-text-secondary leading-tight">{ROLE_LABELS[user.role]}</p>
          </div>
          <ChevronDown size={16} className="text-text-secondary" />
        </button>

        {menuOpen && (
          <>
            {/* Click-away overlay */}
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-card-bg border border-gov-border rounded-md shadow-lg z-50">
              <div className="px-3 py-2 border-b border-gov-border">
                <p className="text-sm font-medium text-text-primary truncate">{user.fullName}</p>
                <p className="text-xs text-text-secondary truncate">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-gov-blue/5 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
