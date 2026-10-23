# AGENT PLAYBOOK · SHOWDOWNBOT

> Reference guide for autonomous contributors. Keep it current, practical, and grounded in the repository’s real workflows.

---

## 0. Quick Facts

- Node 22.12+, TypeScript ESM (`"type": "module"`, `moduleResolution: nodenext`). CI pins Node 26; local runtime should match.
- `pnpm-workspace.yaml` holds pnpm settings (e.g. `onlyBuiltDependencies` for prisma/esbuild build scripts).
- Package manager: pnpm 10.x (`corepack enable pnpm`).
- Stack: grammy bot framework, @grammyjs commands/conversations, Prisma/Postgres, pokenode-ts, Express.
- Runs in **Dual-Mode** (`BOT_MODE=polling` or `BOT_MODE=webhook`): In polling mode (ideal for container platforms, local homelabs, and dynamic IP), `bot.start()` runs with zero inbound ports or tunnels; in webhook mode, Express `Server` registers the webhook with a `secret_token`. Express serves `/health` in both modes.
- CI: `.github/workflows/ci.yml` runs install → `prisma:generate` → typecheck → lint → format check.
- Layers: `domain` (entities/contracts/constants), `infrastructure` (datasources), `presentation` (controllers/services/bot/server), `generated/prisma` output.
- Secrets: `.env` holds `API_KEY`, `DATABASE_URL`, `PORT`, `WEBHOOK_URL`, `WEBHOOK_SECRET`, etc. Never commit or echo secret values.

---

## 1. Environment Bring-Up

1. `pnpm install`
2. `cp env-sample.env .env` and fill out required variables.
3. Start Postgres (see `compose.yaml` or your own instance) and ensure `DATABASE_URL` points to it.
4. Generate Prisma client whenever schema changes: `pnpm run prisma:generate` (outputs to `generated/prisma`).
5. Avoid touching generated files manually.

---

## 2. Build · Lint · Test

- **Build**: `pnpm run build` (bundles the server to `dist/index.js` with `esbuild` and the Mini App to `dist/web/` with Vite, both with sourcemaps).
- **Web client build**: `pnpm run build:web` runs `vite build` from `vite.config.ts`, emitting hashed JS/CSS assets plus `index.html` to `dist/web/`. `pnpm dev:web` runs `vite build --watch`; `pnpm dev` runs `build:web` once via `predev`.
- **Production run**: `pnpm start` (executes pre-built `node dist/index.js` via `prestart` hook for minimal memory and zero JIT overhead).
- **Dev watch**: `pnpm dev` (tsx watch `src/index.ts`, boots bot + Express shell with hot reloading; run `pnpm dev:web` in a second terminal for client changes).
- **Static analysis**: `pnpm run typecheck` (tsc --noEmit, strict null checks on).
- **Lint / format**: `pnpm lint`, `pnpm lint:fix`, `pnpm format`, `pnpm format:check` (Prettier; formatted paths are scoped in package.json to avoid `postgres/` permission issues).
- **Migrations**: `pnpm run prisma:migrate -- --name <desc>` (requires live DB connection).
- **Codegen**: `pnpm run prisma:generate` after migrations/schema edits.
- **Testing**: Vitest suite (domain, feature integration, presentation). Run all tests with `pnpm test`, or a single file with `pnpm vitest run tests/<path>`. Tests run natively with no extra compiler plugins. Feature tests use grammY's `ApiClientOptions.fetch` mock harness and in-memory datasources (`tests/harness/`). CI runs `pnpm test`.

---

## 3. Architecture & Wiring

- `src/index.ts` validates env (`API_KEY`, `WEBHOOK_URL`, `WEBHOOK_SECRET`), then `await botInstance.register()` and `await server.setup()`. Wiring lives in `MainBot` + `Server`.
- Layers: `src/domain` (entities/contracts/constants) → `src/infrastructure` (Prisma-backed datasources) → `src/features` (vertical slices: `auth`, `battle`, `pokemon`, `system`) → `src/presentation` (mainbot, server, shared types).
- Feature Composers: Each feature folder (`src/features/<feature>/`) encapsulates its keyboards, standalone conversation functions, and a composer factory (`create<Feature>Feature(deps): Composer<AppContext>`). No classes or decorators.
- `MainBot` (`src/presentation/mainbot.ts`) wires `UserDataSourceImpl` + `PokemonDataSourceImpl`, `PokeApiService`, `RateLimiterService`, and `BattleService`, mounts each feature composer onto `this.bot`, and registers localized menu commands via `registerBotMenuCommands()`.
- Conversations: Plain async functions taking `(conv, ctx, deps)`. Mounted within each feature composer via `createConversation<AppContext, AppContext>(...)`. Controllers trigger or enter conversations directly via `ctx.conversation.enter("name")`.
- Encounters are conversation-local: `generatePokemonConversation` holds the wild `PokemonEntity` in its own scope (grammY preserves locals across suspensions). There is **no shared encounter map** — do not reintroduce one.
- Domain entities (`PokemonEntity`, `UserEntity`) enforce invariants end-to-end. Datasources and services construct these entities directly (no DTO layer). Always return domain entities from persistence.
- When persisting user-owned pokémon (starters, catches, trades, evolutions), include the owning `userId` in the Prisma insert/connect and wrap the pokémon create + user update in a single transaction so `pokemonIds` stay in sync.
- `Server` (`src/presentation/server.ts`) is a thin Express wrapper: mount JSON middleware, register the webhook with `secret_token` (fail-fast on error), mount `webhookCallback`, then listen. `index.ts` owns startup; avoid starting the bot anywhere else to prevent double polling.
- **Mini App Web Layer** (`src/presentation/web/`): `createWebApp()` is mounted before the webhook when `WEBAPP_URL` is set. It serves `dist/web` statically, exposes `/api/me` and `/api/battles/*`, and authenticates every API call from the `X-Telegram-Init-Data` header (HMAC derived from `API_KEY`), never cookies. `ArenaService` (`src/features/arena/`) owns in-memory rooms and SSE listeners; `battle.service.ts` remains the only writer of wins/losses.
- **Browser SSE**: Browsers use native `EventSource` connecting to `/api/battles/:code/events?ticket=...` with a short-lived HMAC ticket issued by `POST /:code/ticket`, removing manual stream parsing and DB hits on reconnect. Full snapshot is sent as the first frame, and reconnection is handled natively.
- **Client modules**: `client/main.ts` (state/actions), `client/render.ts` (pure templates with escaped user data), `client/api.ts`, `client/i18n.ts` (EN/ES), `client/dom.ts`, `client/types.ts`. No framework and no runtime dependency; Vite emits an ES module bundle from `client/index.html`.
- **Room lifecycle**: rooms are ephemeral and single-replica by design. They expire after 15 min in the lobby or 10 min after finishing; a deploy drops them. Do not add multi-replica claims without moving the store to Postgres/Redis.
- **Static assets**: `createWebApp` accepts `staticDir` (tests use a temp folder). `dist/web` is gitignored; CI runs `pnpm run build:web` before tests, and unit tests must still use temporary fixtures rather than real assets.

---

## 4. Imports & Formatting

- Always include `.js` suffixes on local imports (ESM + nodenext requirement).
- Prefer absolute paths rooted at `src/` when helpful; stay consistent within a file.
- Order imports: 1) node built-ins (`node:` prefix), 2) external packages, 3) aliased/internal modules, 4) relative paths. Separate groups with a blank line.
- Keep named imports alphabetized when it aids readability. Avoid multiple default exports per file.
- Existing style leans toward double quotes; follow the surrounding file’s convention.
- Keep functions under ~50 lines; extract helpers or services when logic grows.
- ASCII-only unless the file already uses emoji/non-ASCII (e.g., README).

---

## 5. Types, DTOs, Naming

- Use explicit return types on exported functions/methods.
- DTOs expose `.fromObject()` factories that validate required properties; they should reject invalid input early.
- Domain entities use constructors to guarantee invariants (e.g., `PokemonEntity` ensures sprites exist). Call `fromObject` when hydrating from DB.
- Builders (e.g., `PokemonBuilder`) must validate state before returning an entity; do not leave partially configured builders.
- Naming: classes `PascalCase`, functions `camelCase`, constants `UPPER_SNAKE_CASE`, files `kebab-case.ts`. Match existing conventions when in doubt.

---

## 6. Error Handling & Logging

- `MainBot.setupErrorHandler()` installs a root middleware error boundary **and** a `bot.catch` global handler (structured log + best-effort reply). Unhandled conversation/command errors propagate here. The root boundary swallows errors so the webhook always answers Telegram with `200 OK`, preventing retry deadlocks.
- Conversation steps do **not** wrap with try/catch — let errors bubble to `bot.catch`. Commands and conversations report errors using `displayCommandError(e, ctx, msg?)` (`src/features/common/errorHandler.ts`) with structured logging.
- Use contextual logs: `console.error("pokemon.generate failed", { username, error })` rather than plain stack output.
- Differentiate user mistakes (not registered) from system faults (Prisma/PokeAPI issues). Never leak stack traces or secrets into Telegram chats.
- When calling `conv.external`, ensure the inner function throws informative errors so upstream handlers can act.

---

## 7. Feature Composers & Conversations

- Features live under `src/features/<name>/` (`system`, `auth`, `battle`, `pokemon`). Each exports a factory `create<Name>Feature(deps): Composer<AppContext>`.
- Commands registered using `registerFeatureCommand` or `registerFeatureConversationCommand` (`src/features/common/commandHelper.ts`) to configure localized command metadata with `CommandGroup`.
- Add translations for every command inside `src/presentation/controllers/commands.ts` (English + Spanish). Remove placeholder or offensive entries immediately.
- Conversations: Standalone functions taking `(conv: AppConversation, ctx: AppContext, deps: ...)`, mounted via `feature.use(createConversation<AppContext, AppContext>(...))`. No classes or decorators.
- Guard callback queries with `.andFrom(ctx.from!)` or `.andFrom(userCallback.callbackQuery.from)` so other users cannot hijack flows.
- Namespace trade callbacks with a per-trade `tradeId` (e.g. `trade-accept:${tradeId}` / `trade-reject:${tradeId}`) so buttons can't be reused across chats. Confirmation buttons must also carry the target trainer (`trade-confirm:${tradeId}:${telegramId}`) so a click from the wrong member is answered as "not yours" instead of being mistaken for an expired trade.
- Remember that conversation state is keyed **per chat** (`ctx.chatId`), not per user. `ctx.conversation.exitAll()` therefore aborts every flow in a group, including other trainers' battles: `registerFeatureConversationCommand` only uses it in private chats and just exits the restarted conversation in groups.
- Add `{ maxMilliseconds: CONVERSATION_TIMEOUT_MS }` to every `waitForCallbackQuery`/`waitFrom` so hung conversations don't leak memory.
- Return `{ next: true }` from every `.unless(...)` used to ignore commands in a text prompt so the command reaches its handler even if the conversation stops being parallel.
- Everything returned by `conv.external` is a `structuredClone`: entities lose their prototype. Rehydrate with `Entity.fromObject(...)` before calling methods such as `spendForShiny`, and use plain properties (`user.pokemons`) instead of getters (`user.party`, `user.box`).
- Delete temporary messages (`ctx.api.deleteMessage`) when flows complete to keep chats tidy.

---

## 8. Database & Prisma Layer

- Central Prisma client lives in `src/data/postgres/index.ts`; do not instantiate new `PrismaClient` instances elsewhere.
- Datasources translate Prisma records into domain entities (convert JSON columns like `sprites`). Never return raw database types from repositories.
- When updating relational data (users ↔ pokemons), use Prisma relation helpers (`connect`/`disconnect`) rather than overwriting arrays manually.
- Every schema change: edit `prisma/schema.prisma` → `pnpm run prisma:migrate -- --name <desc>` → `pnpm run prisma:generate`. Commit schema, migrations, and generated client.

---

## 9. Networking & External APIs

- `PokeApiService` encapsulates pokenode-ts usage (constructed with no args). Other layers should consume its methods, not the SDK directly.
- Response caching is explicit: `PokemonClient`/`EvolutionClient` are built with `cache: new MemoryCache({ ttl: 1h })` (`CACHE_TTL_MS`). Random wild spawns aren't cacheable; starters, evolutions, and species lookups are.
- Batch external requests with `Promise.all` but limit concurrency if calls become heavy.
- Expose helper methods (e.g., `createStarterPokemon`, `createPokemon`, `evolvePokemon`). Encounters are conversation-local; do not reintroduce a shared `currentPokemon` map.

---

## 10. Dependency Hygiene

- Runtime deps: `pnpm add <pkg>`; dev deps: `pnpm add -D <pkg>`.
- `pnpm-lock.yaml` is canonical. Remove accidental `package-lock.json`/`yarn.lock` if generated.
- Never commit `.env`, local DB dumps, or `node_modules`.

---

## 11. Git & Workflow

- Before committing: `pnpm run typecheck` + `pnpm lint` + `pnpm format:check` (and `pnpm run prisma:generate` / migrations if schema changed).
- Keep commits scoped; describe rationale + verification steps in messages/PR descriptions.
- Do not amend or force-push shared branches without explicit instruction.
- Always leave the working tree clean; remove stray temporary files.

---

## 12. Operational Playbooks

1. **Add command / feature:**
   - Define metadata in `controllers/commands.ts` (EN + ES).
   - Implement handler or conversation in `src/features/<feature>/`.
   - Register command in `create<Feature>Feature`, and mount in `MainBot.ts`.
   - Update README/AGENTS if command footprint changes.
2. **Add conversation:**
   - Implement standalone function `myConversation(conv, ctx, deps)` in `src/features/<feature>/<feature>.conversations.ts`.
   - Mount with `feature.use(createConversation<AppContext, AppContext>(myConversation, "name"))`.
   - Ensure inline keyboards/callbacks are namespaced and every wait has a `maxMilliseconds` timeout.
3. **Repository/DTO change:**
   - Update interfaces in `src/domain/datasource` or `src/domain/entities`.
   - Implement adjustments in infrastructure datasources, plus tests/dev scripts.
4. **Prisma schema update:**
   - Edit schema, run migrate/generate, ensure `generated/prisma` compiles.
   - Adjust entities/DTOs and sample data accordingly.
5. **Bot smoke test:**
   - Ensure `.env` has a valid token and database URL; add `WEBHOOK_URL`/`WEBHOOK_SECRET` only in webhook mode, and `WEBAPP_URL` for the Arena.
   - Run `pnpm dev`, watch console for `Server running` + `COMMANDS REGISTERED` logs.
   - Interact with bot via Telegram; use test chat to verify new flows.

---

## 13. Documentation & Messaging

- `README.md` is the short entry point. Human-facing detail lives in `docs/`:
  architecture, local development, gameplay, commands, Mini App Arena, testing,
  operations, and a sanitized deployment guide.
- Keep `docs/architecture.md` and `docs/mini-app-arena.md` in sync with runtime
  behavior, routes, and environment variables.
- Keep AGENTS.md around ~150 lines; append new knowledge instead of rewriting
  entire sections.
- Mention manual steps or data migrations in PR descriptions so future agents
  know what to reproduce.

---

## 14. Cursor / Copilot Rules

- No `.cursor/rules/` or `.cursorrules` files exist.
- No `.github/copilot-instructions.md` exists.
- If you add such rules, summarize them in this section with paths so automation can honor them.

---

## 15. Exit Checklist

- `pnpm run typecheck` + `pnpm lint` + `pnpm format:check` (plus relevant prisma commands) pass.
- `pnpm run build:web` (or `pnpm run build`) succeeds whenever the Mini App client changed.
- `pnpm dev` starts without crashes; new commands appear via `bot.api.getMyCommands()`.
- Database migrations applied or documented; data seeds updated if needed.
- `git status` clean; no leftover experimental files.
- README and AGENTS updated if any workflow/tooling changed.

---

## 16. Roadmap · Phases 6–25

Previous phases: P1 tooling/CI + webhook hardening, P2 conversation timeouts + conversation-local encounters, P3 PokeAPI caching + gen-9 pool + dead-code sweep, P4 dead datasource/`ErrorEntity` removal + constants tidy, P5 turn-based Battle System + rate-limiter & unit tests, P6 comprehensive integration test harness with `ApiClientOptions.fetch`.

Phase 7 (landed on `main`): Architectural Migration to Feature-Based Composers (Vertical Slices: `auth`, `battle`, `pokemon`, `system`). Removed class-heavy controllers, `BaseCommandController`, `DBService`, and `@addConversation` decorator. Converted conversations to pure composable functions. Reorganized test directory (`tests/domain`, `tests/features`, `tests/harness`, `tests/presentation`) and removed `unplugin-swc` from Vitest (runs native ESM).

Phase 8 (landed on `main`): Pokedex Vertical Slice (`src/features/pokedex/` with `/pokedex` lookup, stat visualizers, lore flavor text, bag-ownership detection), 10-media collection batching fix in `sendPokemonPhotos`, and production graceful shutdown (`SIGINT`/`SIGTERM`) with clean Prisma and server teardown.

Phase 9 (landed on `main`): Pokéball Tiers, Catch Rate Mechanics & Inventory Slice (`src/domain/items/ballTypes.ts` with authentic catch formulas, `src/features/inventory/` with `/bag` and `/daily` reward streaks, Prisma schema migration for user ball counts and streaks, and dynamic multi-ball encounter loop with run, alert on empty balls, and flee chances).

Phase 10 (landed on `main`): Battle Leaderboard & Trainer Profile Slice (`src/features/profile/` with `/profile` Trainer Card displaying win rates, rank titles, collection counts, and buddy sprite; `/leaderboard` top-10 ranking with medal icons and caller position; `/buddy` setting and favorite companion selection; Prisma schema migration for `wins`, `losses`, and `buddyPokemonId`; and automated battle outcome recording).

Phase 11 (landed on `main`): Group Chat Spawns, Group Encounter Service & Webhook Hardening (`src/features/pokemon/groupEncounter.service.ts` tracking group chat activity with message thresholds, anti-spam burst protection, spontaneous wild spawns, multiplayer ball throws with catch/spook/flee mechanics, despawn timers, and race-condition mutexes; group-aware `/generate_pokemon`; markdown entity sanitization via `escapeMarkdown` in `src/features/common/stringHelper.ts` to prevent Telegram entity parse errors; and top-level bot middleware error boundary ensuring 200 OK responses to prevent webhook retry deadlocks).

Phase 12 (landed on `main`): Professional Repository Infrastructure & Release Automation (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `.github/pull_request_template.md`, structured issue forms, Husky hooks for `pre-commit` [lint-staged], `commit-msg` [@commitlint], and `pre-push` [typecheck & test], Google Release Please action with `.release-please-config.json` and `.release-please-manifest.json`, Dependabot security updates, `.editorconfig`, and `package.json` SemVer `1.1.0` with `private: true` and `engines`).

Phase 13 (landed on `main`): Encounter Lifecycle Hardening & Interactive Pokémon Carousel (`src/presentation/server.ts` webhook timeout to 30s with `"return"`, deterministic replay in `conv.external`, fallback catch handler for orphaned buttons; transformed `/pokemons` from static image dump into an interactive paged carousel card with dynamic levels, dual types, abilities, evolution progress, one-tap buddy assignment, roster overview, and anti-hijack stateless callback queries).

Phase 14 (landed on `main`): Official grammY Plugin Evaluation & Inline Query System (`@grammyjs/auto-retry` installed on `bot.api.config.use` for zero-boilerplate exponential backoff against 429 flood limits and network drops; and full `@pokeshowdown_bot` Inline Mode engine via `src/features/inline/` providing `@bot <pokemon>` Pokédex cards, `@bot buddy` companion showcase, and `@bot team` party cards across any Telegram chat with privacy-safe caching).

Phase 15 (landed on `main`): PC Storage Box System & Pokémon Release with Pokéball Rewards (active 6-member party with auto-routing 7th+ catches to PC Storage Box with `isInParty: false`, `/box` PC storage carousel with Withdraw, Deposit, and Swap actions, `/release` with 2-step confirmation and Professor Oak rewards [+3 Pokéballs standard, +5 Pokéballs & +1 Great Ball shiny], and lone Pokémon protection guards).

Phase 16 (landed on `main`): Correctness & Hardening Audit Sweep (atomic group-catch mutex in `groupEncounter.service.ts`, evolution re-stacks `timesCaught` with `1 + remainingCaught` instead of duplicating rows, buddy migration on evolution merge, consistent Telegram Markdown escaping and single-asterisk format, scoped command menus registered with `CommandGroup.setCommands`, buddy "none" state, per-user atomic ball deduction + rate limiting for group catches, Postgres decrement guard against negative ball counts, immutable `BattleEngine` state with turn-cap resolution, pruned in-memory rate-limit/activity maps, removal of dead `BattleService.awardVictory`, and the `/pokemonsummary` detailed stats view).

Phase 17 (landed on `main`): Dual-Mode (Long Polling & Webhook), Dynamic IP Resilience & Dokploy Compose Support (`src/presentation/server.ts` and `src/index.ts` supporting `BOT_MODE=polling` and `BOT_MODE=webhook`, `deleteWebhook` and `DROP_PENDING_UPDATES` queue protection after power outages, Express `/health` check in polling mode, `compose.dokploy.yaml` production stack with named volume `postgres_data` and automatic `prisma migrate deploy`, and full feature parity preservation for conversations, encounters, and inline queries).

Phase 18 (landed on `main`): High-Speed Production Build & Fancy Documentation Modernization (`esbuild` bundling to `dist/index.js` in ~20ms, production runtime `node dist/index.js`, Dockerfile build step, `.gitignore` `dist/`, removal of verbose Cloudflare tunnel tutorials and all mermaid diagrams from README, comprehensive showcase of all 9 bot gameplay domains, and Dokploy/Compose quickstart guide).

Phase 19 (landed on `main`): Container Startup Resilience & Dokploy Networking Fix (`docker-entrypoint.sh` waits for PostgreSQL, retries `prisma migrate deploy` with a bounded attempt count and logs DNS diagnostics before starting the bot; `DB_HOST`/`DB_PORT`/`DB_MAX_ATTEMPTS` overrides in `compose.dokploy.yaml` so the bot can target a Dokploy-managed database; PostgreSQL 18 pinned in both compose files with the `<major>/docker` volume layout; TCP-based `pg_isready -h 127.0.0.1` healthchecks to avoid false positives during `initdb`; and a Dokploy troubleshooting matrix in the README).

Phase 20 (landed on `main`): Dokploy Compose Unification & Preflight TCP Probe (`compose.yaml` and `compose.dokploy.yaml` synchronized and production-ready so Dokploy succeeds out-of-the-box regardless of whether the user customizes the Compose Path; local dev workflow moved cleanly to `compose.dev.yaml`; `docker-entrypoint.sh` upgraded with automated URL parsing and a non-blocking Node `net.connect` preflight probe with clear socket diagnostics; port mapping `"${DB_PORT_BIND:-2300}:5432"` exposing port 2300 externally while keeping internal container networking on default 5432; and network alias guarantees).

Phase 21 (landed on `main`): Dokploy Swarm Overlay Networking & Entrypoint `PORT` Isolation (`pokebot-net` in `compose.yaml` and `compose.dokploy.yaml` switched to a single `driver: overlay` network with `attachable: true` so container-to-container traffic runs inside Docker Swarm's isolated network namespace and bypasses host-level `firewalld` + `br_netfilter` `EHOSTUNREACH` rejections on Fedora/RHEL servers; `docker-entrypoint.sh` internal variables renamed to `TARGET_DB_HOST`/`TARGET_DB_PORT` so the exported `PORT=5000` environment variable is never overwritten with `5432` before `exec node dist/index.js`, ensuring the `/health` endpoint and container healthcheck succeed).

Phase 22 (landed on `main`): Trade Conversation Replay, Parallel Lockout & Group Trade Hardening (`src/features/pokemon/pokemon.conversations.ts` wrapping `randomUUID()` in `conv.external` to preserve `tradeId` across replays, `BigInt` equality checks on Telegram IDs in self-trade validation, `parallel: true` across all conversation registrations to eliminate chat lockout, `registerFeatureConversationCommand` calling `ctx.conversation.exitAll()` before starting new flows, command pass-through via `.unless()` in text prompts, in-memory trade collection synchronization, buddy clearing on trade in datasources, and full integration test harness coverage for trade flows and command concurrency).

Phase 23 (landed on `main`): Trade Flow Correctness & Conversation Isolation (`registerFeatureConversationCommand` no longer calls `ctx.conversation.exitAll()` in groups so a bystander's `/start` cannot abort another trainer's trade or battle, `tradePokemon` demotes a received party pokemon to the box to preserve `MAX_PKMN_PARTY`, per-trainer `trade-confirm:${tradeId}:${telegramId}` callbacks plus a non-destructive fallback listener that reports "not meant for you" instead of a false "expired", explicit `{ next: true }` on every command-ignoring `.unless()`, and regression tests for all four behaviours).

Phase 24 (landed on `main`): Telegram Mini App Arena API (`src/presentation/web/` with signed `initData` validation, `X-Telegram-Init-Data` middleware, `/api/me`, in-memory `ArenaService` rooms, REST lobby/action endpoints, SSE snapshots with heartbeat and per-room stream caps, ranking writes on finish, public participant pick summaries, and `WEBAPP_URL`/`ARENA_TURN_TIMEOUT_SEC` wiring in `src/index.ts`).

Phase 25 (landed on `main`): Mini App Arena Client & Static Hosting (`src/presentation/web/client/` TypeScript UI with Telegram theme/haptics, profile + lobby + party picker + live battle + result screens, EN/ES copy, fetch-based SSE with backoff, `dist/web` bundle via Vite, `express.static` + SPA fallback in `createWebApp`, `pnpm build:web`/`dev:web` scripts, compose env forwarding for `WEBAPP_URL`, and static/SSE/parser regression tests).

Phase 26 (landed on `main`): Vite Client Build Migration (replaced the ad-hoc `scripts/build-web.mjs` esbuild wrapper with `vite.config.ts`, `vite-env.d.ts`, CSS imported from `client/main.ts`, hashed `dist/web/assets` output with sourcemaps, `vite build --watch` for development, a CI Mini App build step, Node `>=22.12.0`, and the `web` commitlint scope).

Phase 27 (landed on `main`): Battle Arena Unification & Architecture Simplification (made the Mini App Arena the sole battle system, replaced the legacy text-based battle conversation with a streamlined `/battle` command opening the Arena via `startapp` deep-links in groups or `web_app` buttons in private chats, automatic duel start upon both trainers picking a Pokémon, unified leave/forfeit action, native `EventSource` with stateless HMAC stream tickets, lazy static asset check in `createWebApp`, single-command development via `pnpm run --parallel "/^dev:/"`, and post-battle group chat result announcements).

Phase 28 (landed on `main`): Documentation Restructure (short README, `docs/` guides for architecture, local development, gameplay, commands, Mini App Arena, testing, operations, and sanitized deployment; docs included in Prettier; contributor and agent links updated).

Conventions: each feature = one scoped commit set, verified with typecheck/lint/format + `pnpm test`, README/AGENTS updated. No new shared mutable state for encounters or battles (keep them conversation-local).

Deployment gotchas worth remembering: the bundled production Compose stack and `compose.dev.yaml` serve different purposes; do not run host and container dev servers on the same port. Mini App traffic needs a public HTTPS origin: set `WEBAPP_URL` and route it to the bot's HTTP port; leaving it empty disables the web layer and menu button. Compose only forwards the variables it references, so keep `WEBAPP_URL`, `WEBAPP_AUTH_MAX_AGE_SEC`, and `ARENA_TURN_TIMEOUT_SEC` in every production compose file. Arena rooms are in memory: use one replica and expect a deploy to drop active rooms. Never overwrite `PORT` inside `docker-entrypoint.sh` because it is already provided for Express (`5000`) and the `/health` check. Keep the PostgreSQL storage layout in sync with the major version (`/var/lib/postgresql` for 18+, `/var/lib/postgresql/data` for 16 and older) and never reuse a volume across majors. Remember that port 2300 is only for host-to-container connections; container-to-container traffic targets PostgreSQL's internal port 5432. On hosts with restrictive firewall/bridge filtering, container-to-container traffic may be blocked; an attachable overlay network is the portable fix. Platforms typically inject environment variables only through `${VAR}` references or `env_file`, never implicitly.

Stay disciplined, document discoveries, and keep this guide trustworthy for the next agent.
