# Deploy — environment variables

Set these in Coolify under the application's **Environment Variables**, then
redeploy. The container entrypoint runs `prisma migrate deploy` on start, so
schema changes apply themselves.

| Variable | Required | What to put in it |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string. Already set. |
| `SWIFTAPP_PASSWORD` | ✅ | The password you type at `/login`. **The app returns 503 and refuses to serve without it** — it no longer falls through to an open site. |
| `AGENT_API_TOKEN` | for the agent | A secret **you invent**. Not issued by anything, not looked up anywhere. Minimum 32 characters. |
| `SESSION_SECRET` | optional | Signing key for session cookies. Defaults to `SWIFTAPP_PASSWORD`. Set it if you want to end every logged-in session by rotating a value that isn't the password you type. |
| `LOGIN_MAX_FAILURES` | optional | Wrong passwords allowed per address per window. Default `10`. |
| `LOGIN_WINDOW_MINUTES` | optional | Rolling window for the above. Default `15`. |

## AGENT_API_TOKEN — where the value comes from

Nowhere. You generate it, and it is only ever compared against itself.

```bash
openssl rand -hex 32
# 9f3c1e7a...  (64 hex characters)
```

That one string goes in **two places, identical**:

```
Coolify env                        VPS /root/.hermes/.env
AGENT_API_TOKEN=9f3c1e7a...   ==   SWIFTOS_AGENT_TOKEN=9f3c1e7a...
```

The app hashes what the caller presents and compares it with the hash of what is
in its own environment. If the two strings differ by one character, every agent
call gets `401`. If either side is empty, `503`.

Leave `AGENT_API_TOKEN` unset and the agent API is simply off — the browser side
is unaffected. That is a safe state to deploy in.

### Rotating it

Change it in Coolify, redeploy, then update `/root/.hermes/.env` on the VPS. Between
those two steps the agent gets `401`; nothing is lost, its calls just fail
loudly. Do it in that order rather than the reverse, so there is never a window
where an old token still works.

## Order of operations for a first deploy

1. Confirm `SWIFTAPP_PASSWORD` is set. Everything else fails closed without it.
2. Add `AGENT_API_TOKEN` (and `SESSION_SECRET` if you want the separate lever).
3. Redeploy. Migrations run on start.
4. Log in — you will be asked to, once. The previous session token no longer
   verifies, by design.
5. Smoke test the agent path from the VPS: `swiftos due 7` should print JSON.

## Rollback

The migrations only add: an enum value, nullable columns, two tables, and a
backfill. Nothing is dropped or rewritten, so rolling the image back to an
earlier tag leaves the database usable by the older code.
