# GSDTS Frontend — Complete Implementation Specification

Act as a Senior Frontend Architect, React Engineer, UI/UX Designer and Enterprise Application Developer.

Your task is to design and implement the frontend for the existing **Government Subsidy & Disbursement Tracking System (GSDTS)**.

This is an existing Spring Boot backend project. You must inspect the actual backend source code and build a frontend that integrates with its real API contracts.

Do not build a generic admin dashboard or generate arbitrary mock APIs.

The frontend must look and behave like a modern government enterprise application.

---

# 1. PROJECT CONTEXT

Project name: Government Subsidy & Disbursement Tracking System (GSDTS).

Purpose:

A centralized digital platform for managing government subsidy schemes, beneficiary registrations, applications, eligibility assessment, multi-stage verification, administrative approvals, financial disbursement and compliance tracking.

The platform has different user roles:

- ADMIN
- BENEFICIARY
- FIELD_OFFICER
- DISTRICT_OFFICER
- FINANCE_APPROVER

Each role must see an appropriate interface based on its responsibilities and permissions.

# 2. FIRST TASK: INSPECT THE EXISTING BACKEND

Before writing frontend code, inspect the existing repository.

Backend structure includes:

- `auth`
- `user`
- `audit`
- `common`
- `entity`
- `repository`
- `dto`
- `enums`

The backend uses:

- Java 21
- Spring Boot 3
- Spring MVC
- Spring Security
- JWT authentication
- Spring Data JPA
- PostgreSQL / Supabase
- Flyway migrations
- MapStruct
- Centralized exception handling

Inspect the following:

1. All REST controllers.
2. All request DTOs.
3. All response DTOs.
4. API endpoint mappings.
5. Security configuration.
6. JWT authentication implementation.
7. Role-based authorization rules.
8. Existing enums and validation constraints.
9. Pagination and API response formats.
10. Database entities and relationships.
11. Existing Flyway migrations.
12. Existing requirements and Kiro specifications in `.kiro/specs`.

Produce an API inventory before implementation.

For every endpoint document:

- HTTP method.
- URL.
- Required authentication.
- Required role or permission.
- Request schema.
- Response schema.
- Possible HTTP errors.
- Pagination and filtering parameters.

IMPORTANT:

Do not assume that an entity or repository means its REST API is implemented.

Only integrate endpoints that actually exist in the backend.

If a required endpoint is missing, document it as a backend dependency. Do not silently invent an endpoint.

---

# 3. FRONTEND TECHNOLOGY STACK

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- Axios
- TanStack Query
- React Hook Form
- Zod
- Recharts
- Lucide React
- date-fns

Use stable, mutually compatible package versions.

Use strict TypeScript.

Avoid unnecessary dependencies.

---

# 4. DESIGN SYSTEM — GOVERNMENT ENTERPRISE PORTAL

The interface must look like a professional government administrative system, not a consumer SaaS dashboard.

Design inspiration:

- Modern government digital service portals.
- Enterprise administrative dashboards.
- Public-sector financial management systems.
- Professional data-heavy applications.

### Color palette

Primary navy: `#12304A`

Government blue: `#1769AA`

Secondary blue: `#245B83`

Teal accent: `#0D9488`

Page background: `#F4F7FA`

Card background: `#FFFFFF`

Border: `#DCE3EA`

Text primary: `#1E293B`

Text secondary: `#64748B`

Status colors:

- Green: successful / approved.
- Amber: pending / clarification.
- Red: rejected / failed.
- Blue: processing / in progress.
- Grey: inactive / draft.

### Visual guidelines

- Consistent spacing and typography.
- Professional Inter typography.
- Fixed collapsible sidebar.
- Top navigation header.
- Breadcrumb navigation.
- Clear page titles and descriptions.
- Data tables with sorting and filtering.
- Search and pagination.
- Consistent status badges.
- Accessible forms and validation messages.
- Responsive layouts.
- Loading skeletons and empty states.
- Confirmation dialogs for destructive actions.
- Toast notifications for successful and failed operations.

Avoid:

- Excessive gradients.
- Oversized decorative cards.
- Unnecessary animations.
- Too many colors.
- Generic AI-generated dashboard appearance.
- Fake functionality behind buttons.

The result should look credible in a government project presentation.

---

# 5. APPLICATION ARCHITECTURE

Use a feature-based frontend architecture.

Recommended structure:

```text
frontend/
├── public/
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── providers.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Breadcrumbs.tsx
│   │   │   └── PageContainer.tsx
│   │   │
│   │   └── ui/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── regions/
│   │   ├── settings/
│   │   ├── schemes/
│   │   ├── beneficiaries/
│   │   ├── applications/
│   │   ├── eligibility/
│   │   ├── verification/
│   │   ├── disbursement/
│   │   └── audit/
│   │
│   ├── services/
│   │   ├── api-client.ts
│   │   ├── auth.service.ts
│   │   └── ...
│   │
│   ├── hooks/
│   ├── contexts/
│   ├── types/
│   ├── lib/
│   ├── utils/
│   └── main.tsx
│
├── .env.example
├── package.json
└── vite.config.ts
```

Organize each feature into:

- components
- pages
- hooks
- services
- schemas
- types

Do not put the entire application into one component.

---

# 6. AUTHENTICATION AND SESSION MANAGEMENT

Integrate with the actual Spring Boot authentication endpoints.

Inspect the existing AuthController and use its real routes and DTOs.

Expected authentication functionality, subject to actual backend contracts:

- User registration.
- User login.
- JWT token handling.
- Current user profile.
- Logout.
- Protected routes.

Build:

### Login page

- Username field.
- Password field.
- Password visibility toggle.
- Form validation.
- Loading state.
- Error feedback.
- Professional government portal branding.

### Registration page

Only include fields supported by the actual registration DTO.

### Session handling

- Use the backend's actual token response structure.
- Send the Bearer token on authenticated requests.
- Retrieve current user information through the backend.
- Handle expired and invalid tokens.
- Redirect unauthenticated users to login.
- Avoid displaying protected content before session initialization.

Prefer secure, HttpOnly cookie-based token storage if the backend supports it.

If the existing backend only returns JWTs in response bodies, document the current storage approach and its security trade-offs. Never assume that a cookie exists.

Do not create a fake authentication system.

---

# 7. ROLE-BASED USER INTERFACES

Build role-aware dashboards and navigation.

The backend remains the authority for authorization. Hiding a frontend menu item is not a security boundary.

### ADMIN DASHBOARD

Admin should have access to:

- Overall dashboard.
- User management.
- Role management.
- Region management.
- Scheme management.
- Beneficiary management.
- Application monitoring.
- System settings.
- Audit logs.
- Reports.

### BENEFICIARY PORTAL

Beneficiaries should have access to:

- Personal profile.
- Available schemes.
- Scheme details.
- Application submission.
- Document upload when supported.
- My applications.
- Eligibility results.
- Application tracking.
- Clarification requests.

### FIELD OFFICER DASHBOARD

- Assigned verification tasks.
- Pending field inspections.
- Beneficiary details.
- Application documents.
- Verification forms.
- Observations and recommendations.
- Verification history.

### DISTRICT OFFICER DASHBOARD

- District application queue.
- Field verification reports.
- Pending reviews.
- Contradictory findings.
- Clarification requests.
- Approval and rejection actions.

### FINANCE APPROVER DASHBOARD

- Finance approval queue.
- District-approved applications.
- Requested subsidy amounts.
- Budget availability where supported.
- Financial authorization.
- Approval history.

Only display actions the authenticated user is permitted to perform according to backend authorization.

If the backend does not yet expose a role-specific feature, display a clearly marked coming-soon or unavailable state instead of a fake working action.

---

# 8. CORE FRONTEND MODULES

## A. Dashboard

Build a professional dashboard with:

- Total applications.
- Pending applications.
- Approved applications.
- Rejected applications.
- Total requested subsidy amount.
- Total disbursed amount, if available.
- Applications by status.
- Regional application distribution.
- Recent activities.
- Pending work queue.

Use Recharts.

Do not invent live financial figures. If the backend does not provide dashboard aggregation endpoints, use clearly labeled demo data for the showcase or calculate only from data actually retrieved.

## B. Scheme Management

Pages:

1. Scheme listing.
2. Scheme details.
3. Create scheme.
4. Edit scheme.
5. Scheme status management.
6. Eligibility criteria configuration.

Features:

- Search.
- Pagination.
- Status filters.
- Scheme code.
- Grant amount range.
- Application period.
- Eligibility information.

Connect forms to actual scheme endpoints only.

## C. Beneficiary Management

Pages:

1. Beneficiary listing.
2. Beneficiary profile.
3. Registration.
4. Beneficiary application history.

Features:

- Beneficiary type.
- Identity reference.
- Region.
- Contact information.
- Application history.

Never expose sensitive identity information unnecessarily.

## D. Application Management

Pages:

1. Application listing.
2. Application details.
3. Application submission.
4. Application timeline.
5. Status history.

Show:

- Application reference.
- Beneficiary.
- Scheme.
- Requested amount.
- Current status.
- Submission date.
- Workflow stage.

## E. Eligibility Assessment

Prepare the UI for:

- Scheme eligibility criteria.
- Rule configuration.
- Assessment execution.
- Criterion-level results.
- Overall eligibility decision.
- Failure reasons.
- Manual review indicators.
- Assessment history.

Support these outcomes if they match backend enums:

- ELIGIBLE
- INELIGIBLE
- REQUIRES_MANUAL_REVIEW
- INCOMPLETE_INFORMATION

Do not assume the backend has implemented this module yet.

## F. Multi-Step Verification

Design a workflow interface with:

- Verification task queue.
- Assignment details.
- Field verification form.
- Document review.
- Officer remarks.
- Evidence references.
- District review.
- Approval/rejection controls.
- Clarification and re-verification states.
- Workflow history.

The interface must communicate the application lifecycle clearly.

Do not allow a user to bypass workflow stages.

## G. Disbursement and Compliance

Prepare screens for:

- Finance approval.
- Approved subsidy amounts.
- Disbursement plans.
- Payment stages.
- Payment status.
- Milestone progress.
- Utilization documents.
- Compliance history.

Implement only when corresponding backend endpoints exist.

## H. Audit Logs

Build:

- Audit log table.
- Actor filter.
- Entity filter.
- Reference number search.
- Date range filter.
- Audit event details.

Audit records must be read-only in the frontend.

## I. User and Region Management

Integrate the existing user, role, region and settings endpoints.

Support:

- User listing.
- User profile.
- User status.
- Role assignments.
- Region assignments.
- Region hierarchy.
- System settings.

Use the actual backend constraints when validating forms.

---

# 9. API INTEGRATION ARCHITECTURE

Create one centralized Axios instance.

Example configuration:

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
```

Implement:

- Authorization interceptor.
- Correlation ID handling if supported.
- Centralized error normalization.
- API response typing.
- Request cancellation where useful.
- Consistent loading and error handling.

Use TanStack Query for:

- Server-state fetching.
- Caching.
- Mutations.
- Invalidating affected queries.
- Refetching after successful operations.

Do not put API calls directly inside page components.

Each feature must have its own service layer.

### Backend response compatibility

Inspect the actual ApiResponse and PagedResponse classes.

Adapt frontend types to their real JSON structures.

Do not assume every response follows a generic `{success, data, message}` structure without verifying it.

---

# 10. ENVIRONMENT CONFIGURATION

Create `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Use environment-based configuration.

Do not place:

- Database credentials.
- Supabase service role keys.
- JWT signing secrets.
- Backend private API keys.

inside frontend environment variables.

Only expose public configuration.

---

# 11. USER EXPERIENCE REQUIREMENTS

Every page must have:

- Loading state.
- Empty state.
- Error state.
- Permission-denied state where appropriate.
- Responsive layout.
- Form validation.
- Clear success feedback.

Every action button must perform a real operation or clearly indicate that the feature is not implemented.

Use confirmation dialogs for:

- Deactivation.
- Deletion.
- Rejection.
- Financial approval.
- Other consequential operations.

Avoid silently changing application status.

---

# 12. DEVELOPMENT AND IMPLEMENTATION ORDER

Work incrementally.

### Phase 1 — Frontend foundation

- Initialize React/Vite.
- Configure TypeScript.
- Configure Tailwind CSS.
- Configure shadcn/ui.
- Set up routing.
- Create the design system.
- Build the application shell.

### Phase 2 — Authentication

- Login page.
- Registration page.
- Session management.
- Protected routes.
- Current user profile.
- Role-based navigation.

### Phase 3 — Existing backend integration

Integrate only verified, implemented endpoints:

- User management.
- Roles.
- Regions.
- Settings.
- Audit logs.
- Authentication.

### Phase 4 — Government administration showcase

- Dashboard.
- Scheme listing.
- Beneficiary listing.
- Application listing.
- Details pages.
- Filters and pagination.

Use mock data only for backend capabilities that do not exist yet, and isolate it behind a demo-data service.

### Phase 5 — Future workflow interfaces

Build the eligibility and multi-step verification interfaces based on their approved Kiro requirements and actual backend contracts.

### Phase 6 — Testing and polish

- Component tests.
- Form validation tests.
- Routing tests.
- API service tests.
- Authentication flow tests.
- Responsive layout checks.
- Accessibility checks.
- Build verification.

---

# 13. TESTING REQUIREMENTS

Use Vitest and React Testing Library.

Test:

- Login validation.
- Authentication success and failure.
- Protected route behavior.
- Role-based navigation.
- API request authorization headers.
- API error handling.
- Table pagination and filtering.
- Form validation.
- Loading and empty states.
- Permission-restricted actions.

Ensure:

```bash
npm run build
npm run test
```

complete successfully.

---

# 14. IMPORTANT IMPLEMENTATION RULES

1. Inspect the backend before implementing API integration.
2. Never invent REST endpoints or DTO properties.
3. Do not duplicate backend business logic in React.
4. Do not trust frontend role checks as authorization.
5. Do not expose secrets.
6. Keep mock data separate from production API services.
7. Do not represent unimplemented modules as functional.
8. Maintain strict TypeScript typing.
9. Use reusable components.
10. Preserve the existing backend code and folder structure.
11. Do not modify backend code unless explicitly necessary; document missing endpoints separately.
12. Do not generate all modules in one unverified step.

---

# 15. DEFINITION OF DONE

The frontend is considered complete for the currently implemented backend scope when:

- React application builds successfully.
- Government portal layout is responsive.
- Login works against the real backend.
- JWT authentication works.
- Current user information is retrieved correctly.
- Protected routes work.
- Role-based navigation works.
- Existing user, role, region and settings APIs are integrated where implemented.
- Audit logs can be viewed by authorized users.
- API errors are handled consistently.
- Dashboard and management screens are functional or clearly marked as demo.
- No fake API integrations are presented as real.
- No secrets are exposed.
- Tests pass.

Start by inspecting the backend and producing:

1. Backend API inventory.
2. Role and permission matrix.
3. Frontend page and route map.
4. Backend-to-frontend integration matrix.
5. Proposed component architecture.
6. Implementation task breakdown.

After presenting the analysis, proceed incrementally with Phase 1.

The objective is to deliver a maintainable, production-oriented government enterprise frontend that accurately reflects the actual capabilities of the GSDTS backend.