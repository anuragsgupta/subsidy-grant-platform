import { useState } from 'react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useUsersQuery } from '../hooks/useUsers';
import { UserFilters } from '../components/UserFilters';
import type { ActiveFilter } from '../components/UserFilters';
import { UserTable } from '../components/UserTable';
import { Pagination } from '../../../components/common/Pagination';
import { QueryState } from '../../../components/states/QueryState';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import type { UserListParams } from '../types/user.types';

export default function UserListPage() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('ALL');
  const [active, setActive] = useState<ActiveFilter>('ALL');
  const [page, setPage] = useState(0);
  const [size] = useState(20);

  const debouncedQ = useDebouncedValue(q, 400);

  const params: UserListParams = {
    q: debouncedQ.trim() || undefined,
    role: role === 'ALL' ? undefined : role,
    active: active === 'ALL' ? undefined : active === 'ACTIVE',
    page,
    size,
  };

  const query = useUsersQuery(params);
  const users = query.data?.content ?? [];
  const totalElements = query.data?.totalElements ?? 0;
  const totalPages = query.data?.totalPages ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Users</h1>
        <p className="text-text-secondary mt-1">Manage staff user accounts.</p>
      </div>

      <Card className="border-gov-border">
        <CardHeader>
          <CardTitle className="text-lg text-text-primary">User accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <UserFilters
            q={q}
            onQChange={(v) => {
              setPage(0);
              setQ(v);
            }}
            role={role}
            onRoleChange={(v) => {
              setPage(0);
              setRole(v);
            }}
            active={active}
            onActiveChange={(v) => {
              setPage(0);
              setActive(v);
            }}
          />

          <QueryState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={users.length === 0}
            onRetry={() => query.refetch()}
            emptyMessage="No users match the filters."
            skeletonRows={8}
          >
            <UserTable users={users} />
            <Pagination
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              onPageChange={setPage}
            />
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
