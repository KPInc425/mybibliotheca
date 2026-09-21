# Keycloak SSO for BookOracle: assessment

**Status: proposal only. Nothing implemented.**
Prepared 2026-09-20. The decision is yours; this document exists so the decision is
informed rather than assumed.

## What is actually on the prod box

A working Keycloak implementation exists as **uncommitted work**, archived at
`/home/steam/safe/bo-wip-20260920/` (233 lines across 4 new files, plus a patch
touching 10 tracked files). Nobody has reviewed it, and it has never run.

It is not a sketch. It is coherent and it would work:

- `app/keycloak_auth.py` (43 lines) validates an ID token against the realm's JWKS,
  checking signature, audience and issuer. Correct shape, no shortcuts.
- `POST /api/auth/keycloak` in `app/api.py` verifies the token, finds or creates
  the local user by email, handles a deactivated account, resets the lockout
  counters, and calls `login_user(...)` — so it **does** establish the Flask
  session the rest of the app expects. That was the thing worth doubting, and it
  is handled.
- Username collisions are handled (`_get_available_username` suffixes `-1`, `-2`),
  and the generated local password is `secrets.token_urlsafe(32)`, so no
  password-less account is left usable.
- Frontend is `oidc-client-ts` with a `/auth/keycloak/callback` route, plus a
  button on the login page.

The one thing it does **not** handle: the existing `kpinc425@gmail.com` /
`3willow3@gmail.com` accounts. When `kpinc425@gmail.com` first signs in through
Keycloak, the email matches and user 1 is reused with its admin flag intact. If
the Keycloak account were `kpinc425@ilgaming.xyz` instead, that is a **new user
with no admin rights**, and the existing library belongs to the old one. Identity
mapping is a real, pre-cutover decision, not a detail.

## The realm

Keycloak runs on the box (`keycloak-keycloak-1`, host port 8420, Postgres behind
it). Three realms: `master`, `iLGaming`, `iLGaming-personal`. The
`iLGaming-personal` realm already has per-app clients in exactly this pattern:
`harmonious-accord`, `jigsaw-api`, `kpwarz`, `homepage`, `wordsearch`,
`kplex`, `copilot-bridge-web`, `platform-access`. **There is no BookOracle
client.** The code in this repo is written to be configured, not the reverse.

So this is a normal, well-trodden path on this box, not new ground.

## The lift is not the code. It is the build pipeline.

This is the part I would not have known without checking, and it is the real cost.

The frontend config arrives as `VITE_KEYCLOAK_ISSUER_URL` / `VITE_KEYCLOAK_CLIENT_ID`.
Vite inlines `VITE_*` at **build** time, and the frontend Dockerfile does a plain
`RUN npm run build` with `docker-compose.yml` passing **no build args**:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
```

So the variables can only reach the bundle by first modifying `frontend/Dockerfile`
(`ARG` + `ENV` before the build) and `docker-compose.yml` (`build.args`). Until
that is wired, setting the vars at runtime does nothing and the SSO button simply
never appears — a silent failure, and the exact class of bug already fixed once on
this project (the `NEXT_PUBLIC_*` build-inlining trap).

Beyond that:

| Step | Work | Needs KP |
|---|---|---|
| Add a `bookoracle` client in `iLGaming-personal` | ~15 min, matches 8 existing clients | no |
| Wire build args through Dockerfile + compose | ~30 min, must be verified in the built bundle, not just the file | no |
| Configure redirect URIs (`books.ilgaming.xyz/auth/keycloak/callback`) | minutes, but must match exactly | no |
| Commit the WIP, review it, deploy, verify both themes | ~1 hr | no |
| Decide identity mapping for both existing accounts | a decision | **yes** |
| Register/align both accounts in Keycloak, or invite-only | account admin | **yes** |
| Whether self-registration stays open on this realm | policy | **yes** |
| Confirm `kpinc425@gmail.com` stays the BookOracle admin | a decision | **yes** |

## The honest question: is this the right thing to build?

BookOracle has **two users**, and the registration flow for the whole platform
already lives in Keycloak. SSO here does not fix a security hole; it removes a
second password for two people. That is genuinely nice, and it is the pattern the
other eight apps already follow — which is the strongest argument *for* it.

The strongest argument *against*: item 14 was framed as the last open audit item,
but the audit's actual findings were an auth bypass, no backup, non-deterministic
boot, dead search, dead import and an unreachable feature. **All of those are
fixed.** SSO was never a defect. Treating it as "remaining work" makes a
nice-to-have look like an obligation.

### Rejected alternatives

- **Leave the WIP uncommitted.** It is the worst option: 233 lines of
  security-adjacent code that nobody has reviewed, sitting on a production box,
  one `git clean` from gone. Either finish it or delete it deliberately.
- **Half-apply it** (backend only, session established but no frontend button).
  That is a second auth path reachable by anyone who can POST, with no UI to
  explain it. Worse than either end state.
- **Put BookOracle behind the shared edge gate** (`oauth2-proxy`) instead of
  in-app SSO. It is already behind host nginx, so it is feasible, but BookOracle
  owns its auth surface and its own admin roles, so the gate would still need the
  app to read a claim. More moving parts for the same outcome.
- **Do nothing and remove the WIP.** Legitimate. Two users, working logins,
  nothing broken.

## Recommendation

**Do not do this yet, and do not leave it dangling.**

Concretely: commit the WIP to a `keycloak-sso` branch, unreviewed but preserved,
with this document next to it, and close item 14. It costs 20 minutes and turns
"WIP on a prod box that might vanish" into "a reviewed-once-we-need-it branch".
Then, if you want SSO, it is a half-day of the table above, most of it the
pipeline change.

If instead you want it now, the sensible order is: client first (additive,
nothing breaks), then the build-args change and verify the values are really in
the bundle, then deploy to the local test stack and sign in as both users, then
prod. One app, issuer-only, rollback is one env var plus a container restart.

## What I verified, and what I did not

Verified: the archive contents and line counts; that the endpoint calls
`login_user`; the dependency additions (`PyJWT==2.10.1`, `oidc-client-ts`);
`login_user` is already imported in `api.py`; the callback route exists in the
patch's `App.tsx`; Keycloak is running and which realms and clients exist; the
frontend Dockerfile passes no `VITE_*` build args and compose passes none.

Not verified: that the WIP is correct end to end. It has never run. I have not
executed it, and this document should not be read as a code review of it.
