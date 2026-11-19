import { Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useRolesQuery } from '../../roles/hooks/useRoles';

export type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface UserFiltersProps {
  q: string;
  onQChange: (v: string) => void;
  role: string;
  onRoleChange: (v: string) => void;
  active: ActiveFilter;
  onActiveChange: (v: ActiveFilter) => void;
}

/** Search box + role/status filters for the user list. */
export function UserFilters({
  q,
  onQChange,
  role,
  onRoleChange,
  active,
  onActiveChange,
}: UserFiltersProps) {
  const { data: roles = [] } = useRolesQuery();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary"
          size={16}
          aria-hidden="true"
        />
        <Input
          className="pl-8 w-64"
          placeholder="Search name or email"
          value={q}
          onChange={(e) => onQChange(e.target.value)}
          aria-label="Search users"
        />
      </div>

      <div className="w-48">
        <Select value={role} onValueChange={onRoleChange} aria-label="Filter by role">
          <SelectTrigger>
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.name}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-40">
        <Select
          value={active}
          onValueChange={(v) => onActiveChange(v as ActiveFilter)}
          aria-label="Filter by status"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
