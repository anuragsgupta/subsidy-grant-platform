# Implementation Plan: Frontend Workflow (Phase 5)

## Overview

Adds Eligibility Assessment and Multi-Step Verification modules. All data from
`workflow-demo-data.service.ts`. Every page shows `<DemoBadge />`. The only real
API call is `GET /regions` (already integrated).

---

## Tasks

- [x] 1. Workflow demo data layer
  - [x] 1.1 Create `src/services/workflow-demo-data.service.ts` with all TypeScript types and static fixtures
    - Export types: `CriterionAttribute`, `CriterionOperator`, `AssessmentDecision`, `FieldFinding`, `RiskTier`, `VerificationRecommendation`, `WorkflowCriterion`, `WorkflowCriterionResult`, `WorkflowAssessment`, `WorkflowVerificationTask`, `WorkflowHistoryEvent`
    - Re-export `WorkflowStage` from `demo-data.service.ts`
    - Provide ≥ 4 scheme criteria fixtures, ≥ 5 assessment fixtures (one per `AssessmentDecision` + extras), ≥ 6 verification task fixtures (2 FIELD_PENDING, 2 DISTRICT_REVIEW, 2 later stages)
    - Export functions: `getAllAssessments`, `getAssessmentByApplicationId`, `getCriteriaBySchemeId`, `getAllVerificationTasks`, `getVerificationTaskById`, `updateFieldVerification`, `updateDistrictReview`
    - No `any`/`unknown` casts on exported fixture values

- [x] 2. Eligibility module
  - [x] 2.1 Create `src/features/eligibility/types/eligibility.types.ts` — re-export from workflow-demo-data
  - [x] 2.2 Create `src/features/eligibility/services/eligibility.service.ts` — wraps demo calls in `Promise.resolve`
  - [x] 2.3 Create `src/features/eligibility/hooks/useEligibility.ts` — `useAssessmentsQuery`, `useAssessmentQuery(applicationId)`, `useCriteriaQuery(schemeId)` with `staleTime: Infinity`
  - [x] 2.4 Create `src/features/eligibility/components/AssessmentDecisionBadge.tsx` — coloured badge per decision
  - [x] 2.5 Create `src/features/eligibility/components/CriterionResultTable.tsx` — table of criterion results
  - [x] 2.6 Create `src/features/eligibility/pages/EligibilityListPage.tsx` — assessment history table with decision filter, DemoBadge, loading/empty states, permission denied for non-ADMIN/DISTRICT_OFFICER
  - [x] 2.7 Create `src/features/eligibility/pages/EligibilityCriteriaPage.tsx` — criteria view for a scheme, DemoBadge, loading/empty states
  - [x] 2.8 Create `src/features/eligibility/pages/EligibilityResultPage.tsx` — assessment result with decision badge, criterion table, failure reasons, manual review indicator, incomplete info message, DemoBadge, loading/empty states

- [x] 3. Verification module
  - [x] 3.1 Create `src/features/verification/types/verification.types.ts` — re-export from workflow-demo-data
  - [x] 3.2 Create `src/features/verification/services/verification.service.ts` — wraps demo calls, exports `getTasksForRole`
  - [x] 3.3 Create `src/features/verification/hooks/useVerification.ts` — `useVerificationTasksQuery`, `useVerificationTaskQuery(id)` with `staleTime: Infinity`
  - [x] 3.4 Create `src/features/verification/schemas/field-verification.schema.ts` — Zod schema for field verification form
  - [x] 3.5 Create `src/features/verification/components/ConfirmActionDialog.tsx` — reusable confirmation dialog
  - [x] 3.6 Create `src/features/verification/components/WorkflowHistoryTimeline.tsx` — sorted ascending timeline, current stage highlighted
  - [x] 3.7 Create `src/features/verification/components/FieldVerificationForm.tsx` — react-hook-form + zod, finding/remarks/evidence/recommendation fields, validation, toast on success
  - [x] 3.8 Create `src/features/verification/components/DistrictReviewPanel.tsx` — field report read-only, approve/reject/clarification with ConfirmActionDialog
  - [x] 3.9 Create `src/features/verification/pages/VerificationQueuePage.tsx` — task table with stage filter, role-scope, DemoBadge, loading/empty states, permission denied
  - [x] 3.10 Create `src/features/verification/pages/VerificationDetailPage.tsx` — task details, field form or district panel based on stage, workflow history timeline, DemoBadge, loading/empty/permission-denied states

- [x] 4. Router and sidebar updates
  - [x] 4.1 Update `src/app/router.tsx` — replace `/verification` placeholder with `VerificationQueuePage`, add `/verification/:taskId`, add `/eligibility`, `/eligibility/schemes/:schemeId`, `/eligibility/applications/:applicationId` routes
  - [x] 4.2 Update `src/components/layout/Sidebar.tsx` — add "Eligibility" nav item for ADMIN and DISTRICT_OFFICER, remove `comingSoon` flag from "Verification Tasks"

- [x] 5. Build verification
  - Run `npm run build` and confirm zero TypeScript errors

- [x] 6. Tests
  - [x] 6.1 `features/eligibility/pages/__tests__/EligibilityListPage.test.tsx` — loading, empty, data, decision filter, demo badge, permission denied
  - [x] 6.2 `features/eligibility/pages/__tests__/EligibilityCriteriaPage.test.tsx` — loading, empty, data, demo badge
  - [x] 6.3 `features/eligibility/pages/__tests__/EligibilityResultPage.test.tsx` — loading, not found, data, failure reasons, demo badge
  - [x] 6.4 `features/verification/pages/__tests__/VerificationQueuePage.test.tsx` — loading, empty, data, stage filter, demo badge, permission denied
  - [x] 6.5 `features/verification/pages/__tests__/VerificationDetailPage.test.tsx` — loading, not found, field form, district panel, confirm dialog, workflow history, demo badge, permission denied

- [x] 7. Final test run
  - Run `npm run test -- --run` and confirm zero failing tests

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1", "3.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5", "3.3", "3.4", "3.5", "3.6"] },
    { "id": 3, "tasks": ["2.6", "2.7", "2.8", "3.7", "3.8"] },
    { "id": 4, "tasks": ["3.9", "3.10", "4.1", "4.2"] },
    { "id": 5, "tasks": ["5"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 7, "tasks": ["7"] }
  ]
}
```

---

## Notes

- Tasks within each module (types → service → hooks → components → pages) must be implemented in order.
- Test tasks depend on all implementation tasks completing (T-5 build checkpoint must pass).
- No real `axios`/`fetch` calls for eligibility or verification data — all through `workflow-demo-data.service.ts`.
- Routes and sidebar items exist as placeholders from Phase 1 — they need to be updated, not created from scratch.
- The `DemoBadge` component from Phase 4 is reused; no new badge needed.
