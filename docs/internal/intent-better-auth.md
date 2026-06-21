# Better Auth migration intent

## What

Replace Replit OIDC + express-session + custom bcrypt auth routes with [Better Auth](https://www.better-auth.com/).

## Why

- Single auth stack (sessions, credentials, future OAuth) instead of dual local/Replit paths
- Typed client (`authClient`) and server (`auth.api`) APIs
- Keeps existing `users` table and bcrypt hashes for backward compatibility

## How

1. **Schema** — Add `name`, `email_verified`, `display_username` to `users`; add `auth_sessions`, `accounts`, `verifications` tables; migrate legacy `users.password` → `accounts` (provider `credential`).
2. **Server** — `server/lib/better-auth.ts` with drizzle adapter, username plugin, bcrypt verify/hash, subscriber role hook on signup.
3. **Middleware** — `requireAuth` / `authService` use `auth.api.getSession` + existing CMS user lookup.
4. **Routes** — `app.all('/api/auth/*', toNodeHandler(auth))`; keep `GET /api/auth/user` for CMS user shape.
5. **Client** — `authClient` for sign-in, sign-up, sign-out; `useAuth` still fetches `/api/auth/user`.
6. **Removed** — `server/replitAuth.ts` → `/trash/replit-auth-20260621/`.

## Env (optional)

- `BETTER_AUTH_URL` — public origin (defaults to `http://localhost:$PORT`)
- `BETTER_AUTH_SECRET` — signing secret (falls back to `SESSION_SECRET`)

## Impact

- Existing users: migration SQL copies bcrypt hashes into `accounts`; login unchanged.
- Replit Auth: removed (was env-gated; local dev unaffected).
- Production: run migrations (`pnpm db:push` or deploy migration `0002_better_auth.sql`).
