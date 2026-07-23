# TapCanvas Email Authentication Design

## 1. Goal

Replace the visible GitHub/phone authentication card with an email-first flow:

- Login uses email plus password.
- Registration uses email, a six-digit email verification code, password, and password confirmation.
- Phone and GitHub controls are removed from the login card, while their backend routes remain untouched for compatibility.
- An account is created or claimed only after successful email verification.

## 2. User Experience

The unauthenticated gate uses two visible tabs: `登录` and `注册`.

### Login

- Fields: `邮箱`, `密码`.
- Primary command: `登录`.
- Invalid credentials use the generic message `邮箱或密码不正确`.
- Unknown, disabled, deleted, and duplicate-email states never expose password hashes or internal identifiers.

### Registration

- Fields: `邮箱`, `验证码`, `密码`, `确认密码`.
- `获取验证码` is part of the email field and enters a 60-second client cooldown only after a successful request.
- Primary command: `创建账号`.
- The code expires after 10 minutes and can be consumed once.
- Passwords are 8-128 characters and both password fields must match before submission.
- Local non-production debug mode may return and fill a development code; production never returns a code.

The card retains the existing dark visual language, minimum 12px interaction text, visible labels, focus rings, password visibility controls, loading states, and error toasts. It must fit at 390px without horizontal overflow.

## 3. API Contracts

### `POST /auth/email/register/request`

Request:

```json
{ "email": "user@example.com" }
```

Success:

```json
{ "success": true, "sent": true, "expiresInSeconds": 600, "retryAfterSeconds": 60 }
```

Non-production debug success may additionally include `devCode` and `delivery: "debug"`.

### `POST /auth/email/register/verify`

Request:

```json
{
  "email": "user@example.com",
  "code": "123456",
  "password": "at-least-eight-characters"
}
```

Success returns the existing `AuthResponseSchema`, attaches the existing auth cookie, and logs the user in.

### `POST /auth/email/password-login`

Request:

```json
{ "email": "user@example.com", "password": "the-password" }
```

Success returns the existing `AuthResponseSchema` and auth cookie.

The old `/auth/email/request` and `/auth/email/verify` passwordless routes remain disabled. Registration and login are explicit contracts.

## 4. Account Resolution

- Emails are trimmed and lowercased at every boundary.
- Password login performs a case-insensitive exact email lookup.
- No match returns the generic credential error.
- One match verifies the stored PBKDF2 password and preserves the existing user ID, projects, teams, roles, and credits.
- Multiple matches return `email_account_conflict`; the service does not guess or merge accounts.
- Registration after email verification claims a single existing GitHub/email account with the same normalized email by setting its password. This preserves existing data.
- A new email creates the existing deterministic `email_<sha256>` user and signup benefits once.
- Phone-only users without an email are not migrated automatically. Phone backend routes remain available, but the new gate does not display them.

## 5. Verification Security

- Store only a salted HMAC-SHA256 code digest using `AUTH_OTP_PEPPER`.
- Registration codes use purpose `register`; a code cannot be used by another auth flow.
- Issuing a new code invalidates previous unconsumed registration codes for that email.
- Enforce a 60-second per-email cooldown and a daily per-email request limit.
- Track failed verification attempts; invalidate a code after five failures.
- Consume with a conditional atomic update and require exactly one updated row before creating a session.
- If email delivery fails, invalidate the newly written code.
- Production requires Resend and never trusts `Host` to enable debug behavior.
- Disabled or deleted accounts are rejected before password updates or token issuance.

## 6. Data And Configuration

Extend `email_login_codes` with:

- `purpose TEXT NOT NULL DEFAULT 'register'`
- `attempt_count INTEGER NOT NULL DEFAULT 0`

No user-table uniqueness migration is performed in this change because existing duplicate emails must be audited before a unique index can be safely added. Runtime logic rejects ambiguous matches.

Required production variables:

- `RESEND_API_KEY`
- `RESEND_FROM`
- `AUTH_OTP_PEPPER`
- Existing `DATABASE_URL` and `JWT_SECRET`

`EMAIL_LOGIN_DEBUG=1` is valid only outside production.

The web production build no longer requires GitHub OAuth variables because the visible gate no longer uses GitHub.

## 7. Compatibility Boundaries

- Preserve token shape, auth cookie behavior, Zustand auth storage, redirect restoration, middleware, team/project ownership, signup credit reconciliation, and protected routes.
- Preserve GitHub and phone backend endpoints; only remove them from the visible unauthenticated gate.
- Remove the phone-specific first-login password setup modal from the rendered app. Email registration already sets a password atomically.
- Do not auto-merge multiple accounts, migrate phone-only users, or add password reset in this change.

## 8. Testing

Backend tests cover schema normalization, request cooldown, delivery failure, debug delivery, expiration, wrong code, five-attempt invalidation, old-code invalidation, atomic single consumption, new registration, existing-email claim, duplicate conflict, disabled/deleted users, correct and incorrect password login, and cookie-bearing routes.

Frontend tests render the real gate with mocked API/auth storage and cover tab switching, field labels, email validation, cooldown, password matching, loading states, registration completion, login completion, removal of phone/GitHub controls, and 390px-safe structure.

Final verification runs focused web/API tests, both production builds with temporary verification environment variables, static secret/phone-copy guards for the new gate, and browser screenshots at 1440x900 and 390x844.

