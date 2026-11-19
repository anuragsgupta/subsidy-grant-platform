import { z } from 'zod';
import type { SettingValueType } from '../types/setting.types';

/**
 * Returns a Zod schema for the single setting `value` field, validated
 * against the setting's `valueType`. Every branch yields a string-typed
 * field so the inferred form type is `{ value: string }`.
 */
export function updateSettingSchema(valueType: SettingValueType) {
  const value =
    valueType === 'INT'
      ? z.string().regex(/^-?\d+$/, 'Must be a whole number')
      : valueType === 'MONEY'
        ? z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Must be a valid amount')
        : valueType === 'BOOL'
          ? z.string().regex(/^(true|false)$/, 'Select enabled or disabled')
          : z.string().min(1, 'Value is required'); // ENUM
  return z.object({ value });
}
