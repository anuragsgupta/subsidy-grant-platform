import { apiClient } from '../../../services/api-client';
import type { SettingResponse, UpdateSettingRequest } from '../types/setting.types';

/** GET /api/v1/settings — ADMIN only. */
async function getAllSettings(): Promise<SettingResponse[]> {
  const response = await apiClient.get<SettingResponse[]>('/settings');
  return response.data;
}

/** PUT /api/v1/settings/{key} — ADMIN only. */
async function updateSetting(
  key: string,
  data: UpdateSettingRequest,
): Promise<SettingResponse> {
  const response = await apiClient.put<SettingResponse>(`/settings/${key}`, data);
  return response.data;
}

export const settingService = { getAllSettings, updateSetting };
