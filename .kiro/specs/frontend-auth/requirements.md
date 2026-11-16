# Frontend Auth — Requirements

Phase 2 of the GSDTS frontend. Builds on the completed Phase 1 foundation
(`frontend-foundation`). Integrates only the three endpoints that exist in
`AuthController`:

| Method | URL | Auth required |
|--------|-----|---------------|
| POST | `/api/v1/auth/register` | No |
| POST | `/api/v1/auth/login` | No |
| GET | `/api/v1/auth/me` | Bearer JWT |

No other auth endpoints exist in the backend.

---

## Verified backend contracts

### POST /api/v1/auth/login

Request body (`LoginRequest`):
```json
{ "username": "string (required)", "password": "string (required)" }
```

Success `200` — envelope `ApiResponse<TokenResponse>`:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "string",
    "tokenType": "Bearer",
    "expiresAt": "ISO-8601 instant"
  }
}
```

Errors: `401 UNAUTHENTICATED` (wrong credentials), `423 TOO_MANY_ATTEMPTS`
(account locked), `400 VALIDATION_FAILED` (blank fields).

### POST /api/v1/auth/register

Request body (`RegisterRequest`):
```json
{
  "username":  "4–50 chars, pattern ^[a-zA-Z0-9._-]+$",
  "password":  "8–72 chars, ≥1 letter AND ≥1 digit",
  "fullName":  "2–150 chars",
  "email":     "valid email",
  "phone":     "optional, pattern ^(\\+91)?[6-9]\\d{9}$"
}
```

Success `201` — envelope `ApiResponse<UserResponse>`.

Errors: `409 DUPLICATE_RESOURCE` (username or email taken),
`400 VALIDATION_FAILED` with `fieldErrors` array, `400 BUSINESS_RULE`.

Registration always produces a `BENEFICIARY` role; the role is assigned
server-side — the client does not send it.

### GET /api/v1/auth/me

Header: `Authorization: Bearer <token>`

Success `200` — envelope `ApiResponse<UserResponse>`:
```json
{
  "success": true,
  "data": {
    "id":        "UUID",
    "username":  "string",
    "fullName":  "string",
    "email":     "string",
    "phone":     "string | null",
    "active":    "boolean",
    "role":      "ADMIN | BENEFICIARY | FIELD_OFFICER | DISTRICT_OFFICER | FINANCE_APPROVER",
    "regionIds": "[long, ...]",
    "createdAt": "ISO-8601 instant",
    "updatedAt": "ISO-8601 instant"
  }
}
```

Errors: `401 UNAUTHENTICATED`.

---

## R-1 Login page

**R-1.1** A login page at `/login` accepts `username` and `password` via
React Hook Form + Zod.

**R-1.2** The Zod schema enforces: both fields non-empty. No client-side
password-strength check on the login form (the backend decides).

**R-1.3** A show/hide toggle reveals or masks the password field.

**R-1.4** The submit button shows a spinner and is disabled while the request
is in flight.

**R-1.5** A backend error (401, 423, network) renders a visible inline error
message. The `message` field from `ApiResponse` is shown verbatim; a generic
fallback is used when the response is not parseable.

**R-1.6** On success the JWT is written to `localStorage` under the key
`gsdts_access_token` and the expiry instant under `gsdts_token_expires_at`.
The user is redirected to the dashboard (`/`). `localStorage` is chosen
because the backend issues the token in the response body and does not set an
HttpOnly cookie. Trade-offs are documented in §Storage trade-offs below.

**R-1.7** The page is styled as a government portal: navy header band,
ministry seal placeholder, `#F4F7FA` background, card centered on the
viewport.

**R-1.8** An authenticated user who visits `/login` is redirected to `/`.

---

## R-2 Registration page

**R-2.1** A registration page at `/register` accepts exactly the five fields
from `RegisterRequest`: `username`, `password`, `fullName`, `email`, `phone`
(optional).

**R-2.2** Zod schema mirrors backend constraints:
- `username`: 4–50 chars, regex `^[a-zA-Z0-9._-]+$`
- `password`: 8–72 chars, must contain ≥1 letter and ≥1 digit
- `fullName`: 2–150 chars
- `email`: valid email
- `phone`: optional; when provided matches `^(\+91)?[6-9]\d{9}$`

**R-2.3** Inline validation messages appear on blur and on submit.

**R-2.4** Success (201) shows a toast notification and redirects to `/login`.

**R-2.5** A `409 DUPLICATE_RESOURCE` error renders "Username already taken" or
"Email already registered" depending on the `message` field. Field-level
`fieldErrors` from a `400 VALIDATION_FAILED` response are mapped back to the
corresponding form fields.

**R-2.6** A "Back to Login" link is always visible.

---

## R-3 JWT and token storage

**R-3.1** On login success, store `accessToken` in `localStorage` key
`gsdts_access_token` and `expiresAt` in `gsdts_token_expires_at`.

**R-3.2** On logout or 401, remove both keys and clear the auth context.

**R-3.3** On app startup, read the stored token before making any authenticated
request. If `expiresAt` is in the past, treat the session as expired: clear
storage and show the login page.

**Storage trade-offs (documented):**  
`localStorage` is accessible to any same-origin JavaScript, making the token
vulnerable to XSS. The backend does not set an HttpOnly cookie; there is no
refresh-token endpoint. Mitigations: short 30-minute TTL (server-enforced),
CSP headers on the backend, no token in URLs or logs, automatic expiry check
on startup and on every 401. If the backend later adds HttpOnly cookie support,
this service layer is the only file that needs to change.

---

## R-4 Axios interceptor

**R-4.1** A single Axios instance (`src/services/api-client.ts`) is used for
all requests.

**R-4.2** A request interceptor reads `gsdts_access_token` from localStorage
and attaches `Authorization: Bearer <token>` to every outgoing request (skipped
if the token is absent).

**R-4.3** A response interceptor catches `401` responses, clears stored tokens,
clears the auth context, and redirects to `/login`. It does this once per
failed response; it does not create a retry loop.

**R-4.4** Non-401 errors are re-thrown as-is so the calling query/mutation can
handle them.

---

## R-5 Auth context

**R-5.1** `AuthContext` (`src/contexts/AuthContext.tsx`) exposes:
```ts
interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isInitializing: boolean;   // true while the /me call is in flight on startup
  login: (token: TokenResponse) => Promise<void>;
  logout: () => void;
}
```

**R-5.2** On mount, if a non-expired token exists in localStorage, `AuthContext`
calls `GET /api/v1/auth/me` to hydrate `user`. While this call is in flight,
`isInitializing` is `true`.

**R-5.3** No protected content is rendered while `isInitializing` is `true`.
A full-page centered spinner is shown instead.

**R-5.4** If the `/me` call returns 401 or the token is expired, the context
clears the token and sets `user` to `null`.

**R-5.5** `login(tokenResponse)` stores the token (R-3.1), calls `/me`, and
sets `user`.

**R-5.6** `logout()` calls `R-3.2` and sets `user` to `null`.

---

## R-6 Protected routes and role-based sidebar

**R-6.1** A `ProtectedRoute` wrapper redirects unauthenticated users to
`/login` (preserving the attempted path in `state.from`).

**R-6.2** An optional `allowedRoles` prop on `ProtectedRoute` renders a
403-style "Access Denied" page if the authenticated user's role is not in the
list.

**R-6.3** After login, if `state.from` is set, redirect there; otherwise
redirect to the role-appropriate default route:

| Role | Default route |
|------|---------------|
| ADMIN | `/admin/dashboard` |
| BENEFICIARY | `/portal/dashboard` |
| FIELD_OFFICER | `/field/dashboard` |
| DISTRICT_OFFICER | `/district/dashboard` |
| FINANCE_APPROVER | `/finance/dashboard` |

**R-6.4** The sidebar (`Sidebar.tsx`, built in Phase 1) renders only the
navigation items permitted for the current user's role. Roles and their
permitted links:

| Role | Permitted top-level sections |
|------|------------------------------|
| ADMIN | Dashboard, Users, Regions, Schemes, Beneficiaries, Applications, Audit Logs, Settings |
| BENEFICIARY | My Dashboard, Available Schemes, My Applications, My Profile |
| FIELD_OFFICER | My Dashboard, Verification Tasks, My Profile |
| DISTRICT_OFFICER | My Dashboard, Application Queue, My Profile |
| FINANCE_APPROVER | My Dashboard, Finance Queue, My Profile |

**R-6.5** Route sections not yet implemented show a "Coming soon" placeholder
page, not a 404 or broken link.

---

## R-7 Header user display

**R-7.1** The `Header` component (Phase 1) displays `user.fullName` and a
human-readable role label in the top-right corner when authenticated.

**R-7.2** Role labels:

| Backend value | Display label |
|---------------|---------------|
| ADMIN | Administrator |
| BENEFICIARY | Beneficiary |
| FIELD_OFFICER | Field Officer |
| DISTRICT_OFFICER | District Officer |
| FINANCE_APPROVER | Finance Approver |

**R-7.3** A "Logout" button/menu item in the header triggers `logout()` and
redirects to `/login`.

**R-7.4** The header shows only a minimal skeleton (no user name) while
`isInitializing` is `true`.

---

## R-8 Tests

All tests use Vitest + React Testing Library with MSW (Mock Service Worker) or
`vi.mock` to intercept HTTP calls. No real backend is required.

**R-8.1** Login form: renders fields, blocks submit when fields are empty,
shows password toggle, calls the API on submit, redirects on success, shows
error message on 401.

**R-8.2** Registration form: renders all five fields, validates each constraint
client-side, maps `fieldErrors` from a 400 response to form fields, shows
toast and redirects on 201.

**R-8.3** `AuthContext`: initializes as `isInitializing = true`, resolves to
`user` when `/me` succeeds, clears state when `/me` returns 401.

**R-8.4** `ProtectedRoute`: redirects to `/login` when unauthenticated, renders
children when authenticated, shows Access Denied when role is not in
`allowedRoles`.

**R-8.5** Axios interceptor: attaches Bearer token when present, redirects on
401 response, does not loop on repeated 401s.
