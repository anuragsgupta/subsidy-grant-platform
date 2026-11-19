import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/badge';
import type { UserSummaryResponse } from '../types/user.types';

const th = 'py-2 px-3 text-left font-medium text-text-secondary border-b border-gov-border';
const td = 'py-2 px-3 border-b border-gov-border/60';

interface UserTableProps {
  users: UserSummaryResponse[];
}

/** User list table — clicking a row opens the user detail page. */
export function UserTable({ users }: UserTableProps) {
  const navigate = useNavigate();

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={th}>Full name</th>
          <th className={th}>Username</th>
          <th className={th}>Email</th>
          <th className={th}>Role</th>
          <th className={th}>Status</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr
            key={u.id}
            className="cursor-pointer hover:bg-gov-blue/5"
            onClick={() => navigate(`/admin/users/${u.id}`)}
          >
            <td className={`${td} font-medium text-text-primary`}>{u.fullName}</td>
            <td className={td}>{u.username}</td>
            <td className={td}>{u.email}</td>
            <td className={td}>{u.role ?? '—'}</td>
            <td className={td}>
              {u.active ? (
                <Badge
                  variant="outline"
                  className="border-status-green/30 bg-status-green/10 text-status-green"
                >
                  Active
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-status-grey/30 bg-status-grey/10 text-status-grey"
                >
                  Inactive
                </Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
