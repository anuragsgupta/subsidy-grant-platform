import type { ApplicationStatus } from '../types/application.types';
import type { UserRole } from '../../../types/auth';

export type WorkflowAction = 'approve' | 'reject' | 'clarification';
export function statusForAction(status: ApplicationStatus, role: UserRole, action: WorkflowAction): ApplicationStatus | null {
  if (action === 'reject') return ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED', 'FIELD_VERIFIED', 'DISTRICT_APPROVED', 'FINANCE_APPROVED', 'ON_HOLD'].includes(status) ? 'REJECTED' : null;
  if (action === 'clarification') return role === 'FIELD_OFFICER' && status === 'UNDER_REVIEW' ? 'CLARIFICATION_REQUIRED' : null;
  if (role === 'FIELD_OFFICER' && status === 'UNDER_REVIEW') return 'FIELD_VERIFIED';
  if (role === 'DISTRICT_OFFICER' && status === 'FIELD_VERIFIED') return 'DISTRICT_APPROVED';
  if (role === 'FINANCE_APPROVER' && status === 'DISTRICT_APPROVED') return 'FINANCE_APPROVED';
  if (role === 'ADMIN' && status === 'SUBMITTED') return 'UNDER_REVIEW';
  return null;
}

export function currentLevel(status: ApplicationStatus): string {
  if (['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED'].includes(status)) return 'FIELD';
  if (status === 'FIELD_VERIFIED') return 'DISTRICT';
  if (status === 'DISTRICT_APPROVED') return 'FINANCE';
  return '—';
}