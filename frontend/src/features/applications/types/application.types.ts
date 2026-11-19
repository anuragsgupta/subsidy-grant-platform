export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CLARIFICATION_REQUIRED' | 'FIELD_VERIFIED' | 'DISTRICT_APPROVED' | 'FINANCE_APPROVED' | 'DISBURSEMENT_IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'REJECTED' | 'AUTO_REJECTED';
export interface ApplicationSummary {
  id: string;
  referenceNo: string;
  beneficiaryId: string;
  beneficiaryFullName: string;
  schemeId: string;
  schemeCode: string;
  requestedAmount: number;
  status: ApplicationStatus;
  createdAt: string;
}
export interface Application extends ApplicationSummary {
  schemeName: string;
  submittedAt: string | null;
  updatedAt: string;
  eligibilityScore?: number | null;
  eligibilityDecision?: 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING' | 'CLARIFICATION_REQUIRED';
  eligibilityExplanation?: string[];
  verificationLevel?: string | null;
  auditHistory?: AuditEvent[];
}
export interface CreateApplicationRequest {
  beneficiaryId: string;
  schemeId: string;
  referenceNo: string;
  requestedAmount: number;
}
export interface AuditEvent {
  id: number | string;
  occurredAt: string;
  actorRole: string;
  action: string;
  entityType: string;
  remark: string | null;
  newValue?: unknown;
}