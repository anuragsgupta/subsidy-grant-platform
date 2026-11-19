# Frontend/backend API mapping

Frontend calls use the shared authenticated Axios client. Its base URL is `VITE_API_BASE_URL`; configure it with the backend API root so the backend `/api/v1` prefix is included. The client attaches the bearer token, unwraps the standard `ApiResponse<T>.data`, normalizes errors as `ApiError`, redirects on 401, and preserves field validation messages.

## Milestone 2 endpoints currently implemented

| UI operation | Method and path (relative to `/api/v1`) | Contract |
|---|---|---|
| List beneficiaries | `GET /beneficiaries?page=0&size=100` | `PagedResponse<BeneficiarySummary>`; backend currently supports pagination only, not text search. UI filters the returned page locally. |
| Beneficiary detail | `GET /beneficiaries/{id}` | `BeneficiaryResponse` |
| Register beneficiary | `POST /beneficiaries` | `CreateBeneficiaryRequest` → `BeneficiaryResponse` |
| Update beneficiary | `PUT /beneficiaries/{id}` | `UpdateBeneficiaryRequest` → `BeneficiaryResponse` |
| List schemes | `GET /schemes?page=0&size=100` | `PagedResponse<SchemeSummaryResponse>` |
| Scheme detail | `GET /schemes/{id}` | `SchemeResponse` |
| List applications | `GET /applications?page=0&size=100` | `PagedResponse<ApplicationSummaryResponse>` |
| Submit application | `POST /applications` | `{beneficiaryId, schemeId, referenceNo, requestedAmount}` → `ApplicationResponse` |
| Change application status | `PATCH /applications/{id}/status` | `{status}` → `ApplicationResponse`; state machine enforced by the backend |
| Admin audit search | `GET /audit?referenceNo=...&page=0&size=100` | `PagedResponse<AuditLogResponse>`; endpoint is ADMIN-only |

Success responses are Spring `ApiResponse<T>` envelopes with `data`; paginated payloads use `content`, `currentPage`, `pageSize`, `totalElements`, `totalPages`, and `last`. Delete returns 204. Existing client handles 401 globally and callers render 403/404/500/validation failures through shared query/error states and `ApiError`.

## Contract gaps and temporary UI adapters

The checked-in backend Java controllers currently do not implement scheme criteria/template/budget endpoints or eligibility preview; application eligibility score/results, risk tier, assigned verification level, workflow assignment, comments, escalation queue/action, application history, and non-admin application audit access are also absent. The broader requirements and scheme-eligibility spec describe some of these as planned APIs, but those docs are not treated as implemented contracts.

Temporary frontend adapter: verification approve/reject/clarification buttons map to the existing generic application status endpoint and mirror the known transition graph in UI gating. This does not claim to enforce backend authorization or replace server-side transition validation. The escalation control is disabled. A missing score/decision/owner is shown as Pending/Not returned, never synthesized. Remove/replace this adapter when dedicated workflow API contracts are implemented.

Beneficiary API currently does not support a search query and its detail DTO has no eligibility attributes. Local search only covers the current page; beneficiary registry and form access depend on backend authorization. Scheme response DTO currently includes base scheme fields only, so absent rules/templates are clearly indicated.