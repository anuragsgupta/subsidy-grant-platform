# Design Document: Frontend Workflow (Phase 5)

## Overview

Phase 5 adds two feature modules — Eligibility Assessment and Multi-Step Verification — on
top of Phases 1–4. Neither module has a backend REST controller. All data comes from
`src/services/workflow-demo-data.service.ts`. Every page shows a `<DemoBadge />`.

---

## Architecture

### Feature folder additions

```
src/
├── services/
│   └── workflow-demo-data.service.ts   # sole source for eligibility + verification data
│
├── features/
│   ├── eligibility/
│   │   ├── components/
│   │   │   ├── CriterionResultTable.tsx
│   │   │   └── AssessmentDecisionBadge.tsx
│   │   ├── pages/
│   │   │   ├── EligibilityListPage.tsx        # assessment history
│   │   │   ├── EligibilityCriteriaPage.tsx    # criteria view for a scheme
│   │   │   └── EligibilityResultPage.tsx      # assessment result for an application
│   │   ├── hooks/
│   │   │   └── useEligibility.ts
│   │   ├── services/
│   │   │   └── eligibility.service.ts
│   │   └── types/
│   │       └── eligibility.types.ts
│   │
│   └── verification/
│       ├── components/
│       │   ├── VerificationTaskTable.tsx
│       │   ├── FieldVerificationForm.tsx
│       │   ├── DistrictReviewPanel.tsx
│       │   ├── ConfirmActionDialog.tsx
│       │   └── WorkflowHistoryTimeline.tsx
│       ├── pages/
│       │   ├── VerificationQueuePage.tsx
│       │   └── VerificationDetailPage.tsx
│       ├── hooks/
│       │   └── useVerification.ts
│       ├── services/
│       │   └── verification.service.ts
│       ├── schemas/
│       │   └── field-verification.schema.ts
│       └── types/
│           └── verification.types.ts
```

---

## Data Models

### `workflow-demo-data.service.ts`

Types mirror backend domain classes so the frontend can swap to real APIs with minimal changes.

```ts
// ── Enums (from backend domain) ──────────────────────────────────────────

export type CriterionAttribute =
  | 'AGE' | 'ANNUAL_INCOME' | 'LAND_HOLDING' | 'GENDER'
  | 'SOCIAL_CATEGORY' | 'IS_DISABLED' | 'BENEFICIARY_TYPE' | 'REGION';

export type CriterionOperator =
  | 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'BETWEEN' | 'IN' | 'NOT_IN';

export type AssessmentDecision =
  | 'ELIGIBLE' | 'INELIGIBLE' | 'REQUIRES_MANUAL_REVIEW' | 'INCOMPLETE_INFORMATION';

export type FieldFinding = 'NONE' | 'MINOR_MISMATCH' | 'MAJOR_MISMATCH';

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

export type VerificationRecommendation = 'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION';

// ── Interfaces ─────────────────────────────────────────────────────────────

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
  assessedAt: string;          // ISO-8601
  criterionResults: WorkflowCriterionResult[];
  failedMandatoryDescriptions: string[];
  missingAttributes: string[]; // for INCOMPLETE_INFORMATION
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
  // Field verification result (filled when stage > FIELD_PENDING)
  fieldFinding?: FieldFinding;
  fieldRemarks?: string;
  fieldEvidence?: string;
  fieldRecommendation?: VerificationRecommendation;
  fieldOfficerName?: string;
  fieldVerifiedAt?: string;
  // Workflow history
  history: WorkflowHistoryEvent[];
}

export interface WorkflowHistoryEvent {
  stage: WorkflowStage;
  transitionDate: string;
  remark?: string;
  actorName?: string;
}
```

`WorkflowStage` is re-exported from the existing `demo-data.service.ts`.

### Service layer

Both services wrap synchronous demo calls in `Promise.resolve` so hooks can use
the standard `useQuery` pattern.

```ts
// eligibility.service.ts
export const eligibilityService = {
  getAssessments: () => Promise.resolve(getAllAssessments()),
  getAssessmentByApplicationId: (id: string) => Promise.resolve(getAssessmentByApplicationId(id)),
  getCriteriaBySchemeId: (schemeId: string) => Promise.resolve(getCriteriaBySchemeId(schemeId)),
};

// verification.service.ts
export const verificationService = {
  getTasks: () => Promise.resolve(getAllVerificationTasks()),
  getTaskById: (id: string) => Promise.resolve(getVerificationTaskById(id)),
  getTasksForRole: (tasks: WorkflowVerificationTask[], user: UserResponse) => WorkflowVerificationTask[],
  submitFieldVerification: (taskId: string, data: FieldVerificationSubmit) => Promise.resolve(updateFieldVerification(taskId, data)),
  submitDistrictReview: (taskId: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION', remark: string) => Promise.resolve(updateDistrictReview(taskId, action, remark)),
};
```

### Role-scope filter (`verification.service.ts`)

```ts
export function getTasksForRole(tasks, user): WorkflowVerificationTask[] {
  switch (user.role) {
    case 'FIELD_OFFICER':
      return tasks.filter(t => t.currentStage === 'FIELD_PENDING' && t.assignedOfficerId === user.id);
    case 'DISTRICT_OFFICER':
      return tasks.filter(t => t.currentStage === 'DISTRICT_REVIEW' && user.regionIds.includes(t.regionId ?? -1));
    case 'ADMIN':
    default:
      return tasks;
  }
}
```

---

## Route Map

| Route | Page | Roles | Backend |
|-------|------|-------|---------|
| `/eligibility` | `EligibilityListPage` | ADMIN, DISTRICT_OFFICER | Demo |
| `/eligibility/schemes/:schemeId` | `EligibilityCriteriaPage` | ADMIN, DISTRICT_OFFICER | Demo |
| `/eligibility/applications/:applicationId` | `EligibilityResultPage` | ADMIN, DISTRICT_OFFICER | Demo |
| `/verification` | `VerificationQueuePage` | ADMIN, FIELD_OFFICER, DISTRICT_OFFICER | Demo |
| `/verification/:taskId` | `VerificationDetailPage` | ADMIN, FIELD_OFFICER, DISTRICT_OFFICER | Demo |

The existing `/verification` placeholder route is replaced. New `/eligibility` routes are added.

---

## Components and Interfaces

### AssessmentDecisionBadge

### AssessmentDecisionBadge

Renders a coloured badge for each `AssessmentDecision`:
- `ELIGIBLE` → green
- `INELIGIBLE` → red
- `REQUIRES_MANUAL_REVIEW` → amber
- `INCOMPLETE_INFORMATION` → blue

### CriterionResultTable

Props: `results: WorkflowCriterionResult[]`. Renders a table with columns: Description, Attribute, Operator, Threshold, Mandatory, Result (passed/failed badge), Beneficiary Value.

### FieldVerificationForm

Uses `react-hook-form` + `zodResolver`. Fields:
- `finding`: select (`NONE` / `MINOR_MISMATCH` / `MAJOR_MISMATCH`)
- `remarks`: textarea (required, min 10 chars)
- `evidence`: text input (required)
- `recommendation`: select (`APPROVE` / `REJECT` / `REQUEST_CLARIFICATION`)

Zod schema validates all required. On submit, calls `verificationService.submitFieldVerification`.

### DistrictReviewPanel

Displays the field verification report read-only. Renders three action buttons:
- **Approve** → opens `ConfirmActionDialog`, on confirm calls service to advance to `FINANCE_REVIEW`
- **Reject** → opens `ConfirmActionDialog`, on confirm calls service to set `REJECTED`
- **Request Clarification** → opens `ConfirmActionDialog`, on confirm calls service to revert to `FIELD_PENDING`

All three are disabled with `title="Coming soon"` if the task is not in `DISTRICT_REVIEW` stage.

### ConfirmActionDialog

Reusable confirmation dialog. Props: `open`, `onConfirm`, `onCancel`, `title`, `description`, `confirmLabel`, `variant` (`default` | `destructive`).

### WorkflowHistoryTimeline

Renders the `history` array sorted ascending by `transitionDate`. Each entry: stage label (bold), date, remark or dash. Current stage highlighted.

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Assessment not found by application ID | `<EmptyState>` with link to `/eligibility` |
| Verification task not found by ID | `<EmptyState>` with link to `/verification` |
| Wrong role accesses `/eligibility` | `<PermissionDeniedState>` |
| Wrong role accesses `/verification` | `<PermissionDeniedState>` |
| Field officer not assigned to task | `<PermissionDeniedState>` |
| Task not in FIELD_PENDING stage | Read-only message, form hidden |
| Task not in DISTRICT_REVIEW stage | Review controls hidden |
| Form submission error | Toast error, field values retained |

---

## Testing Strategy

PBT is not applicable. Example-based tests with React Testing Library.

### Mock pattern

```ts
vi.mock('../../../services/workflow-demo-data.service', () => ({
  getAllAssessments: vi.fn(() => []),
  getAssessmentByApplicationId: vi.fn(() => undefined),
  getCriteriaBySchemeId: vi.fn(() => []),
  getAllVerificationTasks: vi.fn(() => []),
  getVerificationTaskById: vi.fn(() => undefined),
  getTasksForRole: vi.fn((tasks) => tasks),
  updateFieldVerification: vi.fn(),
  updateDistrictReview: vi.fn(),
}));
```

### Test coverage per page

| Page | Tests |
|------|-------|
| EligibilityListPage | loading, empty, data (3 rows), decision filter, demo badge, permission denied for BENEFICIARY |
| EligibilityCriteriaPage | loading, empty, data (criteria list), demo badge |
| EligibilityResultPage | loading, not found, data (decision + criterion table), failure reasons for INELIGIBLE, demo badge |
| VerificationQueuePage | loading, empty, data, stage filter, demo badge, permission denied for BENEFICIARY |
| VerificationDetailPage | loading, not found, field form renders, form validation, district review panel, confirm dialog, workflow history, demo badge, permission denied |
