# Requirements Document

## Introduction

Phase 4 of the GSDTS frontend: a government administration showcase layer that
adds role-aware dashboards, scheme management, beneficiary management and
application management on top of the foundation (Phase 1), authentication
(Phase 2) and admin (Phase 3) already in `main`.

No backend controllers exist for schemes, beneficiaries or applications. All
data for these modules comes from `demo-data.service.ts`. Every screen driven
by demo data shows a persistent "Demo data" badge. The only real API calls in
this phase are `GET /regions` (already integrated) and `GET /auth/me` (already
integrated). The backend in `backend/` is not modified.

Existing patterns from Phases 1–3 — `AppShell`, `Sidebar`, `QueryState`,
`StatusBadge`, `LoadingSkeleton`, `EmptyState`, `ErrorState`,
`PermissionDeniedState`, `ApiResponse<T>`, `PagedResponse<T>`,
`demo-data.service.ts`, the government colour palette and Inter typography —
are reused without being re-specified here.

---

## Glossary

- **Dashboard**: The role-specific landing page rendered after login.
- **Demo_Service**: `demo-data.service.ts` — the isolated static fixture layer for modules without real backend controllers.
- **Demo_Badge**: A visible persistent badge reading "Demo data" rendered on every page served by Demo_Service.
- **Scheme**: A government subsidy programme with eligibility criteria, a grant amount range and an application period.
- **Beneficiary**: A citizen or organisation registered to apply for schemes.
- **Application**: A submitted request by a Beneficiary for a specific Scheme.
- **Workflow_Stage**: The named phase of an Application's lifecycle (SUBMITTED, FIELD_PENDING, DISTRICT_REVIEW, SECOND_REVIEW, FINANCE_REVIEW, BUDGET_HOLD, APPROVED, REJECTED, CLOSED, TERMINATED — v2 status set from `frontend-analysis.md` Appendix A).
- **Role**: One of ADMIN, BENEFICIARY, FIELD_OFFICER, DISTRICT_OFFICER, FINANCE_APPROVER.
- **QueryState**: The existing shared component that branches on loading / empty / error / permission-denied states.

---

## Requirements

### Requirement 1: Role-Aware Dashboard

**User Story:** As any authenticated user, I want a dashboard tailored to my role, so that I see the work queue and statistics relevant to my responsibilities.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to `/dashboard`, THE Dashboard SHALL render the view corresponding to the user's Role within 2 seconds of navigation.
2. THE Dashboard SHALL display stat cards for: total applications, pending applications, approved applications, rejected applications, and total requested subsidy amount, where each value is sourced from Demo_Service and displayed as a formatted integer or currency value.
3. THE Dashboard SHALL display a Demo_Badge on every stat card and chart section indicating that all statistics are sourced from Demo_Service and do not reflect live backend data.
4. THE Dashboard SHALL render an applications-by-status chart using Recharts as either a donut or pie chart, with each segment labeled by status name and count, sourced from Demo_Service.
5. THE Dashboard SHALL render a regional-distribution bar chart using Recharts where region name labels are sourced from `GET /regions` and bar heights represent application counts sourced from Demo_Service; IF `GET /regions` returns zero regions, THEN the chart SHALL render an empty state message instead of a blank chart.
6. THE Dashboard SHALL render a recent-activity list of exactly the 10 most recent application events sourced from Demo_Service, ordered with the most recent event first, where each entry displays the application reference, event type, and timestamp formatted as `YYYY-MM-DD HH:mm`.
7. WHEN the user's Role is ADMIN, THE Dashboard SHALL render a pending-work queue showing all applications with status PENDING across all regions, displaying application reference, beneficiary name, scheme name, submission date, and current status for each entry.
8. WHEN the user's Role is FIELD_OFFICER, THE Dashboard SHALL render a pending-work queue showing only applications assigned to that officer with Workflow_Stage of FIELD_PENDING, displaying application reference, beneficiary name, assigned date, and current Workflow_Stage for each entry.
9. WHEN the user's Role is DISTRICT_OFFICER, THE Dashboard SHALL render a pending-work queue showing only applications with Workflow_Stage of DISTRICT_REVIEW within the officer's assigned region, displaying application reference, beneficiary name, field officer name, and submission date for each entry.
10. WHEN the user's Role is FINANCE_APPROVER, THE Dashboard SHALL render a pending-work queue showing only applications with Workflow_Stage of FINANCE_REVIEW or BUDGET_HOLD, displaying application reference, beneficiary name, scheme name, requested subsidy amount, and current Workflow_Stage for each entry.
11. WHEN the user's Role is BENEFICIARY, THE Dashboard SHALL render a pending-work queue showing only the authenticated beneficiary's own applications that have an active Workflow_Stage, displaying application reference, scheme name, submission date, and current Workflow_Stage for each entry.
12. WHILE Dashboard data is loading, THE Dashboard SHALL render a loading skeleton placeholder for each stat card and each chart panel individually, with the skeleton matching the approximate dimensions of the loaded content.
13. IF the `GET /regions` fetch fails, THEN THE Dashboard SHALL render an error state message within the regional-distribution chart panel only, and all other stat cards, charts, and the pending-work queue SHALL continue to display their data unaffected.
14. IF the authenticated user's Role does not match any of ADMIN, BENEFICIARY, FIELD_OFFICER, DISTRICT_OFFICER, or FINANCE_APPROVER, THEN THE Dashboard SHALL render a permission-denied message in the pending-work queue section and display only the stat cards and charts.

---

### Requirement 2: Scheme Listing

**User Story:** As any authenticated user, I want to browse available schemes, so that I can understand what subsidies are available.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to `/schemes`, THE Scheme_List_Page SHALL display a paginated table of Schemes sourced from Demo_Service, showing 20 rows per page using zero-based page indexing.
2. THE Scheme_List_Page SHALL display a Demo_Badge.
3. THE Scheme_List_Page SHALL provide a text search field that filters Schemes by name or scheme code (client-side, within the Demo_Service result set), applying the filter no sooner than 400 milliseconds after the user stops typing.
4. THE Scheme_List_Page SHALL provide a status filter (All / DRAFT / OPEN / PAUSED / CLOSED) that resets pagination to page 0 when the selected value changes.
5. WHEN the text search field value changes, THE Scheme_List_Page SHALL reset pagination to page 0.
6. THE Scheme_List_Page SHALL show columns: Scheme Code, Name, Status (using StatusBadge), Grant Amount Range displayed as "min – max" with values formatted as locale currency (e.g., ₹10,000 – ₹50,000), Application Period displayed as "DD MMM YYYY – DD MMM YYYY" using the scheme's open and close dates.
7. WHILE schemes are loading, THE Scheme_List_Page SHALL render 5 row-shaped loading skeletons via QueryState.
8. WHEN no schemes match the active filters, THE Scheme_List_Page SHALL render an empty state.

---

### Requirement 3: Scheme Detail

**User Story:** As any authenticated user, I want to view the full details of a scheme, so that I can assess eligibility before applying.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to `/schemes/:id`, THE Scheme_Detail_Page SHALL display the scheme record from Demo_Service, including: Scheme Code, Name, Description, Status badge, Grant Amount Range (`minGrantAmount` – `maxGrantAmount`), Application Period (`startDate` – `endDate`), and an eligibility criteria summary section.
2. THE Scheme_Detail_Page SHALL display the eligibility criteria summary as a list in which each entry shows: the criterion attribute, the operator, the threshold value, whether the criterion is mandatory, and the criterion description where available.
3. THE Scheme_Detail_Page SHALL display a Demo_Badge.
4. WHILE the Demo_Service call is pending, THE Scheme_Detail_Page SHALL render loading skeletons via QueryState in place of the scheme fields and eligibility criteria list.
5. IF the scheme id is not found in Demo_Service, THEN THE Scheme_Detail_Page SHALL render an empty state containing a message indicating the scheme was not found and a navigable link back to `/schemes`.
6. IF the authenticated user's Role is ADMIN, THEN THE Scheme_Detail_Page SHALL render an "Edit" button that is visually disabled and labelled "Coming soon", and clicking it SHALL produce no mutation or navigation.

---

### Requirement 4: Beneficiary Listing

**User Story:** As an ADMIN, DISTRICT_OFFICER, FINANCE_APPROVER or FIELD_OFFICER, I want to view the beneficiary list, so that I can locate beneficiary records for review.

#### Acceptance Criteria

1. WHEN a user whose Role is ADMIN, DISTRICT_OFFICER, FINANCE_APPROVER or FIELD_OFFICER navigates to `/admin/beneficiaries`, THE Beneficiary_List_Page SHALL display a paginated table sourced from Demo_Service, with a default page size of 20 items and pagination controls that update the visible slice client-side.
2. THE Beneficiary_List_Page SHALL display a Demo_Badge.
3. THE Beneficiary_List_Page SHALL show columns: Reference ID, Full Name, Beneficiary Type, Region, Status.
4. THE Beneficiary_List_Page SHALL mask sensitive identity fields (national ID and SSN) by rendering exactly four asterisk characters followed by the last four characters of the value (for example, `****1234`); the remaining characters of the value SHALL NOT be rendered.
5. THE Beneficiary_List_Page SHALL provide a text search field that filters the Demo_Service result set by name or reference ID on each keystroke (client-side, case-insensitive); when the search field is empty, the full unfiltered list SHALL be shown.
6. THE Beneficiary_List_Page SHALL provide a Status filter (All / ACTIVE / INACTIVE / PENDING) that resets pagination to page 0 when changed and filters the Demo_Service result set client-side.
7. IF the user's Role is BENEFICIARY, THEN THE Beneficiary_List_Page SHALL render a permission-denied state.
8. WHILE data is loading, THE Beneficiary_List_Page SHALL render loading skeletons via QueryState.
9. WHEN no beneficiaries match the active filters, THE Beneficiary_List_Page SHALL render an empty state.

---

### Requirement 5: Beneficiary Profile

**User Story:** As a BENEFICIARY, I want to view my own profile, so that I can confirm my registered details. As an officer or admin, I want to view a beneficiary's details, so that I can review their record.

#### Acceptance Criteria

1. WHEN the user's Role is BENEFICIARY and navigates to `/beneficiary/profile`, THE Beneficiary_Profile_Page SHALL display the current user's beneficiary record from Demo_Service, showing: Reference ID, Full Name, Beneficiary Type, Region, Contact Information, Status, and identity fields (national ID, SSN) unmasked — displaying the full value as registered.
2. WHEN a user whose Role is ADMIN, DISTRICT_OFFICER, FINANCE_APPROVER or FIELD_OFFICER navigates to `/admin/beneficiaries/:id`, THE Beneficiary_Detail_Page SHALL display the selected beneficiary's record from Demo_Service, showing: Reference ID, Full Name, Beneficiary Type, Region, Contact Information, and Status.
3. THE Beneficiary_Profile_Page and Beneficiary_Detail_Page SHALL display a Demo_Badge.
4. THE Beneficiary_Detail_Page SHALL mask sensitive identity fields (national ID and SSN) by rendering exactly four asterisk characters followed by the last four characters of the value (for example, `****1234`); the remaining characters SHALL NOT be rendered.
5. THE Beneficiary_Detail_Page SHALL show the beneficiary's application history as a list displaying Reference Number, Scheme Name, Current Status (using StatusBadge) and Submission Date, with each row linking to `/applications/:id` for the corresponding application; IF the application history is empty, THEN THE Beneficiary_Detail_Page SHALL render an empty state labelled "No applications found".
6. WHILE data is loading, THE Beneficiary_Profile_Page and Beneficiary_Detail_Page SHALL render loading skeletons via QueryState.
7. IF the `:id` in `/admin/beneficiaries/:id` is not found in Demo_Service, THEN THE Beneficiary_Detail_Page SHALL render an empty state with a link back to `/admin/beneficiaries`.

---

### Requirement 6: Application Listing

**User Story:** As any authenticated user, I want to browse applications relevant to my role, so that I can monitor and act on them.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to `/applications`, THE Application_List_Page SHALL apply the role-scope filter derived from the authenticated user's Role before rendering any rows, and display a paginated table of Applications sourced from Demo_Service with a default page size of 20 and starting at page 0.
2. WHEN the user's Role is BENEFICIARY, THE Application_List_Page SHALL show only applications whose beneficiary ID matches the authenticated user's linked beneficiary record in Demo_Service.
3. WHEN the user's Role is FIELD_OFFICER, THE Application_List_Page SHALL show only applications in FIELD_PENDING stage whose assigned officer ID matches the authenticated user's ID in Demo_Service.
4. WHEN the user's Role is DISTRICT_OFFICER, THE Application_List_Page SHALL show only applications in DISTRICT_REVIEW or SECOND_REVIEW stage whose region ID matches the authenticated user's assigned region in Demo_Service.
5. WHEN the user's Role is FINANCE_APPROVER, THE Application_List_Page SHALL show applications in FINANCE_REVIEW or BUDGET_HOLD stage.
6. WHEN the user's Role is ADMIN, THE Application_List_Page SHALL show all applications without scope restriction.
7. THE Application_List_Page SHALL display a Demo_Badge.
8. THE Application_List_Page SHALL show columns: Reference Number, Beneficiary Name, Scheme Name, Requested Amount, Current Status (StatusBadge), Submission Date.
9. THE Application_List_Page SHALL provide a status filter dropdown containing an "All Stages" option (default, no filter applied) followed by each Workflow_Stage value (SUBMITTED, FIELD_PENDING, DISTRICT_REVIEW, SECOND_REVIEW, FINANCE_REVIEW, BUDGET_HOLD, APPROVED, REJECTED, CLOSED, TERMINATED); selecting any value resets pagination to page 0.
10. THE Application_List_Page SHALL provide a date-range filter with a "from" date and a "to" date input (each accepting ISO-8601 date strings in YYYY-MM-DD format); changing either value resets pagination to page 0; IF the "from" date is later than the "to" date, THEN THE Application_List_Page SHALL display an inline validation error on the date-range filter and SHALL NOT apply the invalid range.
11. THE Application_List_Page SHALL default to sorting by Submission Date descending and SHALL be re-sortable by Submission Date and Requested Amount (client-side), toggling between ascending and descending on each click of the column header.
12. WHILE data is loading, THE Application_List_Page SHALL render loading skeletons via QueryState.
13. WHEN no applications match the active filters, THE Application_List_Page SHALL render an empty state.

---

### Requirement 7: Application Detail

**User Story:** As any authenticated user, I want to view the full details of an application, so that I can understand its current state and history.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to `/applications/:id`, THE Application_Detail_Page SHALL display the application record from Demo_Service containing all fields specified in criterion 2.
2. THE Application_Detail_Page SHALL display the following fields: Reference Number (string), Beneficiary name, Scheme name, Requested Amount formatted as a locale currency value with two decimal places, Current Status rendered as a StatusBadge, Submission Date formatted as `DD MMM YYYY`, and current Workflow_Stage as a distinct labelled text field separate from the StatusBadge.
3. THE Application_Detail_Page SHALL display a Demo_Badge.
4. THE Application_Detail_Page SHALL render a chronological timeline of status transitions sorted ascending by transition date, with each entry showing: the Workflow_Stage label, the transition date formatted as `DD MMM YYYY HH:mm`, and — when the remark field is present and non-empty — the remark text; when the remark is absent or empty, the remark slot SHALL render a dash character.
5. IF the application id is not found in Demo_Service, THEN THE Application_Detail_Page SHALL render an empty state with a link back to `/applications`.
6. WHEN the page contains workflow action buttons, THE Application_Detail_Page SHALL render exactly the following actions as disabled buttons with a "Coming soon" tooltip and no click handler: Approve, Reject, and Request Clarification — no mutations of Demo_Service state are permitted from this page.
7. IF the authenticated user's Role is BENEFICIARY and the application's beneficiary id does not match the current user's id, THEN THE Application_Detail_Page SHALL render a permission-denied state without displaying any application data.
8. WHILE data is loading, THE Application_Detail_Page SHALL render loading skeletons via QueryState covering the full page content area.

---

### Requirement 8: Application Submission (Beneficiary)

**User Story:** As a BENEFICIARY, I want to submit an application for an available scheme, so that I can request a subsidy.

#### Acceptance Criteria

1. WHEN a user whose Role is BENEFICIARY navigates to `/applications/new`, THE Submit_Application_Page SHALL render an application form containing a scheme selector, a requested amount field, and a submit button.
2. THE Submit_Application_Page SHALL populate the scheme selector with the list of schemes returned by Demo_Service, where each option displays the scheme name and scheme code.
3. WHEN the beneficiary selects a scheme, THE Submit_Application_Page SHALL validate the requested amount field against that scheme's minimum grant amount and maximum grant amount, rejecting values outside the range.
4. THE Submit_Application_Page SHALL display a Demo_Badge adjacent to the form title indicating that the submission is recorded only in Demo_Service in-memory state and is not persisted to any backend.
5. WHEN the beneficiary submits a valid form, THE Submit_Application_Page SHALL add the application to the Demo_Service in-memory state, display a success message, and include a generated reference number of format `APP-YYYYMMDD-XXXXXX` where XXXXXX is a zero-padded sequential counter.
6. IF the form is submitted with one or more invalid or missing required fields, THEN THE Submit_Application_Page SHALL display an inline error message beneath each invalid field without calling Demo_Service and without clearing previously entered valid field values.
7. WHEN a user whose Role is not BENEFICIARY navigates to `/applications/new`, THE Submit_Application_Page SHALL render a permission-denied state containing a message indicating insufficient permissions and a navigation link back to the user's dashboard, without rendering any part of the application form.
8. IF Demo_Service returns an error when the beneficiary submits a valid form, THEN THE Submit_Application_Page SHALL display an error message indicating the submission failed and SHALL retain all previously entered field values so the beneficiary can retry without re-entering data.

---

### Requirement 9: Demo Data Isolation

**User Story:** As a developer, I want all demo data strictly isolated in one service, so that real API integrations are never confused with demo data.

#### Acceptance Criteria

1. THE Demo_Service SHALL be the sole source of scheme, beneficiary and application data for all corresponding pages, including both read operations and the in-memory mutation performed during application submission.
2. THE Demo_Service SHALL export typed static fixtures using the same TypeScript interface types that the page components accept as props or query return values; fixture types SHALL NOT be cast to `any` or `unknown` at the point of export.
3. WHEN any page imports from Demo_Service, THE page component SHALL NOT contain any inline `axios` calls, `fetch` calls, or `useQuery` hooks targeting a real backend endpoint for scheme, beneficiary or application data; fixture data SHALL be accessed only through Demo_Service's exported functions or constants.
4. THE Demo_Service SHALL provide fixtures covering all five Roles' scoped views, with at least two applications per role-relevant Workflow_Stage as defined in the Glossary (SUBMITTED for BENEFICIARY; FIELD_PENDING for FIELD_OFFICER; DISTRICT_REVIEW and SECOND_REVIEW for DISTRICT_OFFICER; FINANCE_REVIEW and BUDGET_HOLD for FINANCE_APPROVER; and all stages for ADMIN).
5. THE Demo_Service SHALL include at least four Scheme fixtures with each of the four SchemeStatus values (DRAFT, OPEN, PAUSED, CLOSED) represented at least once; the total fixture count MAY exceed four.
6. THE Demo_Service SHALL include at least ten Beneficiary fixtures; each fixture SHALL have its national ID and SSN fields pre-masked so that only the last four characters are stored, preceded by asterisks (e.g., `****1234`), and no unmasked value SHALL appear anywhere in the fixture file.

---

### Requirement 10: Tests

**User Story:** As a developer, I want automated tests for every new module, so that regressions are caught before merging.

#### Acceptance Criteria

1. THE Test_Suite SHALL include Vitest and React Testing Library tests for every new page component introduced in this phase, where each page component has a corresponding test file located in a `__tests__` directory adjacent to the component file.
2. WHEN a page component test is executed, THE Test_Suite SHALL replace all Demo_Service imports with Vitest module mocks using `vi.mock`, such that no real fixture data is read from disk during the test run.
3. WHEN a page that is powered by Demo_Service is rendered in a test, THE Test_Suite SHALL assert that exactly one element with the `data-testid="demo-badge"` attribute is present in the rendered output.
4. WHEN a page component that filters data by role is rendered with a specific role context, THE Test_Suite SHALL assert that only the data items whose role scope matches the supplied role are present in the rendered output, and that data items belonging to any other role are absent.
5. WHEN a page component that uses QueryState is rendered in a loading state, THE Test_Suite SHALL assert that a loading skeleton or spinner element is visible and that no data rows are present; IF the QueryState resolves to an empty result set, THEN THE Test_Suite SHALL assert that an empty-state message is visible and no data rows are present; IF the QueryState resolves to an error, THEN THE Test_Suite SHALL assert that an error message element is visible; IF the authenticated user lacks the required permission for the page, THEN THE Test_Suite SHALL assert that a permission-denied message is visible and no data rows are present.
6. WHEN the application submission form is submitted with one or more invalid field values, THE Test_Suite SHALL assert that a validation error message is associated with each invalid field and that no submission API call is made; WHEN the form is submitted with all fields containing valid values, THE Test_Suite SHALL assert that the submission API call is invoked exactly once with a payload matching the entered values.
7. WHEN all tests are executed via `npm run test -- --run`, THE Test_Suite SHALL exit with a zero return code and report zero failing tests across all test files.
8. WHEN the project is built via `npm run build`, THE Build SHALL complete with a zero exit code and produce no TypeScript type errors, no TypeScript compilation errors, and no Vite build errors in the output.
