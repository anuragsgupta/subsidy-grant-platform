import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, UserCog, Map as MapIcon } from 'lucide-react';
import { useUserQuery, useUserRolesQuery } from '../hooks/useUsers';
import { useRolesQuery } from '../../roles/hooks/useRoles';
import { useRegionsQuery } from '../../regions/hooks/useRegions';
import { StatusChangeDialog } from '../components/StatusChangeDialog';
import { ChangeRoleDialog } from '../components/ChangeRoleDialog';
import { ChangeRegionsDialog } from '../components/ChangeRegionsDialog';
import { QueryState } from '../../../components/states/QueryState';
import { EmptyState } from '../../../components/states/EmptyState';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { formatDate } from '../../../lib/utils';
import { ApiError } from '../../../services/api-client';

const fieldTh = 'py-2 pr-4 text-text-secondary font-medium text-sm align-top w-40';
const fieldTd = 'py-2 text-text-primary text-sm';

export default function UserDetailPage() {
  const { id = '' } = useParams();
  const userQuery = useUserQuery(id);
  const userRolesQuery = useUserRolesQuery(id);
  const regionsQuery = useRegionsQuery();
  const rolesQuery = useRolesQuery();

  const [statusOpen, setStatusOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [regionsOpen, setRegionsOpen] = useState(false);

  const user = userQuery.data;
  const regionMap = new Map((regionsQuery.data ?? []).map((r) => [r.id, r.name]));
  const currentRoleId = rolesQuery.data?.find((r) => r.name === user?.role)?.id;

  const isNotFound =
    userQuery.isError &&
    userQuery.error instanceof ApiError &&
    userQuery.error.errorCode === 'RESOURCE_NOT_FOUND';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={16} /> Back to users
        </Link>
        <h1 className="text-2xl font-semibold text-text-primary mt-2">User details</h1>
      </div>

      {isNotFound ? (
        <Card className="border-gov-border">
          <CardContent>
            <EmptyState message="User not found." />
          </CardContent>
        </Card>
      ) : (
        <QueryState
          isLoading={userQuery.isLoading}
          isError={userQuery.isError}
          error={userQuery.error}
          isEmpty={!user}
          onRetry={() => userQuery.refetch()}
          skeletonRows={6}
        >
          {user && (
            <div className="flex flex-col gap-4">
              <Card className="border-gov-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg text-text-primary">{user.fullName}</CardTitle>
                    <p className="text-sm text-text-secondary mt-1">@{user.username}</p>
                  </div>
                  {user.active ? (
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
                </CardHeader>
                <CardContent>
                  <table>
                    <tbody>
                      <tr>
                        <td className={fieldTh}>Email</td>
                        <td className={fieldTd}>{user.email}</td>
                      </tr>
                      <tr>
                        <td className={fieldTh}>Phone</td>
                        <td className={fieldTd}>{user.phone ?? '—'}</td>
                      </tr>
                      <tr>
                        <td className={fieldTh}>Role</td>
                        <td className={fieldTd}>{user.role ?? '—'}</td>
                      </tr>
                      <tr>
                        <td className={fieldTh}>Regions</td>
                        <td className={fieldTd}>
                          {user.regionIds.length === 0
                            ? '—'
                            : user.regionIds
                                .map((rid) => regionMap.get(rid) ?? `#${rid}`)
                                .join(', ')}
                        </td>
                      </tr>
                      <tr>
                        <td className={fieldTh}>Created</td>
                        <td className={fieldTd}>{formatDate(user.createdAt, 'dd MMM yyyy')}</td>
                      </tr>
                      <tr>
                        <td className={fieldTh}>Updated</td>
                        <td className={fieldTd}>{formatDate(user.updatedAt, 'dd MMM yyyy')}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex flex-wrap gap-2 mt-6">
                    <Button
                      variant={user.active ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => setStatusOpen(true)}
                    >
                      {user.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRoleOpen(true)}>
                      <UserCog size={16} /> Change role
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRegionsOpen(true)}>
                      <MapIcon size={16} /> Manage regions
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gov-border">
                <CardHeader>
                  <CardTitle className="text-base text-text-primary">Assigned role(s)</CardTitle>
                </CardHeader>
                <CardContent>
                  <QueryState
                    isLoading={userRolesQuery.isLoading}
                    isError={userRolesQuery.isError}
                    error={userRolesQuery.error}
                    isEmpty={(userRolesQuery.data ?? []).length === 0}
                    onRetry={() => userRolesQuery.refetch()}
                    emptyMessage="No roles assigned."
                    skeletonRows={2}
                  >
                    <div className="flex flex-wrap gap-2">
                      {(userRolesQuery.data ?? []).map((r) => (
                        <Badge key={r.id} variant="secondary">
                          {r.name}
                        </Badge>
                      ))}
                    </div>
                  </QueryState>
                </CardContent>
              </Card>
            </div>
          )}
        </QueryState>
      )}

      {user && (
        <>
          <StatusChangeDialog
            userId={user.id}
            fullName={user.fullName}
            active={!user.active}
            open={statusOpen}
            onOpenChange={setStatusOpen}
          />
          <ChangeRoleDialog
            userId={user.id}
            currentRoleId={currentRoleId}
            open={roleOpen}
            onOpenChange={setRoleOpen}
          />
          <ChangeRegionsDialog
            userId={user.id}
            currentRegionIds={user.regionIds}
            open={regionsOpen}
            onOpenChange={setRegionsOpen}
          />
        </>
      )}
    </div>
  );
}
