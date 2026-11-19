# Milestone 2 frontend showcase

## Routes/pages

- `/milestone-2` — navigation-accessible live API walkthrough and latest application status.
- `/admin/beneficiaries` — beneficiary list and client-side search within the loaded page.
- `/admin/beneficiaries/new` — register a beneficiary.
- `/admin/beneficiaries/:id` — view and edit beneficiary profile.
- `/schemes` and `/schemes/:id` — scheme catalogue, grant limits, dates, status and any rules/templates returned.
- `/applications/new` — select beneficiary and open scheme, enter requested amount, submit, and advance a returned DRAFT to SUBMITTED through the status API.
- `/applications` and `/applications/:id` — application register, current status, eligibility result placeholders and accessible audit events.
- `/verification` and `/verification/:id` — status/level filters, application detail and UI-gated status actions.

All routes remain under the existing authenticated `AppShell`/`ProtectedRoute`. Sidebar role filtering follows existing conventions; backend authorization remains authoritative.

## Required API endpoints

Configure `VITE_API_BASE_URL` to the backend `/api/v1` base. The experience calls `GET/POST /beneficiaries`, `GET/PUT /beneficiaries/{id}`, `GET /schemes`, `GET /schemes/{id}`, `GET/POST /applications`, `GET /applications/{id}`, `PATCH /applications/{id}/status`, and administrator-only `GET /audit?referenceNo=...`. Exact request/response notes are in [BACKEND-API-MAPPING.md](BACKEND-API-MAPPING.md).

## Example test flow

1. Sign in with an authorized account and open `/milestone-2`.
2. Register a beneficiary through the Beneficiaries link (or choose an existing record).
3. Choose an OPEN scheme and review its status and grant limits.
4. Submit a request amount between those backend-provided limits.
5. Follow the confirmation to application detail; the current backend returns status and reference, but not eligibility scoring.
6. Open Verification. Authorized staff can use available status actions. The backend validates every transition. Application audit history is accessible only if the caller can query ADMIN-only `/audit`.

Sample data identifiers are environment-specific. Use the beneficiary and scheme IDs returned by the live API; no identifiers or mock dataset are hardcoded.

## Tests

From `frontend/`, run `npm test` for Vitest. `npm run build` performs TypeScript project checks and the Vite production build. Focused examples cover service calls/envelope errors, beneficiary registration/list UI, application submission/status service, workflow action gating, and eligibility status/score rendering.

## Backend contract assumptions

- Standard success envelope and paged response match `frontend/src/types/api.types.ts` and the existing API client.
- Beneficiary and scheme list endpoints support `page` and `size`; no beneficiary `q` search parameter exists in the checked-in controller.
- Current beneficiary and scheme DTOs do not include scheme eligibility criteria, tranche templates, beneficiary eligibility attributes, or score result.
- Current application create accepts a caller-provided `referenceNo`; UI creates a unique-looking reference for the request, while uniqueness is validated by backend.
- Current generic application status endpoint accepts `{status}` and validates allowed transitions. UI transition mapping is a temporary affordance, not a business-rule source of truth.
- No implemented eligibility-check/score, assigned verification level, comment-required decision, escalation, or application-history endpoint was found in backend Java sources. Escalation is unavailable in UI until a contract is published. The only history integration uses `/audit`, restricted to ADMIN.
- Error details may include `fieldErrors`; 401 redirects through the shared client, 403 displays permission state, and other API failures display retry/error feedback.