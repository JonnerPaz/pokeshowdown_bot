# Local Development

This guide takes a fresh checkout to a running bot and, optionally, a local
Telegram Mini App.

## Prerequisites

- **Node.js 22.12 or newer** (the project uses strict ESM).
- **pnpm 10** (`corepack enable pnpm`).
- **Docker and Docker Compose** for the local PostgreSQL container.
- A **Telegram bot token** from [@BotFather](https://t.me/botfather).
- For the Mini App: an HTTPS URL that Telegram can reach. A reverse proxy or a
  tunnel client works; the application itself only needs `WEBAPP_URL`.

## 1. Install dependencies

```bash
git clone https://github.com/JonnerPaz/pokeshowdown_bot.git
cd pokeshowdown_bot
corepack enable pnpm
pnpm install
```

`pnpm install` also installs the Husky hooks.

## 2. Configure the environment

```bash
cp env-sample.env .env
```

For a normal local polling setup, set at least:

```env
API_KEY="your_telegram_bot_token"
DATABASE_URL="postgresql://postgres:postgres@localhost:2300/pokemons?schema=public"
BOT_MODE="polling"
DROP_PENDING_UPDATES="true"
```

Useful optional variables:

| Variable                  | Default       | Purpose                                                         |
| :------------------------ | :------------ | :-------------------------------------------------------------- |
| `PORT`                    | `5000`        | HTTP port for `/health`, the Mini App, and the webhook.         |
| `WEBAPP_URL`              | empty         | Public HTTPS URL of the Mini App. Empty disables the web layer. |
| `WEBAPP_AUTH_MAX_AGE_SEC` | `86400`       | Maximum accepted age of Telegram `initData`, in seconds.        |
| `ARENA_TURN_TIMEOUT_SEC`  | `90`          | Seconds a trainer has to act in an Arena turn.                  |
| `SHINY_ODDS`              | `512`         | Shiny encounter odds.                                           |
| `SPAWN_POOL_SIZE`         | `1025`        | Number of species available for random spawns.                  |
| `DB_HOST` / `DB_PORT`     | `db` / `5432` | Database host and port used by the Compose stack.               |
| `DB_MAX_ATTEMPTS`         | `40`          | Migration retries performed by the container entrypoint.        |

`WEBHOOK_URL` and `WEBHOOK_SECRET` are only required when
`BOT_MODE="webhook"`. Polling mode needs neither.

## 3. Start PostgreSQL

For a host-run bot, start only the development database:

```bash
docker compose -f compose.dev.yaml up -d db
```

The development stack binds PostgreSQL to host port `2300` and keeps its data in
`./postgres` (gitignored). Wait for the health check before running migrations:

```bash
docker compose -f compose.dev.yaml ps
```

If you prefer to run the bot inside the container too:

```bash
docker compose -f compose.dev.yaml up
```

That service installs dependencies, generates the Prisma client, applies
migrations, and runs `pnpm dev` inside the container. Do not run `pnpm dev` on
the host at the same time: both processes try to use port `5000`. The container
uses its own `DATABASE_URL` pointing at the `db` service; the host workflow uses
`localhost:2300`.

## 4. Prepare Prisma

```bash
pnpm prisma:generate
pnpm prisma:deploy
```

- `prisma:generate` rebuilds the client in `generated/prisma` after a schema
  change or a fresh install.
- `prisma:deploy` applies the existing migrations. It is the right command for
  a fresh database or a deployed environment.
- When you change `prisma/schema.prisma`, create a development migration:

  ```bash
  pnpm prisma:migrate -- --name describe_the_change
  ```

  Commit the schema, the migration folder, and the regenerated client together.

## 5. Run the application

```bash
pnpm dev
```

`pnpm dev` runs the bot (`tsx watch`) and the Vite client watcher in parallel.
Useful variants:

```bash
pnpm dev:bot      # bot only
pnpm dev:web      # Mini App bundle in watch mode
pnpm build        # esbuild server bundle + Vite production bundle
pnpm start        # build via prestart, then run dist/index.js
node dist/index.js  # run an already-built server without rebuilding
```

The development server logs `Server running on port 5000`. Send `/start` to your
bot in Telegram, register a trainer, and try `/generate_pokemon`.

## 6. Enable the Mini App locally

Telegram only opens Mini Apps from HTTPS URLs. For local work:

1. Expose port `5000` over HTTPS with your reverse proxy or tunnel client. The
   repository includes a `pnpm tunnel` helper that assumes a compatible tunnel
   client is installed on your machine.
2. Set `WEBAPP_URL` to the public HTTPS origin, without a trailing slash:

   ```env
   WEBAPP_URL="https://your-public-host.example"
   ```

3. Restart the bot. It registers the **Open Arena** menu button and mounts
   `/api`.
4. Open `/battle` in a private chat, or create a group room and join through the
   `startapp` button.

The menu button is set at bot scope and persists until it is changed, so use a
test bot for local Mini App experiments.

If `WEBAPP_URL` is empty, the web layer and menu button are disabled and
`/battle` replies that the Arena is unavailable. The value must start with
`https://`; an `http://` value is ignored.

The Mini App build is written to `dist/web`. If the route returns 404 after a
fresh checkout, run `pnpm build:web` or keep `pnpm dev` running.

## 7. Health and smoke checks

```bash
curl http://localhost:5000/health
# {"status":"ok"}

curl http://localhost:5000/api/health
# {"status":"ok"} — only when the web layer is enabled
```

In Telegram, verify:

1. `/start`
2. `/register` and starter selection
3. `/generate_pokemon` and a catch attempt
4. `/pokemons`
5. `/battle` (requires `WEBAPP_URL`)

## 8. Run the quality gates

```bash
pnpm test
pnpm run typecheck
pnpm lint
pnpm format:check
pnpm run build:web
```

See [Testing](testing.md) for the test layout and harness details.

## Troubleshooting

| Symptom                                         | What to check                                                                                                           |
| :---------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| `API_KEY is not defined`                        | Set `API_KEY` in `.env` and restart the process.                                                                        |
| Prisma cannot reach the database                | Run the `db` service, confirm the port (`2300` on the host), and check `DATABASE_URL`.                                  |
| `Cannot find module 'generated/prisma'`         | Run `pnpm prisma:generate`.                                                                                             |
| Port `5000` is already in use                   | Stop the other bot/container, or set a different `PORT` and update the tunnel/proxy target.                             |
| Mini App opens but API calls fail               | Set `WEBAPP_AUTH_MAX_AGE_SEC` appropriately, open the app from Telegram (not a plain browser), and check the bot token. |
| Mini App is blank or returns 404                | Build `dist/web` with `pnpm build:web`; confirm `WEBAPP_URL` is HTTPS and has no trailing slash.                        |
| `/battle` says the Arena is unavailable         | Set `WEBAPP_URL` to a valid HTTPS URL and restart.                                                                      |
| Telegram does not receive webhook updates       | Check `BOT_MODE`, `WEBHOOK_URL`, `WEBHOOK_SECRET`, and the public HTTPS route into the app.                             |
| Database data looks stale after a schema change | Apply the migration with `pnpm prisma:deploy`, then regenerate the client.                                              |
