# Email Password Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible phone/GitHub gate with email-password login and email-code registration backed by single-use, rate-limited verification codes.

**Architecture:** Keep the existing auth token/cookie and user persistence contracts. Add explicit email registration and password-login services/routes, reuse Resend and the existing email-code table with security metadata, then replace only the unauthenticated gate presentation and API calls.

**Tech Stack:** React 18, Mantine, Hono, Prisma/PostgreSQL, Zod, Web Crypto, Resend, Vitest, Playwright.

---

## File Map

- Modify `apps/hono-api/schema.sql` and `apps/hono-api/prisma/schema.prisma` for email-code purpose and attempt count.
- Modify `apps/hono-api/src/config.ts`, `types.ts`, `platform/node/node-env.ts`, and `.env.example` for `AUTH_OTP_PEPPER` and Resend documentation.
- Modify `apps/hono-api/src/modules/auth/auth.schemas.ts`, `auth.service.ts`, and `auth.routes.ts` for registration and password login.
- Modify `apps/hono-api/src/modules/auth/auth.service.test.ts` and add route/schema tests for backend TDD.
- Modify `apps/web/src/api/server.ts` for typed registration and email-password calls.
- Modify `apps/web/src/auth/GithubGate.tsx` into the email login/register gate while retaining its exported integration surface.
- Modify `apps/web/src/App.tsx` to stop rendering the phone password setup guide.
- Modify `apps/web/vite.config.ts` and env documentation so GitHub OAuth is optional.
- Add `apps/web/_test/unit/emailAuthGate.test.tsx` and an authenticated browser regression for the visible gate.

## Task 1: Lock Backend Contracts With Failing Tests

- [ ] Add Zod tests for normalized email, six-digit code, password length, and mismatched request shapes.
- [ ] Add service tests for request cooldown, daily limit, invalidation of old codes, delivery failure invalidation, five wrong attempts, expiry, and atomic single consumption.
- [ ] Add service tests for new registration, claiming one existing email account, rejecting duplicate-email ambiguity, disabled/deleted accounts, and password login.
- [ ] Add route tests for all three new endpoints and auth-cookie attachment.
- [ ] Run the focused API test command and record expected failures before production edits:

```powershell
corepack pnpm --filter @tapcanvas/hono-api exec vitest run src/modules/auth/auth.schemas.test.ts src/modules/auth/auth.service.test.ts src/modules/auth/auth.routes.test.ts
```

## Task 2: Implement Verification Storage And Configuration

- [ ] Add `purpose` and `attempt_count` to SQL and Prisma schemas with safe defaults.
- [ ] Add `authOtpPepper` to config/type/node environment mapping.
- [ ] Document `RESEND_API_KEY`, `RESEND_FROM`, `AUTH_OTP_PEPPER`, and non-production-only `EMAIL_LOGIN_DEBUG` in `.env.example`.
- [ ] Regenerate the Prisma client using the repository package script.
- [ ] Run config/schema-focused tests and require GREEN.

## Task 3: Implement Secure Email Registration Services

- [ ] Add normalized-email helpers and HMAC code hashing with the configured pepper.
- [ ] Implement request limits: 60-second cooldown and daily per-email cap.
- [ ] Invalidate prior `register` codes before inserting the new record.
- [ ] Return `devCode` only when `NODE_ENV !== 'production'` and debug is explicitly enabled.
- [ ] Invalidate the record when Resend delivery fails.
- [ ] Verify the latest `register` code, increment failed attempts, invalidate at five, and atomically consume success.
- [ ] In one transaction, resolve zero/one/multiple matching email accounts, create or claim exactly one user, write the PBKDF2 password, and preserve existing role/data.
- [ ] Run the Task 1 tests and require GREEN.

## Task 4: Implement Email Password Login And Routes

- [ ] Add `EmailRegisterRequestSchema`, `EmailRegisterVerifySchema`, and `EmailPasswordLoginRequestSchema`.
- [ ] Implement email password lookup with generic invalid-credential errors and duplicate conflict handling.
- [ ] Register `/email/register/request`, `/email/register/verify`, and `/email/password-login` routes.
- [ ] Parse the existing `AuthResponseSchema` and attach the existing auth cookie on successful registration/login.
- [ ] Keep old passwordless email routes disabled and phone/GitHub routes unchanged.
- [ ] Run route/service/schema tests and require GREEN.

## Task 5: Lock Frontend Behavior With Failing Tests

- [ ] Add a real render test for login/register tabs and visible Chinese labels.
- [ ] Assert phone and GitHub controls are absent.
- [ ] Test invalid email, password mismatch, send cooldown, API loading, debug-code fill, and server errors.
- [ ] Test successful login and registration call the existing `setAuth`/redirect completion path.
- [ ] Run and record RED:

```powershell
corepack pnpm --filter @tapcanvas/web exec vitest run --config _test/vitest.config.ts _test/unit/emailAuthGate.test.tsx
```

## Task 6: Implement The Email Login/Register Gate

- [ ] Add typed web API functions for the three new endpoints.
- [ ] Replace GitHub/phone sections with Mantine `Tabs` for `登录` and `注册`.
- [ ] Implement labelled email/password/code/confirmation inputs, password visibility, cooldown, loading, validation, and focus movement.
- [ ] Keep the existing `completeLogin` token/store/cookie/redirect path unchanged.
- [ ] Remove phone password guide triggering and stop rendering its modal from `App.tsx`.
- [ ] Keep the card responsive and interaction text at least 12px.
- [ ] Run the Task 5 test and the existing web focused matrix; require GREEN.

## Task 7: Remove The Web GitHub Build Requirement

- [ ] Add a failing config contract showing a production build can run without GitHub OAuth variables when email auth is configured.
- [ ] Remove GitHub client/redirect build-time requirements without changing backend GitHub routes.
- [ ] Update web environment examples and login help copy.
- [ ] Run the production web build with temporary email-auth verification variables.

## Task 8: Browser Regression And Final Verification

- [ ] Add deterministic API fixtures for registration-code request/verify and email-password login.
- [ ] At 1440x900 and 390x844, verify tabs, labels, no phone/GitHub controls, send cooldown, wrong-code error, password mismatch, successful registration, successful login, no overflow, and visible focus.
- [ ] Collect page errors, console errors, failed local assets, and unknown API requests; require all empty.
- [ ] Run focused API tests, focused web tests, API build/type check, web production build, static auth-copy/secret guards, and the browser matrix.
- [ ] Compare full-suite failures against the pre-existing baseline and report unrelated failures separately.

## Self-Review

- The plan covers every design requirement and preserves existing auth/session integration.
- No placeholder tasks remain.
- Endpoint names, schema names, request bodies, and environment variable names are consistent across backend, frontend, and tests.
- Account merging, phone-user migration, password reset, and global email uniqueness migration are explicitly out of scope.

