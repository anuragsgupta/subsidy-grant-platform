import { describe, expect, it } from 'vitest';
import { currentLevel, statusForAction } from '../services/workflow-adapter';

describe('workflow adapter', () => {
  it('allows role-appropriate approval transitions only', () => {
    expect(statusForAction('UNDER_REVIEW', 'FIELD_OFFICER', 'approve')).toBe('FIELD_VERIFIED');
    expect(statusForAction('FIELD_VERIFIED', 'DISTRICT_OFFICER', 'approve')).toBe('DISTRICT_APPROVED');
    expect(statusForAction('DISTRICT_APPROVED', 'FINANCE_APPROVER', 'approve')).toBe('FINANCE_APPROVED');
    expect(statusForAction('COMPLETED', 'ADMIN', 'approve')).toBeNull();
    expect(statusForAction('SUBMITTED', 'BENEFICIARY', 'approve')).toBeNull();
  });
  it('permits rejection and clarification only for valid workflow states', () => {
    expect(statusForAction('SUBMITTED', 'ADMIN', 'reject')).toBe('REJECTED');
    expect(statusForAction('UNDER_REVIEW', 'FIELD_OFFICER', 'clarification')).toBe('CLARIFICATION_REQUIRED');
    expect(statusForAction('COMPLETED', 'ADMIN', 'reject')).toBeNull();
    expect(statusForAction('FIELD_VERIFIED', 'FIELD_OFFICER', 'clarification')).toBeNull();
  });
  it('maps current status to a display level without claiming backend assignment', () => {
    expect(currentLevel('UNDER_REVIEW')).toBe('FIELD');
    expect(currentLevel('FIELD_VERIFIED')).toBe('DISTRICT');
    expect(currentLevel('DISTRICT_APPROVED')).toBe('FINANCE');
    expect(currentLevel('COMPLETED')).toBe('—');
  });
});