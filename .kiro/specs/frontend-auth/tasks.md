# Frontend Auth — Tasks

## T-1 Types

- [ ] **T-1.1** Create `src/types/auth.ts` with `TokenResponse`, `UserResponse`,
  `UserRole`, `ApiResponse<T>`, `LoginFormValues`, `RegisterFormValues`.

---

## T-2 Token storage helpers

- [ ] **T-2.1** Add `saveTokens`, `clearTokens`, `getAccessToken`, `isTokenExpired`
  to `src/services/api-client.ts` (or a co-located `token-storage.ts`).
  Export them for tests.

---

## T-3 Axios instance and interceptors

- [ ] **T-3.1** Create the Axios instance in `src/services/api-client.ts` with
  `baseURL` from `VITE_API_BASE_URL`.
- [ ] **T-3.2** Add request interceptor: attach `Authorization: Bearer` when a
  valid token exists.
- [ ] **T-3.3** Add response interceptor: on 401, clear tokens, set
  `_redirecting` guard, call `window.location.replace('/login')`.
- [ ] **T-3.4** Define `ApiError` class carrying `errorCode`, `message`, and
  optional `fieldErrors`; throw it from the interceptor for all non-2xx
  responses.

---

## T-4 Auth service

- [ ] **T-4.1** Create `src/services/auth.service.ts` with:
  - `login(data: LoginFormValues): Promise<TokenResponse>`
  - `register(data: RegisterFormValues): Promise<UserResponse>`
  - `getMe(): Promise<UserResponse>`

  All three use the central Axios instance. No business logic — only HTTP calls
  and envelope unwrapping (`response.data.data`).

---

## T-5 Auth context

- [ ] **T-5.1** Create `src/contexts/AuthContext.tsx` with the shape from R-5.1.
- [ ] **T-5.2** Implement startup hydration: on mount, check `getAccessToken()`;
  if present, call `getMe()`, set `user`, handle 401.
- [ ] **T-5.3** Implement `login(tokenResp)`: save tokens, call `getMe()`, set user.
- [ ] **T-5.4** Implement `logout()`: clear tokens, set user to null.
- [ ] **T-5.5** Create `src/features/auth/hooks/useAuth.ts` re-exporting
  `useContext(AuthContext)` with a null-guard throw.

---

## T-6 Zod schemas

- [ ] **T-6.1** Create `src/features/auth/schemas/login.schema.ts`: username and
  password both non-empty strings.
- [ ] **T-6.2** Create `src/features/auth/schemas/register.schema.ts`: mirror
  all five `RegisterRequest` constraints including password letter+digit rule.

---

## T-7 Shared component

- [ ] **T-7.1** Create `src/features/auth/components/PasswordInput.tsx`: a
  shadcn `Input`-compatible wrapper with an eye / eye-off toggle button.

---

## T-8 Login page

- [ ] **T-8.1** Create `src/features/auth/pages/LoginPage.tsx`.
  - Use `useForm` + `zodResolver(loginSchema)`.
  - Call `authService.login()` on valid submit.
  - On success: call `auth.login(tokenResp)`, redirect to role-default or
    `state.from`.
  - On error: display `apiError.message` in an alert below the form.
  - Spinner + disabled button while `isSubmitting`.
  - Show/hide password via `PasswordInput`.
  - Government portal banner (`#12304A`), centered card (`max-w-md`).
  - Link to `/register`.
  - Redirect to `/` if already authenticated.

---

## T-9 Registration page

- [ ] **T-9.1** Create `src/features/auth/pages/RegisterPage.tsx`.
  - Fields: `fullName`, `username`, `email`, `password`, `phone` (optional).
  - Use `useForm` + `zodResolver(registerSchema)`.
  - Call `authService.register()` on valid submit.
  - On `201`: show toast "Registration successful. Please log in.", redirect
    to `/login`.
  - On `400` with `fieldErrors`: map each `{ field, message }` to the
    corresponding `setError(field, { message })`.
  - On `409`: show inline error from `apiError.message`.
  - Spinner + disabled button while submitting.
  - Password helper text visible below the password field.
  - Link back to `/login`.

---

## T-10 ProtectedRoute

- [ ] **T-10.1** Create `src/routes/ProtectedRoute.tsx` per design §6.
  - `isInitializing` → `<FullPageSpinner />`.
  - Not authenticated → `<Navigate to="/login" state={{ from: location }} />`.
  - Role not allowed → `<AccessDeniedPage />`.
  - Otherwise → `<Outlet />`.

---

## T-11 AccessDenied and ComingSoon pages

- [ ] **T-11.1** Create `src/features/auth/pages/AccessDeniedPage.tsx`: simple
  centered message with a "Go back" link.
- [ ] **T-11.2** Create `src/components/ComingSoonPage.tsx`: "Feature coming
  soon" placeholder reusable across roles.

---

## T-12 Router updates

- [ ] **T-12.1** Add public routes `/login` and `/register` outside the
  `ProtectedRoute` wrapper in `src/app/router.tsx`.
- [ ] **T-12.2** Wrap all existing authenticated routes with `<ProtectedRoute>`.
- [ ] **T-12.3** Add role-scoped sub-trees (`/admin/*`, `/portal/*`, `/field/*`,
  `/district/*`, `/finance/*`) each with `allowedRoles`.
- [ ] **T-12.4** Add an index route at `/` that redirects based on `user.role`
  using a `RoleRedirect` component.

---

## T-13 Sidebar and Header updates

- [ ] **T-13.1** Define the `navItems: NavItem[]` array in `src/components/layout/Sidebar.tsx`
  covering all five roles and all sections from R-6.4.
- [ ] **T-13.2** Filter `navItems` by `user?.role` before rendering.
- [ ] **T-13.3** Update `src/components/layout/Header.tsx`:
  - Display `user.fullName` and role display label (R-7.2).
  - Show skeleton while `isInitializing`.
  - Add "Sign Out" button that calls `auth.logout()` and navigates to `/login`.

---

## T-14 Tests

- [ ] **T-14.1** `src/features/auth/__tests__/LoginPage.test.tsx`  
  Covers: renders fields, blocks empty submit, shows errors, success redirect,
  password toggle.
- [ ] **T-14.2** `src/features/auth/__tests__/RegisterPage.test.tsx`  
  Covers: renders five fields, Zod errors on blur, 400 fieldErrors mapping,
  409 inline error, success toast + redirect.
- [ ] **T-14.3** `src/contexts/__tests__/AuthContext.test.tsx`  
  Covers: `isInitializing` on mount, hydration success, 401 clears state,
  `login()` happy path, `logout()`.
- [ ] **T-14.4** `src/routes/__tests__/ProtectedRoute.test.tsx`  
  Covers: unauthenticated redirect, authenticated render, role-blocked
  Access Denied.
- [ ] **T-14.5** `src/services/__tests__/api-client.test.ts`  
  Covers: Bearer header present, absent when no token, 401 triggers redirect,
  no double-redirect.

---

## T-15 Build verification

- [ ] **T-15.1** Run `npm run build` — zero TypeScript errors, zero Vite warnings.
- [ ] **T-15.2** Run `npm run test` — all Phase 2 tests pass.
