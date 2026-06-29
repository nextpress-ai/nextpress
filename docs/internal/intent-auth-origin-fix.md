# Intent — Universal Better Auth origin trust (upgrade-safe)

## Problem

After upgrading an existing instance to Better Auth, prod login fails with
**"Invalid origin"**. Better Auth rejects state-changing auth requests whose
browser `Origin` header is not in `trustedOrigins`.

Root causes:

- Prod env sets no `BETTER_AUTH_URL`/`SITE_URL`, so `getAuthBaseUrl()` falls back
  to `http://localhost:5000`. The public origin is only trusted if a DB site's
  `siteUrl` matches it exactly.
- On upgraded instances the stored `siteUrl` often mismatches the live origin
  (e.g. stored `http://` while Caddy now serves `https://`, or a stale value),
  so nothing trusts the real origin.

## Goal

A **universal, no-config, upgrade-safe** fix. No hardcoded domain, no required
env var. Works the moment the upgraded image boots.

## How

`trustedOrigins` becomes request-aware: `async (request) => resolveAuthTrustedOrigins(request)`.
Per Better Auth docs `request` is `undefined` during init and `auth.api` calls
(so the setup wizard's server-side signup is unaffected).

Two dynamic layers:

1. **Same-origin request trust** (`server/lib/auth-trusted-origins.ts`):
   when `request` is defined, read its `Origin` header and the forwarded
   `Host`. If the Origin's host equals the request Host (what Caddy forwards),
   trust that exact origin. This is the canonical CSRF-safe check:
   - legit first-party login: `Origin: https://site` + `Host: site` -> trusted.
   - cross-site CSRF: `Origin: https://attacker` + `Host: site` -> rejected.
   Also trusts when the Origin host matches a configured site host (proxy quirk
   fallback). Needs no env and no DB row match -> upgrade-proof.

2. **Scheme-agnostic site expansion**: each configured site host is expanded to
   both `http` + `https` (+ `www`) so `auth.api`/init paths (request undefined)
   still trust old rows whose stored scheme is now wrong.

`BETTER_AUTH_URL` / `SITE_URL` remain supported as an optional explicit override
(passed through in `docker-compose.prod.yml`), but are no longer required.

## Security

Same-origin trust does not weaken CSRF protection: a browser sets `Origin` to
the attacker's page, never to the victim domain, while the proxy sets `Host` to
the victim domain — the two won't match. Forging `Host` requires direct
attacker access (no victim cookies), which is not CSRF.

## CLI auto-detect (upgrade hardening)

`scripts/nextpress` (the bash CLI install.sh ships and that self-updates on
`upgrade`) now best-effort pins `BETTER_AUTH_URL` during `upgrade`:

- Parses the served host(s) from `caddy_config/Caddyfile` (the site-address line).
- If exactly one apex domain is served and `.env` has no `BETTER_AUTH_URL`,
  appends `BETTER_AUTH_URL=https://<apex>` (passed through by compose).
- Skips for IP/localhost (`:80`) and for multi-domain installs (warns), because
  a single base URL cannot represent multiple origins.

This is hardening only (Secure-cookie flag + explicit origin); login already
works via the app's dynamic same-origin trust. The single base URL limitation
is exactly why runtime per-request trust remains the primary mechanism.

NOTE: `packages/cli` (TS) has a separate minimal `runUpgrade` (`pull && up -d`)
with no `.env`/migration handling; it is not the deployed self-host path and was
left unchanged.

## Tests

`server/test/origin-utils.test.ts` (13 cases, all passing locally via vitest):

- same-origin trusted, cross-site forgery rejected (`Origin` host != `Host`),
  missing/malformed Origin -> null, `X-Forwarded-Host` fallback, host:port,
  case-insensitivity, http/IP self-origin.
- `expandSiteUrlOrigins`: dual-scheme apex+www, scheme-agnostic (stored http ->
  trusts https), www-prefixed, bare hostname, blank input.

Run: `npx vitest run --project server server/test/origin-utils.test.ts`.

Verified on Node v24 that `new Request(url, { headers })` preserves `Origin` and
`Host` (not dropped as forbidden headers), so the resolver reads them in both the
real and synthesized request branches Better Auth uses.

## Files

- `server/lib/origin-utils.ts` — pure, dependency-free helpers
  (`expandSiteUrlOrigins`, `getRequestHost`, `getRequestSelfOrigin`). Extracted
  so they are unit-testable without importing `../storage` (which connects the DB).
- `server/lib/auth-trusted-origins.ts` — request-aware resolver consuming
  `origin-utils`; env + cached DB origins + per-request same-origin.
- `server/lib/better-auth.ts` — pass `request` into the resolver.
- `server/test/origin-utils.test.ts` — unit tests.
- `docker-compose.prod.yml` — optional `BETTER_AUTH_URL`/`SITE_URL` passthrough.
- `scripts/nextpress` — `maybe_set_auth_url_from_caddy` on upgrade; version 1.4.0.

## Impact

- Existing/upgraded instances: login works without any env or DB change.
- Fresh installs: unchanged (setup uses server-side `auth.api`, request undefined).
- Backups in `/backup/*.bak`.
