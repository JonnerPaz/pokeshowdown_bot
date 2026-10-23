# Deployment

This guide is provider-neutral. Use the bundled Compose stack as a starting
point or adapt the same contract to your platform. **Do not commit real hostnames,
tokens, or database URLs**.

## Deployment shape

A production deployment needs:

- The bot process listening on an internal HTTP port (default `5000`).
- A PostgreSQL database reachable over a private network.
- Persistent storage for PostgreSQL.
- A TLS-terminating reverse proxy or tunnel if the Mini App is enabled.
- A public HTTPS origin for the Mini App, configured as `WEBAPP_URL`.

Remember that the bot can run in polling mode without any inbound route. The public HTTPS
route is only required for the Mini App and for webhook mode.

## Configure environment

Start from `env-sample.env` and set values through your platform's secret
manager or an untracked `.env` file.

Minimum production values:

```env
API_KEY="your_telegram_bot_token"
BOT_MODE="polling"
DROP_PENDING_UPDATES="true"

POSTGRES_USER="postgres"
POSTGRES_PASSWORD="replace_me"
POSTGRES_DB="pokemons"
```

For the Mini App:

```env
WEBAPP_URL="https://arena.example.com"
WEBAPP_AUTH_MAX_AGE_SEC="86400"
ARENA_TURN_TIMEOUT_SEC="90"
```

For webhook mode, also set:

```env
WEBHOOK_URL="https://bot.example.com"
WEBHOOK_SECRET="a-long-random-secret"
```

`WEBAPP_URL` must start with `https://` and must not have a trailing slash. An
empty value disables the web layer and the menu button.

## Build and start

With Docker Compose:

```bash
docker compose up -d --build
```

The production stack builds the bot image, starts PostgreSQL, waits for the
database, applies Prisma migrations, and starts the process. Check:

```bash
docker compose ps
docker compose logs -f bot
```

If you run the process outside a container, build and migrate explicitly:

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:deploy
pnpm build
node dist/index.js
```

`pnpm start` also runs `prestart`, which rebuilds before starting.

## Database

### Bundled PostgreSQL

Use a named volume for the database data. The bundled stack mounts PostgreSQL 18
at `/var/lib/postgresql`; older major versions use
`/var/lib/postgresql/data`. Do not reuse a data volume across major versions.
Back up the database before changing the image major version.

### External database

Set either:

- `DATABASE_URL` to the full connection string, or
- `DB_HOST` and `DB_PORT` to the private hostname and port, with the remaining
  `POSTGRES_*` values used by the connection string.

The bot container must be attached to the database's network. A database created
in a separate project or network is not reachable by service name until the
network is shared.

### Migrations

In the container, the entrypoint waits for PostgreSQL and retries
`prisma migrate deploy` up to `DB_MAX_ATTEMPTS` times. If migrations fail:

1. Confirm the database is accepting connections.
2. Check credentials and TLS requirements.
3. Verify the container can resolve the database hostname.
4. Check the entrypoint logs for the failing migration.

Never run destructive migrations without a backup.

## TLS and the Mini App

Telegram only opens Mini Apps from HTTPS. Terminate TLS at a reverse proxy or
tunnel and forward traffic to the bot's HTTP port:

```text
Telegram ── HTTPS ── proxy/tunnel ── HTTP ── bot:5000
```

The proxy must:

- Forward `/`, `/api/*`, `/health`, and the webhook path to the bot.
- Support long-lived SSE responses without buffering or short idle timeouts.
- Set a request timeout long enough for webhook handling.
- Preserve the original path.

After the public URL works, set `WEBAPP_URL` to that origin and restart the bot.
The startup logs should show that the arena menu button was registered.

SSE responses set `Cache-Control: no-store` and `X-Accel-Buffering: no`, but
the reverse proxy must still be configured not to buffer event streams.

## Health and readiness

| Probe         | Purpose                                                 |
| :------------ | :------------------------------------------------------ |
| `/health`     | The Express process is listening.                       |
| `/api/health` | The Mini App layer is mounted (only with `WEBAPP_URL`). |

A successful `/health` does not prove that Telegram polling started or that
migrations completed. Check the startup logs for those milestones.

## Troubleshooting

| Symptom                       | Check                                                                          |
| :---------------------------- | :----------------------------------------------------------------------------- |
| Bot cannot reach the database | Shared network, DNS name, port, credentials, and `DATABASE_URL`.               |
| Migrations keep failing       | Database readiness, migration permissions, TLS mode, and entrypoint logs.      |
| `/health` fails               | Process startup, `PORT`, container target, and proxy upstream.                 |
| Mini App returns 404          | `dist/web` exists, `pnpm build:web` ran, and `WEBAPP_URL` is correct.          |
| Menu button is missing        | `WEBAPP_URL` is valid HTTPS and the bot restarted successfully.                |
| API returns 401               | Open the app from Telegram; check the bot token and `WEBAPP_AUTH_MAX_AGE_SEC`. |
| SSE disconnects or hangs      | Disable proxy buffering and increase idle/read timeouts.                       |
| Webhook receives no updates   | `BOT_MODE`, `WEBHOOK_URL`, `WEBHOOK_SECRET`, and the public HTTPS route.       |
| PostgreSQL exits on startup   | The data volume was created by another major version; restore or migrate it.   |
