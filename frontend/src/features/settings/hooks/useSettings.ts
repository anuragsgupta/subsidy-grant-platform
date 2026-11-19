import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingService } from '../services/setting.service';
import type { UpdateSettingRequest } from '../types/setting.types';

/** Query keys for the settings feature. */
export const settingKeys = {
  all: ['settings'] as const,
  list: ['settings', 'list'] as const,
};

/** Cached list of all system settings. */
export function useSettingsQuery() {
  return useQuery({
    queryKey: settingKeys.list,
    queryFn: () => settingService.getAllSettings(),
  });
}

export function useUpdateSettingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: UpdateSettingRequest['value'] }) =>
      settingService.updateSetting(key, { value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingKeys.all }),
  });
}
