# Requirements Document

## Introduction

Phase 5 of the GSDTS frontend: Eligibility Assessment and Multi-Step Verification screens.
Neither module has a backend REST controller. All data comes from an isolated demo-data
service (`workflow-demo-data.service.ts`). Every page powered by demo data shows a
`<DemoBadge />`. The only real API call in this phase is `GET /regions` (already integrated)
used for region labels.

Existing patterns from Phases 1–4 — `AppShell`, `Sidebar`, `QueryState`, `StatusBadge`,
`LoadingSkeleton`, `EmptyState`, `ErrorState`, `PermissionDeniedState`, `DemoBadge`,
`demo-data.service.ts` types (`DemoApplication`, `WorkflowStage`), government colour
palette — are reused without being re-specified here.

---

## Glossary

- **Eligibility Criterion**: A rule defined on a scheme (attribute, operator, threshold, mandatory, weight).
- **Criterion Result**: The outcome of evaluating one criterion against a beneficiary's attributes (passed/failed, points).
- **Assessment Decision**: Overall eligibility label: `ELIGIBLE`, `INELIGIBLE`, `REQUIRES_MANUAL_REVIEW`, `INCOMPLETE_INFORMATION`.
- **Verification Task**: A unit of work assigned to a field officer or district officer for a specific application and workflow stage.
- **Field Finding**: `NONE`, `MINOR_MISMATCH`, `MAJOR_MISMATCH` — the officer's assessment of document vs. ground truth.
- **Workflow Stage**: The application lifecycle phase (`SUBMITTED`, `FIELD_PENDING`, `DISTRICT_REVIEW`, `SECOND_REVIEW`, `FINANCE_REVIEW`, `BUDGET_HOLD`, `APPROVED`, `REJECTED`, `CLOSED`, `TERMINATED`).
- **Workflow_Service**: `workflow-demo-data.service.ts` — the isolated static fixture layer for this phase.

---

## Requirements

### Requirement 1: Eligibility Criteria View

**User Story:** As an ADMIN or DISTRICT_OFFICER, I want to view the eligibility criteria defined on a scheme, so that I understand what rules are applied during assessment.

#### Acceptance Criteria

1. WHEN an authenticated user with role ADMIN or DISTRICT_OFFICER navigates to `/eligibility/schemes/:schemeId`, THE Eligibility_Criteria_Page SHALL display the list of eligibility criteria for that scheme sourced from Workflow_Service, each showing: attribute, operator, threshold, whether mandatory, weight, and description.
2. THE Eligibility_Criteria_Page SHALL display a Demo_Badge.
3. WHILE criteria are loading, THE page SHALL render loading skeletons.
4. IF no criteria are defined for the scheme, THE page SHALL render an empty state.
5. THE page SHALL NOT provide any create, edit, or delete action for criteria — these are read-only views.

### Requirement 2: Eligibility Assessment Result

**User Story:** As an ADMIN or DISTRICT_OFFICER, I want to view the eligibility assessment result for an application, so that I can see criterion-level outcomes and the overall decision.

#### Acceptance Criteria

1. WHEN an authenticated user with role ADMIN or DISTRICT_OFFICER navigates to `/eligibility/applications/:applicationId`, THE Assessment_Result_Page SHALL display: the application reference number, scheme name, assessment date, overall decision badge (`ELIGIBLE` / `INELIGIBLE` / `REQUIRES_MANUAL_REVIEW` / `INCOMPLETE_INFORMATION`), and a criterion-level results table.
2. THE criterion results table SHALL show, for each criterion: description, attribute, operator, threshold, mandatory indicator, passed/failed badge, and beneficiary value.
3. IF the overall decision is `INELIGIBLE`, THE page SHALL display a failure-reasons section listing each failed mandatory criterion description.
4. IF the overall decision is `REQUIRES_MANUAL_REVIEW`, THE page SHALL display a manual-review indicator explaining that a human reviewer must assess the application.
5. IF the overall decision is `INCOMPLETE_INFORMATION`, THE page SHALL display a message indicating missing beneficiary attributes.
6. THE Assessment_Result_Page SHALL display a Demo_Badge.
7. WHILE data is loading, THE page SHALL render loading skeletons via QueryState.
8. IF the application ID is not found in Workflow_Service, THE page SHALL render an empty state with a link back to `/eligibility`.

### Requirement 3: Eligibility Assessment History

**User Story:** As an ADMIN, I want to view a list of all eligibility assessments, so that I can monitor assessment outcomes across applications.

#### Acceptance Criteria

1. WHEN an authenticated user with role ADMIN navigates to `/eligibility`, THE Assessment_History_Page SHALL display a paginated table of assessment records sourced from Workflow_Service, showing: application reference, scheme name, beneficiary name, decision badge, and assessment date.
2. THE Assessment_History_Page SHALL display a Demo_Badge.
3. THE page SHALL provide a decision filter (All / ELIGIBLE / INELIGIBLE / REQUIRES_MANUAL_REVIEW / INCOMPLETE_INFORMATION) that filters the table client-side.
4. WHILE data is loading, THE page SHALL render loading skeletons.
5. WHEN no assessments match the active filter, THE page SHALL render an empty state.
6. Each row SHALL link to the Assessment_Result_Page for that application.
7. IF the user's role is not ADMIN or DISTRICT_OFFICER, THE page SHALL render a permission-denied state.

### Requirement 4: Verification Task Queue

**User Story:** As a FIELD_OFFICER or DISTRICT_OFFICER, I want to see my assigned verification tasks, so that I can work through them in order.

#### Acceptance Criteria

1. WHEN an authenticated user with role FIELD_OFFICER navigates to `/verification`, THE Verification_Queue_Page SHALL display only tasks assigned to that officer with status `FIELD_PENDING`, showing: application reference, beneficiary name, scheme name, assigned date, and current stage.
2. WHEN an authenticated user with role DISTRICT_OFFICER navigates to `/verification`, THE page SHALL display only tasks in `DISTRICT_REVIEW` stage within the officer's assigned region, showing: application reference, beneficiary name, field officer name, submission date, and current stage.
3. WHEN an authenticated user with role ADMIN navigates to `/verification`, THE page SHALL display all verification tasks across all stages and regions.
4. THE Verification_Queue_Page SHALL display a Demo_Badge.
5. THE page SHALL provide a stage filter dropdown (All Stages + each Workflow_Stage value) that filters the table client-side.
6. WHILE data is loading, THE page SHALL render loading skeletons.
7. WHEN no tasks match the active filter, THE page SHALL render an empty state.
8. Each row SHALL link to the Verification_Detail_Page for that task.
9. IF the user's role is not ADMIN, FIELD_OFFICER, or DISTRICT_OFFICER, THE page SHALL render a permission-denied state.

### Requirement 5: Field Verification Form

**User Story:** As a FIELD_OFFICER, I want to complete a field verification form for an assigned application, so that I can record my observations and recommendation.

#### Acceptance Criteria

1. WHEN a FIELD_OFFICER navigates to `/verification/:taskId`, THE Verification_Detail_Page SHALL display: application reference, beneficiary name, scheme name, requested amount, and a field verification form.
2. The field verification form SHALL include: a field finding selector (`NONE` / `MINOR_MISMATCH` / `MAJOR_MISMATCH`), an officer remarks text area, an evidence references text field, and a recommendation selector (`APPROVE` / `REJECT` / `REQUEST_CLARIFICATION`).
3. The form SHALL validate that all fields are filled before submission; invalid or empty fields SHALL display inline errors.
4. On valid submit, THE page SHALL call the Workflow_Service to record the verification result and display a success toast.
5. On error, THE page SHALL display an error toast and retain all field values.
6. THE page SHALL display a Demo_Badge.
7. THE page SHALL NOT allow submission if the task's current stage is not `FIELD_PENDING` — it SHALL display a read-only message indicating the task is not in a submittable stage.
8. IF the user is not the assigned officer for this task and their role is not ADMIN, THE page SHALL render a permission-denied state.

### Requirement 6: District Review

**User Story:** As a DISTRICT_OFFICER, I want to review field verification reports and approve or reject applications, so that I can advance them through the workflow.

#### Acceptance Criteria

1. WHEN a DISTRICT_OFFICER navigates to `/verification/:taskId` for a task in `DISTRICT_REVIEW` stage, THE page SHALL display: the field verification report (finding, remarks, evidence, recommendation, officer name), the application details, and approve/reject/request-clarification controls.
2. THE approve and reject controls SHALL be disabled until the page is ready; clicking either SHALL open a confirmation dialog requiring explicit confirmation before the action is applied.
3. On confirmed approve, THE page SHALL call Workflow_Service to advance the application to `FINANCE_REVIEW` and display a success toast.
4. On confirmed reject, THE page SHALL call Workflow_Service to set the application to `REJECTED` and display a success toast.
5. On confirmed request-clarification, THE page SHALL call Workflow_Service to set the application to `FIELD_PENDING` with a clarification flag and display a success toast.
6. THE page SHALL display a Demo_Badge.
7. THE page SHALL NOT display approve/reject controls if the task is not in `DISTRICT_REVIEW` stage.
8. IF the user's role is not DISTRICT_OFFICER or ADMIN, THE page SHALL render a permission-denied state for the review controls.

### Requirement 7: Workflow History

**User Story:** As any authorized user, I want to see the full workflow history for an application, so that I can understand its lifecycle.

#### Acceptance Criteria

1. THE Verification_Detail_Page SHALL render a workflow history timeline showing all stage transitions for the application, sorted ascending by date, with each entry showing: stage label, transition date formatted as `DD MMM yyyy HH:mm`, and remark or dash if absent.
2. THE timeline SHALL be read-only.
3. The current stage SHALL be visually highlighted.

### Requirement 8: Demo Data Isolation

**User Story:** As a developer, I want all workflow data strictly isolated in one service, so that real API integrations are never confused with demo data.

#### Acceptance Criteria

1. THE Workflow_Service SHALL be the sole source of eligibility and verification data for all pages in this phase.
2. THE Workflow_Service SHALL export typed static fixtures using TypeScript interface types matching the backend domain classes (`CriterionAttribute`, `CriterionOperator`, `CriterionResult`, `AssessmentDecision`, `FieldFinding`, `RiskTier`).
3. No page or hook in this phase SHALL make any `axios` or `fetch` call for eligibility or verification data.
4. Fixture identity fields SHALL be pre-masked where sensitive (same pattern as Phase 4).

### Requirement 9: Tests

**User Story:** As a developer, I want automated tests for every new module, so that regressions are caught before merging.

#### Acceptance Criteria

1. THE Test_Suite SHALL include Vitest + React Testing Library tests for every new page component.
2. Each page test SHALL mock Workflow_Service imports with `vi.mock` and assert exactly one `data-testid="demo-badge"` element is present.
3. Tests SHALL cover: loading, empty, data, and permission-denied states for each page.
4. Tests SHALL verify that confirmation dialogs appear for approve/reject actions.
5. Tests SHALL verify that field verification form validation prevents submission of empty fields.
6. `npm run build` SHALL complete with zero TypeScript errors. `npm run test` SHALL pass with zero failing tests.

---

## Notes

- The backend has domain classes for eligibility (`CriterionSpec`, `CriterionResult`, `EligibilityOutcome`, `EligibilityResult` entity, `CriterionAttribute`, `CriterionOperator`, `FieldFinding`, `RiskTier`) and a repository (`EligibilityResultRepository`), but **no REST controller**. The types in the demo data service mirror these domain classes so the frontend can swap to real APIs with minimal changes.
- The backend has **no verification module** at all (no entity, no repository, no controller). Verification types are designed from the steering spec's requirements.
- The v2 `WorkflowStage` values from Phase 4's `demo-data.service.ts` are reused for consistency.
- The existing `ApplicationStatus` enum in the backend uses legacy values (DRAFT, SUBMITTED, UNDER_REVIEW, etc.). The frontend uses v2 values for demo data, as established in Phase 4.
