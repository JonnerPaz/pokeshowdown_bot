# Operations

This guide covers runtime modes, configuration, health, and process behavior.
For container and hosting guidance, see [Deployment](deployment.md).

## Runtime modes

PokeBotShowdown can be run using polling mode or webhook mode. Polling is the
default and the recommended approach for local development and self-hosting,
as it's way easier to get everything up and running. The downside is that using
polling only will make battle arena unavailable, because it requires a public
IP address, which in turn requires a webhook configuration.

### Polling (Personal recommendation)

Polling is the default mode. It needs no inbound port, public IP, or TLS
certificate for the bot itself. The process makes outbound HTTPS requests to
Telegram.

- Selected when `BOT_MODE="polling"`.
- Also selected when `BOT_MODE` is unset and `WEBHOOK_URL` is empty.
- On startup, the bot deletes any existing webhook.
- `DROP_PENDING_UPDATES="true"` discards queued updates after a restart.
- Express still listens on `PORT` so `/health` and the optional Mini App work.

### Webhook

Webhook mode is for deployments with a stable public HTTPS endpoint. Before
trying this, you will need the following:

1. A domain name (e.g. `example.com`).
2. TLS certificates (.g. `cert.pem` and `key.pem`). This usually comes with
   your hosting provider once you acquire a domain (e.g. [cloudflare](https://www.cloudflare.com)).
3. A server where the bot will run (e.g. a Linux container). If you want to test
   locally, you can use a reverse proxy or tunnel client to try this. However,
   for longer-lived deployments, you should use a dedicated server.

Besides from that, this mode requires the following:

- Selected when `BOT_MODE="webhook"` or when `WEBHOOK_URL` is set.
- Requires both `WEBHOOK_URL` and `WEBHOOK_SECRET`.
- Registers the webhook with Telegram using `secret_token`.
- Validates the `X-Telegram-Bot-Api-Secret-Token` header through grammY.
- Uses a 30-second webhook timeout with `onTimeout: "return"` so Telegram can
  retry instead of leaving the request hanging.

## Configuration

| Variable                  | Required         | Default       | Purpose                                                                          |
| :------------------------ | :--------------- | :------------ | :------------------------------------------------------------------------------- |
| `API_KEY`                 | Yes              | —             | Telegram bot token.                                                              |
| `PORT`                    | No               | `5000`        | HTTP port for health, the Mini App, and webhook traffic.                         |
| `BOT_MODE`                | No               | inferred      | `polling` or `webhook`.                                                          |
| `DROP_PENDING_UPDATES`    | No               | `false`       | Drop queued Telegram updates on startup.                                         |
| `WEBHOOK_URL`             | Webhook mode     | —             | Public HTTPS URL registered with Telegram.                                       |
| `WEBHOOK_SECRET`          | Webhook mode     | —             | Secret token Telegram sends with webhook requests.                               |
| `WEBAPP_URL`              | For the Mini App | empty         | Public HTTPS origin. Empty disables `/api`, static serving, and the menu button. |
| `WEBAPP_AUTH_MAX_AGE_SEC` | No               | `86400`       | Maximum accepted age of Telegram `initData`.                                     |
| `ARENA_TURN_TIMEOUT_SEC`  | No               | `90`          | Arena turn deadline in seconds.                                                  |
| `DATABASE_URL`            | No               | Compose-built | Full PostgreSQL connection string.                                               |
| `POSTGRES_USER`           | Compose          | `postgres`    | Database user for the bundled service.                                           |
| `POSTGRES_PASSWORD`       | Compose          | `postgres`    | Database password for the bundled service.                                       |
| `POSTGRES_DB`             | Compose          | `pokemons`    | Database name for the bundled service.                                           |
| `DB_HOST`                 | No               | `db`          | Database hostname used by the Compose stack.                                     |
| `DB_PORT`                 | No               | `5432`        | Database port used by the Compose stack.                                         |
| `DB_MAX_ATTEMPTS`         | No               | `40`          | Migration retry count in the container entrypoint.                               |
| `SHINY_ODDS`              | No               | `512`         | Shiny encounter odds.                                                            |
| `SPAWN_POOL_SIZE`         | No               | `1025`        | Species pool size for random spawns.                                             |

See `env-sample.env` for the complete sample, including container-specific
variables. **Never commit real values**.

> [!NOTE]
> `WEBAPP_URL` must start with `https://`. An invalid value logs an error and
> leaves the web layer disabled.

## Startup behavior

`pnpm start` runs the `prestart` hook, which builds the server and Mini App, then
executes `node dist/index.js`. To run an existing build without rebuilding, use
`node dist/index.js` directly.

At startup the process:

1. Loads `.env`.
2. Requires `API_KEY`.
3. Resolves polling or webhook mode.
4. Builds the shared dependencies and mounts feature composers.
5. Initializes the bot and registers localized command menus.
6. Mounts the Mini App when `WEBAPP_URL` is valid.
7. Starts Express and, in webhook mode, registers the webhook.
8. Registers the **Open Arena** menu button when the web layer is enabled.
9. Starts long polling when in polling mode.

## Health checks

| Endpoint      | Availability           | Response             |
| :------------ | :--------------------- | :------------------- |
| `/health`     | Always                 | `{ "status": "ok" }` |
| `/api/health` | Mini App layer enabled | `{ "status": "ok" }` |

Containers should probe `/health`. A healthy response only means the HTTP server
is listening; it does not prove Telegram connectivity or database migrations
have completed. Check the startup logs for migration and bot status.

## Graceful shutdown

On `SIGINT` or `SIGTERM` the process:

1. Stops the bot in polling mode.
2. Destroys the Arena service, clears timers, and drops listeners.
3. Closes the HTTP server and all open connections, including SSE streams.
4. Disconnects Prisma.
5. Exits with status `0` (or `1` on failure).

The forced connection close is intentional: SSE clients keep streams open, and a
normal `server.close()` would wait forever for them.

## State and scaling

| State                         | Storage        | Survives restart? |
| :---------------------------- | :------------- | :---------------- |
| Users, Pokémon, rankings      | PostgreSQL     | Yes               |
| Ball inventory and streaks    | PostgreSQL     | Yes               |
| Arena rooms and turn timers   | Process memory | No                |
| Arena SSE listeners           | Process memory | No                |
| Group encounters and activity | Process memory | No                |
| Rate-limit counters           | Process memory | No                |

This is important to know because Telegram guidelines around bots states that
**it can only exists one instance of the bot at a time**. Because of that, I
design this bot with one instance into account, where many parts of the app's
state are stored in memory, others are persisted using PostgreSQL, just in case
of a deploy or restart needs to happen.

Horizontal scaling would split rooms, timers, and listeners across processes and produce
inconsistent results. A deploy or restart drops active rooms; plan for that
operationally.

If you care about your data, your pokemons or your rankings, you should make
backups frequently.

## Logging and errors

The process logs to stdout/stderr:

- Startup mode and port.
- Registered menu button.
- Polling start and bot username.
- Structured error context for bot and web failures.
- Migration and entrypoint diagnostics in containers.

**Do not log bot tokens, init-data payloads, database URLs, or other secrets**.

Bot errors are contained by a root middleware boundary and `bot.catch`; web
errors return a JSON error envelope. Stack traces stay in server logs.

## Security notes

- Keep `.env` and secrets out of version control.
- Use HTTPS for the public Mini App origin.
- The Mini App uses signed init data.
- The CSP allows framing only by Telegram web origins.
- SSE tickets are short-lived and bound to a trainer and room.
- Do not expose PostgreSQL publicly. Use a private network and least-privilege
  credentials.
