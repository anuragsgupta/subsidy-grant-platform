# Frontend Auth — Design

## 1. File map

```
frontend/src/
├── contexts/
│   └── AuthContext.tsx          # R-5: auth state, /me hydration, login/logout
│
├── services/
│   ├── api-client.ts            # R-4: Axios instance + interceptors
│   └── auth.service.ts          # login(), register(), getMe() — no Axios inline in pages
│
├── types/
│   └── auth.ts                  # TokenResponse, UserResponse, LoginRequest,
│                                #   RegisterRequest, ApiResponse<T>
│
├── features/auth/
│   ├── components/
│   │   └── PasswordInput.tsx    # Controlled input with show/hide toggle (R-1.3)
│   ├── pages/
│   │   ├── LoginPage.tsx        # R-1
│   │   └── RegisterPage.tsx     # R-2
│   ├── hooks/
│   │   └── useAuth.ts           # Convenience re-export of useContext(AuthContext)
│   └── schemas/
│       ├── login.schema.ts      # Zod schema for login form
│       └── register.schema.ts   # Zod schema for registration form
│
├── components/
│   └── layout/
│       ├── Sidebar.tsx          # Role-filtered nav (R-6.4) — extended from Phase 1
│       └── Header.tsx           # User name + role label + logout (R-7) — extended
│
├── routes/
│   └── ProtectedRoute.tsx       # R-6.1, R-6.2
│
└── app/
    └── router.tsx               # Route tree with ProtectedRoute wrappers
```

---

## 2. Types (`src/types/auth.ts`)

Exact mapping from backend records:

```ts
// mirrors TokenResponse.java
export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;        // ISO-8601 instant, stored as string
}

// mirrors UserResponse.java
export interface UserResponse {
  id: string;               // UUID
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  active: boolean;
  role: UserRole;
  regionIds: number[];
  createdAt: string;
  updatedAt: string;
}

export type UserRole =
  | 'ADMIN'
  | 'BENEFICIARY'
  | 'FIELD_OFFICER'
  | 'DISTRICT_OFFICER'
  | 'FINANCE_APPROVER';

// mirrors ApiResponse<T>.java
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  errorCode?: string;
  data?: T;
  fieldErrors?: { field: string; message: string }[];
  timestamp: string;
  correlationId?: string;
}
```

---

## 3. Token storage (`src/services/api-client.ts`)

Storage keys:
```ts
const TOKEN_KEY    = 'gsdts_access_token';
const EXPIRES_KEY  = 'gsdts_token_expires_at';
```

Helper functions (all synchronous, exported for tests):
```ts
export function saveTokens(resp: TokenResponse): void
export function clearTokens(): void
export function getAccessToken(): string | null    // returns null if expired
export function isTokenExpired(): boolean
```

`getAccessToken` compares `Date.now()` to the stored `expiresAt`; if expired,
it calls `clearTokens()` and returns `null`.

---

## 4. Axios instance and interceptors

```
api = axios.create({ baseURL: VITE_API_BASE_URL })
```

**Request interceptor** — reads `getAccessToken()`, attaches header if present.

**Response interceptor** — on 401, calls `clearTokens()` and
`window.location.replace('/login')`. Uses a single flag (`_redirecting`) to
prevent redirect loops when the browser fires multiple parallel requests.

Error responses from the backend follow `ApiResponse<null>`:
```ts
{
  success: false,
  message: "...",
  errorCode: "UNAUTHENTICATED | ACCESS_DENIED | DUPLICATE_RESOURCE | ...",
  fieldErrors?: [{ field, message }]
}
```
The interceptor extracts `error.response.data` and re-throws it as an
`ApiError` class so callers can narrow by `errorCode`.

---

## 5. Auth context

```ts
// mount behavior
useEffect(() => {
  const token = getAccessToken();
  if (!token) { setInitializing(false); return; }
  authService.getMe()
    .then(user => setUser(user))
    .catch(() => { clearTokens(); setUser(null); })
    .finally(() => setInitializing(false));
}, []);
```

`login(tokenResp)`:
1. `saveTokens(tokenResp)`
2. `const user = await authService.getMe()`
3. `setUser(user)`

`logout()`:
1. `clearTokens()`
2. `setUser(null)`

---

## 6. ProtectedRoute

```tsx
function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const { user, isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && !allowedRoles.includes(user!.role))
    return <AccessDeniedPage />;
  return <Outlet />;
}
```

---

## 7. Route tree additions

Public routes (no wrapper):
- `/login` → `LoginPage`
- `/register` → `RegisterPage`

Protected root (wraps all authenticated pages):
- `<ProtectedRoute>` → `<AppShell>` → child `<Outlet>`

Role-scoped sub-trees (each wrapped with `allowedRoles`):
- `/admin/*` → `['ADMIN']`
- `/portal/*` → `['BENEFICIARY']`
- `/field/*` → `['FIELD_OFFICER']`
- `/district/*` → `['DISTRICT_OFFICER']`
- `/finance/*` → `['FINANCE_APPROVER']`

Index route (`/`) redirects to the role-appropriate default after auth (R-6.3).

Unimplemented sections render `<ComingSoonPage>`.

---

## 8. Sidebar nav config

Defined as a typed array — no logic in JSX:

```ts
interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
}
```

The `Sidebar` component filters `navItems` by `user.role` before rendering.
No nav item performs a backend call; navigation is client-side only.

---

## 9. Login page layout

```
┌────────────────────────────────────────────┐
│  [Navy banner] Government of India         │
│  Ministry of Finance — GSDTS               │
├────────────────────────────────────────────┤
│                                            │
│      ┌──────────────────────────────┐      │
│      │  [Seal placeholder]          │      │
│      │  Government Subsidy &        │      │
│      │  Disbursement Tracking       │      │
│      │                              │      │
│      │  Username ________________   │      │
│      │  Password ________________ 👁│      │
│      │                              │      │
│      │  [error message if any]      │      │
│      │                              │      │
│      │  [Sign In ▸]                 │      │
│      │  New beneficiary? Register   │      │
│      └──────────────────────────────┘      │
│                                            │
└────────────────────────────────────────────┘
```

Background: `#F4F7FA`. Card: white, `rounded-lg shadow-md`, max-w-md.
Banner: `#12304A` text white.

---

## 10. Registration page layout

Same banner. Card wider (max-w-lg). Fields in order:
Full Name → Username → Email → Password → Phone (optional, labelled as such).

Password field has show/hide toggle and a helper text:
"Min 8 characters, must include at least one letter and one digit."

---

## 11. Header user widget

```
[Avatar initials]  Priya Sharma       ▾
                   District Officer
```

Dropdown: "My Profile" (Coming Soon), "Sign Out".  
Renders a skeleton placeholder while `isInitializing`.

---

## 12. Test plan

| Test file | Scope | Mocking |
|-----------|-------|---------|
| `LoginPage.test.tsx` | form validation, submit flow, error display | `vi.mock('../services/auth.service')` |
| `RegisterPage.test.tsx` | field validation, 400 fieldErrors, 409, success | same |
| `AuthContext.test.tsx` | startup hydration, login, logout, 401 on /me | `vi.mock('../services/api-client')` |
| `ProtectedRoute.test.tsx` | redirect, children, Access Denied | `vi.mock('../contexts/AuthContext')` |
| `api-client.test.ts` | Bearer header, 401 redirect, no loop | axios-mock-adapter or MSW node |

Each test file imports only its unit; real HTTP is never called.
