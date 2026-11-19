export type SchemeStatus = 'DRAFT' | 'OPEN' | 'PAUSED' | 'CLOSED';
export interface SchemeSummary {
  id: string;
  name: string;
  code: string;
  description: string | null;
  minGrantAmount: number;
  maxGrantAmount: number;
  status: SchemeStatus;
}
export interface Scheme extends SchemeSummary {
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  criteria?: Array<{ id: string; description: string; attribute?: string; operator?: string; threshold?: string; mandatory?: boolean }>;
  milestoneTemplates?: Array<{ id: string; name: string; sequence: number; tranchePercentage: number; dueDays: number }>;
}