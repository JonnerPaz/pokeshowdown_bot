# Architecture

PokeBotShowdown has two user-facing surfaces that share the same process,
services, and database:

1. **A Telegram bot** built with [grammY](https://grammy.dev/).
2. **A Telegram Mini App** built with TypeScript and Vite, served by the same
   Express server as the bot.

**The web layer is optional**. It is enabled only when `WEBAPP_URL` is set to a
valid HTTPS URL, but you can use the bot without the need of the Mini App layer
at all (you lose the Arena features, but you can still play in group chats
trading and catching pokemons).

## Runtime topology

```text
Telegram clients
  ├── Bot chats ── grammY ── feature composers ── domain services ── Prisma ── PostgreSQL
  └── Mini App ── Express /api ── ArenaService ── BattleService ── Prisma ── PostgreSQL

PokeAPI ◀── PokeApiService (in-memory cache)
```

The Express server also exposes `/health`, serves the built Mini App assets, and
can receive Telegram webhook updates. In polling mode, the bot only makes
outbound requests to Telegram.

## Layers

| Layer                 | Location              | Responsibility                                                                                 |
| :-------------------- | :-------------------- | :--------------------------------------------------------------------------------------------- |
| Domain                | `src/domain/`         | Entities, datasource contracts, battle types and engine, items, and shared constants. No I/O.  |
| Infrastructure        | `src/infrastructure/` | Prisma-backed implementations of the datasource contracts. Records become domain entities.     |
| Features              | `src/features/`       | Vertical slices: commands, conversations, keyboards, feature services, and composer factories. |
| Presentation          | `src/presentation/`   | `MainBot`, `Server`, `createWebApp`, command metadata, shared services, and the web client.    |
| Database client       | `src/data/postgres/`  | The single `PrismaClient` instance used by the process.                                        |
| Schema and migrations | `prisma/`             | Prisma models and SQL migrations.                                                              |
| Tests                 | `tests/`              | Domain, feature, presentation, and web tests plus the in-memory harness.                       |

Dependencies point inward: features and presentation use domain contracts;
infrastructure implements those contracts; domain code does not import Prisma or
Express.

## Startup sequence

1. `src/index.ts` loads `.env` and requires `API_KEY`.
2. The runtime mode is resolved:
   - `BOT_MODE=webhook` or a configured `WEBHOOK_URL` selects webhook mode.
   - Otherwise the process runs in polling mode.
3. `MainBot` creates the grammY bot, installs `autoRetry`, the commands and
   conversations plugins, and the global error boundary.
4. `createAppDeps()` builds the long-lived collaborators: datasources,
   `PokeApiService`, `RateLimiterService`, `BattleService`,
   `GroupEncounterService`, and, when the web layer is enabled, `ArenaService`.
5. Feature composers are mounted: system, auth, battle, pokemon, pokedex,
   inventory, profile, and inline.
6. `registerControllers()` initializes the bot and registers localized command
   menus for private and group scopes.
7. When `WEBAPP_URL` is valid, `createWebApp()` is created with the same
   dependency container and the Arena service.
8. `Server.setup()` mounts JSON parsing, `/health`, the web app, and the webhook
   handler when applicable, then listens on `PORT`.
9. In polling mode, the bot deletes any old webhook and starts long polling.
   In webhook mode, it registers the webhook with `WEBHOOK_SECRET`.
10. When the web layer is enabled, the bot registers the **Open Arena** menu
    button.

`WEBAPP_URL` must start with `https://`. An invalid value logs an error and
leaves the whole web layer disabled.

## Feature slices

**Each feature lives in `src/features/<name>/` and exports a composer factory
such as `createPokemonFeature(deps)`**. Composer features are plain functions;
there are no controller classes or decorators.

| Feature     | Responsibilities                                                                             |
| :---------- | :------------------------------------------------------------------------------------------- |
| `system`    | Account lifecycle and system commands.                                                       |
| `auth`      | Registration, starter selection, and user onboarding.                                        |
| `battle`    | `/battle`, Arena room entry, and post-battle group announcements.                            |
| `pokemon`   | Wild encounters, catching, party/box management, trading, evolution, shiny forms, nicknames. |
| `pokedex`   | National Pokédex lookups, lore, and stat presentation.                                       |
| `inventory` | Pokéball inventory and daily rewards.                                                        |
| `profile`   | Trainer cards, leaderboard, and buddy selection.                                             |
| `inline`    | Inline queries for Pokémon, buddies, and teams.                                              |
| `arena`     | In-memory rooms, turns, timers, absences, ranking writes, and SSE listeners.                 |
| `common`    | Shared helpers for commands, chats, Markdown escaping, errors, and formatting.               |

## Request flows

### Bot commands and conversations

A Telegram update passes through the root error boundary, the commands and
conversations plugins, and the matching feature composer. Simple commands reply
directly. Multi-step flows are standalone async functions mounted with
`createConversation(...)`.

Conversation state is keyed by chat, not by user. Every wait has a timeout, and
callbacks are guarded so another member cannot continue someone else's flow.
Temporary messages are deleted when a flow finishes.

### Wild encounters

Solo encounters are conversation-local: the generated `PokemonEntity` lives in
the conversation's own scope across suspensions. There is no shared encounter
map for solo spawns.

Group spawns are managed by `GroupEncounterService`. It tracks recent activity,
applies burst protection, creates a shared encounter, and uses an atomic
reservation mutex so multiple members can throw balls without double-spending
or racing on the catch result.

### Mini App Arena

1. `/battle` creates an in-memory room in `ArenaService`.
2. In a group, the bot posts a `startapp` deep link. In a private chat, it posts
   a `web_app` button.
3. The Mini App authenticates with `X-Telegram-Init-Data` and loads the profile,
   party, and current room over `/api`.
4. Both trainers pick a party Pokémon. The room starts automatically.
5. Turns are submitted over REST. `ArenaService` calls `BattleEngine`, updates
   the room, records the log, and emits an event to SSE listeners.
6. On knockout or forfeit, `BattleService.recordBattleOutcome()` writes the
   ranking exactly once. Turn-limit draws and double-absence results are not
   ranked.
7. When the room is attached to a group chat, the bot posts the result back to
   that chat.

See [Mini App Arena](mini-app-arena.md) for the API, rules, and event contract.

## Mini App backend

`createWebApp()` builds an Express router with three concerns:

1. **Public shell and assets.** `express.static` serves `dist/web`. A single-page
   fallback returns `index.html` for client-side routes. The shell is public
   because every API call authenticates itself.
2. **Authentication.** `/api` routes pass through `requireTelegramUser()`, which
   validates the signed `X-Telegram-Init-Data` header and resolves the registered
   user. No cookies or server-side sessions are used.
3. **Battle API and SSE.** `/api/battles` exposes room operations. The SSE route
   accepts a short-lived HMAC ticket because native `EventSource` cannot send
   custom headers.

Security headers include `Cache-Control: no-store`, `X-Content-Type-Options:
nosniff`, `Referrer-Policy: no-referrer`, and a CSP with
`frame-ancestors https://web.telegram.org https://*.telegram.org`. The app must
be frameable by Telegram, so `X-Frame-Options` is intentionally not sent.

### Authentication details

Telegram signs `initData` with the bot token. The server derives a secret from
`WebAppData` and the bot token, validates the HMAC-SHA256 signature over the
sorted data-check string, checks `auth_date`, and rejects payloads older than
`WEBAPP_AUTH_MAX_AGE_SEC` (default 24 hours). The resolved Telegram ID must
belong to a registered trainer.

### SSE details

The client requests a room ticket with an authenticated `POST`, then opens a
native `EventSource` against `/api/battles/:code/events?ticket=...`. Tickets are
stateless HMAC values bound to the trainer and room, valid for 15 minutes. The
stream sends a full `snapshot` first, then `room`, `turn`, and `finished` events.
A heartbeat comment keeps intermediaries from closing idle connections.

## Data model

The Prisma schema currently has two models:

- **`User`**: Telegram identity (`telegramId` as `BigInt`), username, timestamps,
  win/loss counters, buddy Pokémon id, Pokéball counts, daily reward state, and
  the Pokémon relation.
- **`Pokemon`**: species name, types, ability, sprite JSON, shiny flag, catch
  count, nickname, party/box flag, and an optional owner.

Related mutations, such as creating an owned Pokémon and updating the owner's
inventory or party, run in a transaction. Datasources map Prisma records to
domain entities; raw database records never leave the infrastructure layer.

Telegram IDs can exceed JavaScript's safe integer range. Domain code uses
`BigInt`; API DTOs and serializers expose them as strings.

## Battle engine and ranking

`src/domain/battle/battleEngine.ts` is a pure, immutable state machine. It
handles turn order, speed ties, type effectiveness, critical hits, and the four
actions: `attack`, `special`, `defend`, and `charge`.

`BattleService` bridges the engine to persistent data:

- `resolveBattlePokemon()` computes level and battle stats from base stats and
  `timesCaught`.
- `recordBattleOutcome()` is the single writer for ranked results. It increments
  the winner's `wins`, the loser's `losses`, and the winning Pokémon's
  `timesCaught`.

`ArenaService` enforces the Arena-specific rules: 99-turn cap, 90-second turns,
two consecutive absences, room TTLs, and one active room per trainer. The Arena
is the only battle system.

## Cross-cutting concerns

### Errors

- Bot updates pass through a root middleware error boundary and a `bot.catch`
  handler. Both log structured context and send a safe reply.
- Web requests return `{ "error": { "code": "...", "message": "..." } }`.
- Stack traces and secrets are never sent to Telegram or the browser.

### State and scaling

- PostgreSQL is durable state.
- Arena rooms, group encounters, rate limits, and SSE listeners are in memory.
- Run one replica while using the Arena. A restart or deploy drops active rooms,
  and horizontal scaling would split room state across processes.
- SSE connections are closed during graceful shutdown so the process can exit.

### Caching and external APIs

`PokeApiService` wraps `pokenode-ts`. Species, evolution, and starter lookups use
an in-memory cache with a one-hour TTL. Random wild spawns are not cached.
External calls are batched where possible.

## Source map

| Path                                | Purpose                                                          |
| :---------------------------------- | :--------------------------------------------------------------- |
| `src/index.ts`                      | Process entry point, environment validation, mode selection.     |
| `src/presentation/mainbot.ts`       | Bot construction, feature wiring, command registration.          |
| `src/presentation/server.ts`        | Express setup, health endpoint, polling/webhook behavior.        |
| `src/presentation/web/app.ts`       | Mini App router, static assets, auth mounting, security headers. |
| `src/presentation/web/routes/`      | `/api/me` and `/api/battles` route handlers.                     |
| `src/presentation/web/client/`      | Mini App UI, API client, i18n, rendering, and SSE subscription.  |
| `src/features/arena/`               | Room store, room service, serializers, and Arena types.          |
| `src/domain/battle/battleEngine.ts` | Pure battle state machine.                                       |
| `prisma/schema.prisma`              | Database models and relations.                                   |
| `tests/harness/`                    | In-memory datasources and mocked Telegram client.                |
