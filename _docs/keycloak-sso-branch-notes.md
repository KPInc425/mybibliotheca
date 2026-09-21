# Keycloak SSO: branch state and how to finish

**Status: parked. Complete in source, never executed.**
Whether to build it at all: `_docs/keycloak-sso-assessment.md`.

Origin: recovered 2026-09-20 from uncommitted WIP on the prod box
(`/home/steam/safe/bo-wip-20260920/`). This branch is one commit ahead of the point
in `main` it was cut from, and **behind `main` in everything the audit and the
Reading Room redesign changed**. Merging it will conflict substantially - do that
file by file, deliberately, not with a hopeful `git merge`.

## What is here

Backend:

- `app/keycloak_auth.py` - ID token verification against the realm JWKS:
  signature, audience, issuer. Correct shape, no shortcuts.
- `app/api.py` - **the full endpoint, present.** `POST /api/auth/keycloak`
  verifies the token, finds or creates the local user by email, refuses
  deactivated accounts, resets the lockout counters, and calls
  `login_user(user, remember=remember_me)`. That last line is the load-bearing
  one: it establishes the Flask session the rest of the app expects. Username
  collisions are handled (`_get_available_username`), and auto-created accounts
  get `secrets.token_urlsafe(32)` rather than being left password-less.
- `config.py` - `KEYCLOAK_ISSUER_URL`, `KEYCLOAK_CLIENT_ID`.

Frontend:

- `frontend/src/auth/keycloak.ts` - `oidc-client-ts` wrapper.
- `frontend/src/pages/KeycloakCallbackPage.tsx` - the callback.
- `frontend/src/App.tsx` - the `/auth/keycloak/callback` route.
- `frontend/src/vite-env.d.ts` - env typings.
- `LoginPage.tsx` - carries the SSO button **as it looked before the redesign**.
  This is the one file to rework rather than merge: the Reading Room redesign
  rebuilt it (flat lavender logomark, quiet surface, emoji removed). Take the
  button logic from here and rebuild it against the current page.

Dependencies: `PyJWT==2.10.1` (requirements.txt), `pyjwt>=2.10.1`
(pyproject.toml), `oidc-client-ts ^3.3.0` (frontend/package.json).
`frontend/package-lock.json` needs `npm install` to regenerate.

## The blocker that merging does not solve

`VITE_KEYCLOAK_ISSUER_URL` / `VITE_KEYCLOAK_CLIENT_ID` are inlined at **build**
time. `frontend/Dockerfile` runs a plain `RUN npm run build` and
`docker-compose.yml` passes **no build args**, so setting these at runtime does
nothing and the SSO button silently never appears. Required, in order:

1. `frontend/Dockerfile`: `ARG VITE_KEYCLOAK_ISSUER_URL` + `ARG VITE_KEYCLOAK_CLIENT_ID`
   and an `ENV` for each, before `npm run build`.
2. `docker-compose.yml`: a `build.args` map on the frontend service.
3. Prove the values actually landed in the bundle, not just in the files:
   `grep -rl "<issuer-url>" frontend/dist/assets/`.

## Pre-cutover decisions

- **Identity mapping.** If the Keycloak account email differs from the existing
  local account, `find_by_email` misses and a new NON-ADMIN user is created while
  the existing library stays with the old account. Decide the mapping for both
  current users first.
- **Realm client.** No `bookoracle` client exists today. Eight apps in the
  `iLGaming-personal` realm already follow this pattern, so add a ninth.
- **Redirect URI.** Must match exactly:
  `https://books.ilgaming.xyz/auth/keycloak/callback`.
- **Registration policy.** Whether self-registration stays open on that realm.

## Implement order, when it is wanted

Realm client first (additive, nothing breaks) -> build-args change and verify in
the bundle -> local test stack, sign in as both users -> prod. Rollback is one env
var plus a container restart. One app, issuer-only.

## Honest caveat

None of this has been executed. The Python parses, but no token has ever been
verified against a real realm by this code. Treat the first run as a test, not a
deploy.
