import { useState } from 'react';
import { useSettingsQuery } from '../hooks/useSettings';
import { SettingRow } from '../components/SettingRow';
import { EditSettingDialog } from '../components/EditSettingDialog';
import { QueryState } from '../../../components/states/QueryState';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import type { SettingResponse } from '../types/setting.types';

const th = 'py-2 px-3 text-left font-medium text-text-secondary border-b border-gov-border';

export default function SettingsPage() {
  const query = useSettingsQuery();
  const settings = query.data ?? [];
  const [editing, setEditing] = useState<SettingResponse | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">System Settings</h1>
        <p className="text-text-secondary mt-1">
          View and update platform configuration values.
        </p>
      </div>

      <Card className="border-gov-border">
        <CardHeader>
          <CardTitle className="text-lg text-text-primary">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={settings.length === 0}
            onRetry={() => query.refetch()}
            emptyMessage="No settings configured."
            skeletonRows={8}
          >
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Key</th>
                  <th className={th}>Value</th>
                  <th className={th}>Type</th>
                  <th className={th}>Description</th>
                  <th className={th}>Updated</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((s) => (
                  <SettingRow key={s.key} setting={s} onEdit={setEditing} />
                ))}
              </tbody>
            </table>
          </QueryState>
        </CardContent>
      </Card>

      <EditSettingDialog
        setting={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}
