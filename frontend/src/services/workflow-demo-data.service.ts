/**
 * workflow-demo-data.service.ts
 *
 * Static fixture data and helper functions for the GSDTS frontend Phase 5
 * (Eligibility Assessment and Multi-Step Verification).
 * All data is in-memory. No real API calls are made from this module.
 */

import type { WorkflowStage } from './demo-data.service';

// Re-export for convenience
export type { WorkflowStage };

// ---------------------------------------------------------------------------
// Enums / union types
// ---------------------------------------------------------------------------

export type CriterionAttribute =
  | 'AGE'
  | 'ANNUAL_INCOME'
  | 'LAND_HOLDING'
  | 'GENDER'
  | 'SOCIAL_CATEGORY'
  | 'IS_DISABLED'
  | 'BENEFICIARY_TYPE'
  | 'REGION';

export type CriterionOperator =
  | 'EQ'
  | 'NEQ'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'BETWEEN'
  | 'IN'
  | 'NOT_IN';

export type AssessmentDecision =
  | 'ELIGIBLE'
  | 'INELIGIBLE'
  | 'REQUIRES_MANUAL_REVIEW'
  | 'INCOMPLETE_INFORMATION';

export type FieldFinding = 'NONE' | 'MINOR_MISMATCH' | 'MAJOR_MISMATCH';

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

export type VerificationRecommendation = 'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface WorkflowCriterion {
  id: string;
  attribute: CriterionAttribute;
  operator: CriterionOperator;
  threshold: string;
  weight: number;
  mandatory: boolean;
  description: string;
}

export interface WorkflowCriterionResult {
  criterionId: string;
  description: string;
  attribute: CriterionAttribute;
  operator: CriterionOperator;
  threshold: string;
  mandatory: boolean;
  passed: boolean;
  pointsAwarded: number;
  beneficiaryValue: string;
}

export interface WorkflowAssessment {
  id: string;
  applicationId: string;
  applicationRef: string;
  schemeId: string;
  schemeName: string;
  beneficiaryName: string;
  decision: AssessmentDecision;
  score: number;
  autoRejected: boolean;
  riskTier: RiskTier;
  assessedAt: string;
  criterionResults: WorkflowCriterionResult[];
  failedMandatoryDescriptions: string[];
  missingAttributes: string[];
}

export interface WorkflowHistoryEvent {
  stage: WorkflowStage;
  transitionDate: string;
  remark?: string;
  actorName?: string;
}

export interface WorkflowVerificationTask {
  id: string;
  applicationId: string;
  applicationRef: string;
  beneficiaryName: string;
  schemeName: string;
  requestedAmount: number;
  currentStage: WorkflowStage;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  regionId?: number;
  regionName?: string;
  submissionDate: string;
  fieldFinding?: FieldFinding;
  fieldRemarks?: string;
  fieldEvidence?: string;
  fieldRecommendation?: VerificationRecommendation;
  fieldOfficerName?: string;
  fieldVerifiedAt?: string;
  history: WorkflowHistoryEvent[];
}

// ---------------------------------------------------------------------------
// Scheme criteria fixtures
// ---------------------------------------------------------------------------

const SCHEME_CRITERIA: Record<string, WorkflowCriterion[]> = {
  'sch-001': [
    { id: 'crit-001', attribute: 'AGE', operator: 'GTE', threshold: '18', weight: 3, mandatory: true, description: 'Applicant must be at least 18 years old.' },
    { id: 'crit-002', attribute: 'ANNUAL_INCOME', operator: 'LTE', threshold: '300000', weight: 4, mandatory: true, description: 'Annual income must not exceed Rs 3,00,000.' },
    { id: 'crit-003', attribute: 'LAND_HOLDING', operator: 'GTE', threshold: '1', weight: 2, mandatory: false, description: 'Preferential for applicants with at least 1 acre of land.' },
  ],
  'sch-002': [
    { id: 'crit-004', attribute: 'BENEFICIARY_TYPE', operator: 'EQ', threshold: 'INDIVIDUAL', weight: 3, mandatory: true, description: 'Applicant must be an individual beneficiary.' },
    { id: 'crit-005', attribute: 'ANNUAL_INCOME', operator: 'LTE', threshold: '250000', weight: 5, mandatory: true, description: 'Annual income must not exceed Rs 2,50,000.' },
  ],
  'sch-003': [
    { id: 'crit-006', attribute: 'BENEFICIARY_TYPE', operator: 'IN', threshold: 'ORGANIZATION,BUSINESS', weight: 3, mandatory: true, description: 'Must be an organization or business.' },
    { id: 'crit-007', attribute: 'IS_DISABLED', operator: 'EQ', threshold: 'FALSE', weight: 1, mandatory: false, description: 'Non-disabled applicants receive standard processing.' },
  ],
  'sch-004': [
    { id: 'crit-008', attribute: 'AGE', operator: 'GTE', threshold: '18', weight: 3, mandatory: true, description: 'Applicant must be at least 18 years old.' },
    { id: 'crit-009', attribute: 'ANNUAL_INCOME', operator: 'LTE', threshold: '250000', weight: 5, mandatory: true, description: 'Annual income must not exceed Rs 2,50,000.' },
  ],
};

// ---------------------------------------------------------------------------
// Assessment fixtures
// ---------------------------------------------------------------------------

const ASSESSMENTS: WorkflowAssessment[] = [
  {
    id: 'as-001',
    applicationId: 'app-001',
    applicationRef: 'APP-20250115-000001',
    schemeId: 'sch-002',
    schemeName: 'Rural Housing Scheme',
    beneficiaryName: 'Ramesh Kumar Verma',
    decision: 'ELIGIBLE',
    score: 85,
    autoRejected: false,
    riskTier: 'LOW',
    assessedAt: '2025-01-16T09:00:00Z',
    criterionResults: [
      { criterionId: 'crit-004', description: 'Applicant must be an individual beneficiary.', attribute: 'BENEFICIARY_TYPE', operator: 'EQ', threshold: 'INDIVIDUAL', mandatory: true, passed: true, pointsAwarded: 3, beneficiaryValue: 'INDIVIDUAL' },
      { criterionId: 'crit-005', description: 'Annual income must not exceed Rs 2,50,000.', attribute: 'ANNUAL_INCOME', operator: 'LTE', threshold: '250000', mandatory: true, passed: true, pointsAwarded: 5, beneficiaryValue: '180000' },
    ],
    failedMandatoryDescriptions: [],
    missingAttributes: [],
  },
  {
    id: 'as-002',
    applicationId: 'app-003',
    applicationRef: 'APP-20250110-000003',
    schemeId: 'sch-001',
    schemeName: 'Agricultural Modernisation Fund',
    beneficiaryName: 'Sunita Devi Sharma',
    decision: 'INELIGIBLE',
    score: 40,
    autoRejected: true,
    riskTier: 'HIGH',
    assessedAt: '2025-01-11T14:00:00Z',
    criterionResults: [
      { criterionId: 'crit-001', description: 'Applicant must be at least 18 years old.', attribute: 'AGE', operator: 'GTE', threshold: '18', mandatory: true, passed: true, pointsAwarded: 3, beneficiaryValue: '34' },
      { criterionId: 'crit-002', description: 'Annual income must not exceed Rs 3,00,000.', attribute: 'ANNUAL_INCOME', operator: 'LTE', threshold: '300000', mandatory: true, passed: false, pointsAwarded: 0, beneficiaryValue: '450000' },
      { criterionId: 'crit-003', description: 'Preferential for applicants with at least 1 acre of land.', attribute: 'LAND_HOLDING', operator: 'GTE', threshold: '1', mandatory: false, passed: true, pointsAwarded: 2, beneficiaryValue: '2.5' },
    ],
    failedMandatoryDescriptions: ['Annual income must not exceed Rs 3,00,000.'],
    missingAttributes: [],
  },
  {
    id: 'as-003',
    applicationId: 'app-005',
    applicationRef: 'APP-20250105-000005',
    schemeId: 'sch-002',
    schemeName: 'Rural Housing Scheme',
    beneficiaryName: 'Prakash Nair',
    decision: 'REQUIRES_MANUAL_REVIEW',
    score: 62,
    autoRejected: false,
    riskTier: 'MEDIUM',
    assessedAt: '2025-01-06T10:00:00Z',
    criterionResults: [
      { criterionId: 'crit-004', description: 'Applicant must be an individual beneficiary.', attribute: 'BENEFICIARY_TYPE', operator: 'EQ', threshold: 'INDIVIDUAL', mandatory: true, passed: true, pointsAwarded: 3, beneficiaryValue: 'INDIVIDUAL' },
      { criterionId: 'crit-005', description: 'Annual income must not exceed Rs 2,50,000.', attribute: 'ANNUAL_INCOME', operator: 'LTE', threshold: '250000', mandatory: true, passed: true, pointsAwarded: 5, beneficiaryValue: '240000' },
    ],
    failedMandatoryDescriptions: [],
    missingAttributes: [],
  },
  {
    id: 'as-004',
    applicationId: 'app-002',
    applicationRef: 'APP-20250116-000002',
    schemeId: 'sch-002',
    schemeName: 'Rural Housing Scheme',
    beneficiaryName: 'Meera Patel',
    decision: 'INCOMPLETE_INFORMATION',
    score: 0,
    autoRejected: false,
    riskTier: 'LOW',
    assessedAt: '2025-01-17T08:30:00Z',
    criterionResults: [
      { criterionId: 'crit-004', description: 'Applicant must be an individual beneficiary.', attribute: 'BENEFICIARY_TYPE', operator: 'EQ', threshold: 'INDIVIDUAL', mandatory: true, passed: true, pointsAwarded: 3, beneficiaryValue: 'INDIVIDUAL' },
      { criterionId: 'crit-005', description: 'Annual income must not exceed Rs 2,50,000.', attribute: 'ANNUAL_INCOME', operator: 'LTE', threshold: '250000', mandatory: true, passed: false, pointsAwarded: 0, beneficiaryValue: '' },
    ],
    failedMandatoryDescriptions: [],
    missingAttributes: ['ANNUAL_INCOME'],
  },
  {
    id: 'as-005',
    applicationId: 'app-004',
    applicationRef: 'APP-20250111-000004',
    schemeId: 'sch-001',
    schemeName: 'Agricultural Modernisation Fund',
    beneficiaryName: 'Green Valley Farmers Cooperative',
    decision: 'ELIGIBLE',
    score: 92,
    autoRejected: false,
    riskTier: 'LOW',
    assessedAt: '2025-01-12T11:00:00Z',
    criterionResults: [
      { criterionId: 'crit-001', description: 'Applicant must be at least 18 years old.', attribute: 'AGE', operator: 'GTE', threshold: '18', mandatory: true, passed: true, pointsAwarded: 3, beneficiaryValue: '42' },
      { criterionId: 'crit-002', description: 'Annual income must not exceed Rs 3,00,000.', attribute: 'ANNUAL_INCOME', operator: 'LTE', threshold: '300000', mandatory: true, passed: true, pointsAwarded: 4, beneficiaryValue: '150000' },
      { criterionId: 'crit-003', description: 'Preferential for applicants with at least 1 acre of land.', attribute: 'LAND_HOLDING', operator: 'GTE', threshold: '1', mandatory: false, passed: true, pointsAwarded: 2, beneficiaryValue: '5' },
    ],
    failedMandatoryDescriptions: [],
    missingAttributes: [],
  },
];

// ---------------------------------------------------------------------------
// Verification task fixtures
// ---------------------------------------------------------------------------

const VERIFICATION_TASKS: WorkflowVerificationTask[] = [
  {
    id: 'vt-001',
    applicationId: 'app-001',
    applicationRef: 'APP-20250115-000001',
    beneficiaryName: 'Ramesh Kumar Verma',
    schemeName: 'Rural Housing Scheme',
    requestedAmount: 200000,
    currentStage: 'FIELD_PENDING',
    assignedOfficerId: 'test-user-id',
    assignedOfficerName: 'Test Officer',
    regionId: 1,
    regionName: 'North District',
    submissionDate: '2025-01-15',
    history: [
      { stage: 'SUBMITTED', transitionDate: '2025-01-15T10:30:00Z', remark: 'Application submitted by beneficiary.', actorName: 'Ramesh Kumar Verma' },
      { stage: 'FIELD_PENDING', transitionDate: '2025-01-15T14:00:00Z', remark: 'Assigned to field officer for verification.', actorName: 'System' },
    ],
  },
  {
    id: 'vt-002',
    applicationId: 'app-002',
    applicationRef: 'APP-20250116-000002',
    beneficiaryName: 'Meera Patel',
    schemeName: 'Rural Housing Scheme',
    requestedAmount: 180000,
    currentStage: 'FIELD_PENDING',
    assignedOfficerId: 'test-user-id',
    assignedOfficerName: 'Test Officer',
    regionId: 1,
    regionName: 'North District',
    submissionDate: '2025-01-16',
    history: [
      { stage: 'SUBMITTED', transitionDate: '2025-01-16T09:15:00Z', remark: 'Application submitted.', actorName: 'Meera Patel' },
      { stage: 'FIELD_PENDING', transitionDate: '2025-01-16T12:00:00Z', remark: 'Assigned to field officer.', actorName: 'System' },
    ],
  },
  {
    id: 'vt-003',
    applicationId: 'app-003',
    applicationRef: 'APP-20250110-000003',
    beneficiaryName: 'Sunita Devi Sharma',
    schemeName: 'Agricultural Modernisation Fund',
    requestedAmount: 300000,
    currentStage: 'DISTRICT_REVIEW',
    assignedOfficerId: 'test-user-id',
    assignedOfficerName: 'Test Officer',
    regionId: 1,
    regionName: 'North District',
    submissionDate: '2025-01-10',
    fieldFinding: 'NONE',
    fieldRemarks: 'Documents verified. Land holding of 2.5 acres confirmed. Income certificate matches application. All checks passed.',
    fieldEvidence: 'DOC-001, DOC-002, PHOTO-001',
    fieldRecommendation: 'APPROVE',
    fieldOfficerName: 'Raj Kumar',
    fieldVerifiedAt: '2025-01-12T15:00:00Z',
    history: [
      { stage: 'SUBMITTED', transitionDate: '2025-01-10T08:00:00Z', remark: 'Application submitted.', actorName: 'Sunita Devi Sharma' },
      { stage: 'FIELD_PENDING', transitionDate: '2025-01-10T10:00:00Z', remark: 'Assigned to field officer.', actorName: 'System' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2025-01-12T15:00:00Z', remark: 'Field verification completed. All documents verified.', actorName: 'Raj Kumar' },
    ],
  },
  {
    id: 'vt-004',
    applicationId: 'app-005',
    applicationRef: 'APP-20250105-000005',
    beneficiaryName: 'Prakash Nair',
    schemeName: 'Rural Housing Scheme',
    requestedAmount: 240000,
    currentStage: 'DISTRICT_REVIEW',
    regionId: 1,
    regionName: 'North District',
    submissionDate: '2025-01-05',
    fieldFinding: 'MINOR_MISMATCH',
    fieldRemarks: 'Income certificate shows Rs 2,40,000 but applicant declared Rs 2,35,000. Minor discrepancy in income declaration.',
    fieldEvidence: 'DOC-003, DOC-004',
    fieldRecommendation: 'REQUEST_CLARIFICATION',
    fieldOfficerName: 'Raj Kumar',
    fieldVerifiedAt: '2025-01-08T11:00:00Z',
    history: [
      { stage: 'SUBMITTED', transitionDate: '2025-01-05T08:00:00Z', remark: 'Application submitted.', actorName: 'Prakash Nair' },
      { stage: 'FIELD_PENDING', transitionDate: '2025-01-05T10:00:00Z', remark: 'Assigned to field officer.', actorName: 'System' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2025-01-08T11:00:00Z', remark: 'Field verification found minor income mismatch. Clarification requested.', actorName: 'Raj Kumar' },
    ],
  },
  {
    id: 'vt-005',
    applicationId: 'app-006',
    applicationRef: 'APP-20250106-000006',
    beneficiaryName: 'District Agricultural Society',
    schemeName: 'Agricultural Modernisation Fund',
    requestedAmount: 500000,
    currentStage: 'FINANCE_REVIEW',
    regionId: 2,
    regionName: 'South District',
    submissionDate: '2025-01-06',
    fieldFinding: 'NONE',
    fieldRemarks: 'Organization registration verified. All documents in order. Recommending approval.',
    fieldEvidence: 'DOC-005, DOC-006, PHOTO-002',
    fieldRecommendation: 'APPROVE',
    fieldOfficerName: 'Raj Kumar',
    fieldVerifiedAt: '2025-01-09T14:00:00Z',
    history: [
      { stage: 'SUBMITTED', transitionDate: '2025-01-06T09:00:00Z', remark: 'Application submitted.', actorName: 'District Agricultural Society' },
      { stage: 'FIELD_PENDING', transitionDate: '2025-01-06T11:00:00Z', remark: 'Assigned to field officer.', actorName: 'System' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2025-01-09T14:00:00Z', remark: 'Field verification passed.', actorName: 'Raj Kumar' },
      { stage: 'FINANCE_REVIEW', transitionDate: '2025-01-10T10:00:00Z', remark: 'District officer approved. Forwarded to finance.', actorName: 'District Officer Singh' },
    ],
  },
  {
    id: 'vt-006',
    applicationId: 'app-013',
    applicationRef: 'APP-20241110-000013',
    beneficiaryName: 'Anil Joshi',
    schemeName: 'Rural Housing Scheme',
    requestedAmount: 220000,
    currentStage: 'APPROVED',
    regionId: 3,
    regionName: 'East District',
    submissionDate: '2024-11-10',
    fieldFinding: 'NONE',
    fieldRemarks: 'All documents verified. BPL card valid. Recommending approval.',
    fieldEvidence: 'DOC-007, DOC-008',
    fieldRecommendation: 'APPROVE',
    fieldOfficerName: 'Raj Kumar',
    fieldVerifiedAt: '2024-11-12T10:00:00Z',
    history: [
      { stage: 'SUBMITTED', transitionDate: '2024-11-10T08:00:00Z', remark: 'Application submitted.', actorName: 'Anil Joshi' },
      { stage: 'FIELD_PENDING', transitionDate: '2024-11-10T10:00:00Z', remark: 'Assigned to field officer.', actorName: 'System' },
      { stage: 'DISTRICT_REVIEW', transitionDate: '2024-11-12T10:00:00Z', remark: 'Field verification passed.', actorName: 'Raj Kumar' },
      { stage: 'FINANCE_REVIEW', transitionDate: '2024-11-15T09:00:00Z', remark: 'District approved.', actorName: 'District Officer Singh' },
      { stage: 'APPROVED', transitionDate: '2024-11-20T16:00:00Z', remark: 'Finance approved. Disbursement order issued.', actorName: 'Finance Officer' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Accessor functions — assessments
// ---------------------------------------------------------------------------

export function getAllAssessments(): WorkflowAssessment[] {
  return [...ASSESSMENTS];
}

export function getAssessmentByApplicationId(applicationId: string): WorkflowAssessment | undefined {
  return ASSESSMENTS.find((a) => a.applicationId === applicationId);
}

// ---------------------------------------------------------------------------
// Accessor functions — criteria
// ---------------------------------------------------------------------------

export function getCriteriaBySchemeId(schemeId: string): WorkflowCriterion[] {
  return [...(SCHEME_CRITERIA[schemeId] ?? [])];
}

// ---------------------------------------------------------------------------
// Accessor functions — verification tasks (mutable in-memory list)
// ---------------------------------------------------------------------------

const verificationTasks: WorkflowVerificationTask[] = [...VERIFICATION_TASKS];

export function getAllVerificationTasks(): WorkflowVerificationTask[] {
  return [...verificationTasks];
}

export function getVerificationTaskById(id: string): WorkflowVerificationTask | undefined {
  return verificationTasks.find((t) => t.id === id);
}

export function updateFieldVerification(
  taskId: string,
  data: { finding: FieldFinding; remarks: string; evidence: string; recommendation: VerificationRecommendation },
): void {
  const task = verificationTasks.find((t) => t.id === taskId);
  if (!task) return;
  task.fieldFinding = data.finding;
  task.fieldRemarks = data.remarks;
  task.fieldEvidence = data.evidence;
  task.fieldRecommendation = data.recommendation;
  task.fieldOfficerName = 'Test Officer';
  task.fieldVerifiedAt = new Date().toISOString();
  task.currentStage = 'DISTRICT_REVIEW';
  task.history.push({
    stage: 'DISTRICT_REVIEW',
    transitionDate: new Date().toISOString(),
    remark: `Field verification completed. Finding: ${data.finding}. Recommendation: ${data.recommendation}.`,
    actorName: 'Test Officer',
  });
}

export function updateDistrictReview(
  taskId: string,
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION',
  remark: string,
): void {
  const task = verificationTasks.find((t) => t.id === taskId);
  if (!task) return;
  let newStage: WorkflowStage;
  if (action === 'APPROVE') {
    newStage = 'FINANCE_REVIEW';
  } else if (action === 'REJECT') {
    newStage = 'REJECTED';
  } else {
    newStage = 'FIELD_PENDING';
  }
  task.currentStage = newStage;
  task.history.push({
    stage: newStage,
    transitionDate: new Date().toISOString(),
    remark: `District review: ${action}. ${remark}`,
    actorName: 'District Officer',
  });
}
