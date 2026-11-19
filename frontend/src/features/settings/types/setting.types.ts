/** Mirrors SettingValueType.java. */
export type SettingValueType = 'INT' | 'MONEY' | 'ENUM' | 'BOOL';

/** Mirrors SettingResponse.java. */
export interface SettingResponse {
  key: string;
  value: string;
  valueType: SettingValueType;
  description: string | null;
  updatedBy: string | null; // UUID
  createdAt: string; // ISO-8601 instant
  updatedAt: string; // ISO-8601 instant
}

/** Mirrors UpdateSettingRequest.java. */
export interface UpdateSettingRequest {
  value: string; // NotBlank
}
