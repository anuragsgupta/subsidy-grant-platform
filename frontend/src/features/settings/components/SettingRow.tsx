import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { formatDate } from '../../../lib/utils';
import type { SettingResponse } from '../types/setting.types';

interface SettingRowProps {
  setting: SettingResponse;
  onEdit: (setting: SettingResponse) => void;
}

const td = 'py-2 px-3 border-b border-gov-border/60';

export function SettingRow({ setting, onEdit }: SettingRowProps) {
  return (
    <tr className="hover:bg-gov-blue/5">
      <td className={`${td} font-mono text-xs text-text-primary`}>{setting.key}</td>
      <td className={`${td} font-medium text-text-primary`}>{setting.value}</td>
      <td className={td}>
        <Badge variant="secondary">{setting.valueType}</Badge>
      </td>
      <td className={`${td} text-text-secondary`}>{setting.description ?? '—'}</td>
      <td className={`${td} text-text-secondary`}>
        {formatDate(setting.updatedAt, 'dd MMM yyyy')}
      </td>
      <td className={`${td} text-right`}>
        <Button variant="outline" size="sm" onClick={() => onEdit(setting)}>
          Edit
        </Button>
      </td>
    </tr>
  );
}
