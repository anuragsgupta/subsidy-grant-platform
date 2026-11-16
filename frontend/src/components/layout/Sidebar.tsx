import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  ClipboardList,
  CheckSquare,
  Banknote,
  ShieldCheck,
  BarChart2,
  UserCog,
  Map,
  Settings,
  FileSearch,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     href: '/dashboard',           icon: LayoutDashboard },
  { label: 'Schemes',       href: '/schemes',             icon: FileText },
  { label: 'Beneficiaries', href: '/admin/beneficiaries', icon: Users },
  { label: 'Applications',  href: '/applications',        icon: ClipboardList },
  { label: 'Verification',  href: '/verification',        icon: CheckSquare,  comingSoon: true },
  { label: 'Disbursement',  href: '/disbursement',        icon: Banknote,     comingSoon: true },
  { label: 'Compliance',    href: '/compliance',          icon: ShieldCheck,  comingSoon: true },
  { label: 'Analytics',     href: '/analytics',           icon: BarChart2,    comingSoon: true },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Users',      href: '/admin/users',    icon: UserCog },
  { label: 'Regions',    href: '/admin/regions',  icon: Map },
  { label: 'Settings',   href: '/admin/settings', icon: Settings },
  { label: 'Audit Logs', href: '/admin/audit',    icon: FileSearch },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

interface SidebarLinkProps {
  item: NavItem;
  collapsed: boolean;
}

function SidebarLink({ item, collapsed }: SidebarLinkProps) {
  const { pathname } = useLocation();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  const linkContent = (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        'border border-gov-border',
        active
          ? 'bg-gov-blue text-white border-gov-blue'
          : 'text-text-secondary hover:bg-gov-blue/10 hover:text-text-primary border-transparent'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={20} className="flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.comingSoon && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Soon
            </Badge>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">
          <span>{item.label}</span>
          {item.comingSoon && <span className="ml-1 text-muted-foreground">(Coming Soon)</span>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem('gsdts_sidebar_collapsed') === 'true'
  );

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('gsdts_sidebar_collapsed', String(next));
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen bg-primary-navy border-r border-gov-border flex-shrink-0',
          'transition-[width] duration-200 ease-in-out overflow-hidden',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo / wordmark */}
        <div
          className={cn(
            'flex items-center border-b border-gov-border flex-shrink-0',
            collapsed ? 'justify-center px-0 py-5' : 'gap-2 px-4 py-5'
          )}
        >
          <div className="w-8 h-8 rounded bg-gov-blue flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">G</span>
          </div>
          {!collapsed && (
            <span className="text-white font-bold text-base tracking-wide select-none">
              GSDTS
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} collapsed={collapsed} />
          ))}

          {/* Admin section divider */}
          <div className="my-2 border-t border-gov-border/40" />

          {!collapsed && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/60">
              Administration
            </p>
          )}

          {ADMIN_ITEMS.map((item) => (
            <SidebarLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="flex-shrink-0 p-2 border-t border-gov-border/40">
          <button
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-text-secondary hover:bg-gov-blue/10 hover:text-text-primary transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight size={18} className="text-white/60" />
            ) : (
              <>
                <ChevronLeft size={18} className="text-white/60" />
                <span className="text-white/60 text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
