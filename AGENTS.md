# AGENT PLAYBOOK · SHOWDOWNBOT

> Reference guide for autonomous contributors. Keep it current, practical, and grounded in the repository’s real workflows.

---

## 0. Quick Facts

- Node 22+, TypeScript ESM (`"type": "module"`, `moduleResolution: nodenext`).
- Package manager: pnpm 10.x (`corepack enable pnpm`).
- Stack: grammy bot framework, @grammyjs commands/conversations, Prisma/Postgres, pokenode-ts, Express.
- Runs in **webhook mode**: Express `Server` registers the webhook with a `secret_token`; no long polling.
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

- **Dev watch**: `pnpm dev` (tsx watch `src/index.ts`, boots bot + Express shell).
- **One-off run**: `pnpm start` (single execution, useful for smoke tests or maintenance scripts).
- **Static analysis**: `pnpm run typecheck` (tsc --noEmit, strict null checks on).
- **Lint / format**: `pnpm lint`, `pnpm lint:fix`, `pnpm format`, `pnpm format:check` (Prettier; formatted paths are scoped in package.json to avoid `postgres/` permission issues).
- **Migrations**: `pnpm run prisma:migrate -- --name <desc>` (requires live DB connection).
- **Codegen**: `pnpm run prisma:generate` after migrations/schema edits.
- **Testing**: No official suite yet. For now, add targeted scripts (e.g., `src/devtools/*.ts`) and execute with `pnpm tsx path/to/script.ts`.
- **Single test guidance (future-ready)**: once a runner (Vitest/Jest) is added, document commands like `pnpm vitest run src/foo.test.ts -t "case"`. Until then, mimic single-test behavior by scoping devtool scripts narrowly.

---

## 3. Architecture & Wiring

- `src/index.ts` validates env (`API_KEY`, `WEBHOOK_URL`, `WEBHOOK_SECRET`), then `await botInstance.register()` and `await server.setup()`. No `AppContainer` — wiring lives in `MainBot` + `Server`.
- Layers are explicit: `src/domain` (entities/contracts/constants) → `src/infrastructure` (Prisma-backed datasources) → `src/presentation` (controllers, services, bot, server). Keep PRs scoped to the correct layer.
- Controllers (`AuthController`, `PokemonController`, `SystemController`) extend `BaseCommandController` (`src/presentation/controllers/BaseCommandController.ts`), which owns a `CommandGroup`, auto-localizes EN/ES descriptions via `registerCommand(cmdName, handler)`, and scopes commands to group chats. `displayError` is the single error reporter.
- `MainBot` (`src/presentation/mainbot.ts`) wires `UserDataSourceImpl` + `PokemonDataSourceImpl`, instantiates `PokeApiService` + `DBService`, instantiates `AuthConversation`/`PokemonConversation` (their `@addConversation` methods register into `botConversations`), then `registerConversations()` installs `createConversation` for each. `register()` (public, awaited) registers controllers + installs command middleware + `setMyCommands` (EN + ES).
- Conversations live in `AuthConversation` (`src/presentation/services/Auth.conversation.service.ts`) and `PokemonConversation` (`src/presentation/services/Pokemon.conversation.service.ts`) with the `@addConversation` decorator (`src/presentation/services/addConversation.decorator.ts`). Controllers trigger them with `ctx.conversation.enter("name")`; only register conversations through `botConversations`.
- Encounters are conversation-local: `generatePokemon` holds the wild `PokemonEntity` in its own scope (grammY preserves locals across suspensions). There is **no shared encounter map** — do not reintroduce one.
- Domain entities (`PokemonEntity`, `UserEntity`) enforce invariants end-to-end. Datasources and services construct these entities directly (no DTO layer). Always return domain entities from persistence.
- When persisting user-owned pokémon (starters, catches, trades, evolutions), include the owning `userId` in the Prisma insert/connect and wrap the pokémon create + user update in a single transaction so `pokemonIds` stay in sync.
- `Server` (`src/presentation/server.ts`) is a thin Express wrapper: mount JSON middleware, register the webhook with `secret_token` (fail-fast on error), mount `webhookCallback`, then listen. `index.ts` owns startup; avoid starting the bot anywhere else to prevent double polling.

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

- `MainBot.setupErrorHandler()` installs a `bot.catch` global handler (structured log + best-effort reply). Unhandled conversation/command errors propagate here.
- Conversation steps do **not** wrap with try/catch — let errors bubble to `bot.catch`. Controllers use `this.displayError(e, ctx, msg?)` (from `BaseCommandController`) as the single error reporter with structured logging.
- Use contextual logs: `console.error("pokemon.generate failed", { username, error })` rather than plain stack output.
- Differentiate user mistakes (not registered) from system faults (Prisma/PokeAPI issues). Never leak stack traces or secrets into Telegram chats.
- When calling `conv.external`, ensure the inner function throws informative errors so upstream handlers can act.

---

## 7. Conversations & Command Decorators

- Commands live in controllers (`AuthController`, `PokemonController`, `SystemController`); extend `BaseCommandController` and reuse its `registerCommand(cmdName, handler)` helper so scopes/translations stay consistent.
- Add translations for every command inside `src/presentation/controllers/commands.ts` (English + Spanish). Remove placeholder or offensive entries immediately.
- Conversations: annotate `AuthConversation`/`PokemonConversation` methods with `@addConversation`; `botConversations` map drives registration inside `MainBot.registerConversations()`.
- Guard callback queries with `.andFrom(ctx.from!)` or `.andFrom(userCallback.callbackQuery.from)` so other users cannot hijack flows.
- Namespace trade callbacks with a per-trade `tradeId` (e.g. `trade-accept:${tradeId}` / `trade-reject:${tradeId}`) so buttons can't be reused across chats.
- Add `{ maxMilliseconds: CONVERSATION_TIMEOUT_MS }` to every `waitForCallbackQuery`/`waitFrom` so hung conversations don't leak memory.
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
- Response caching is explicit: `PokemonClient`/`EvolutionClient` are built with `cacheOptions: { ttl: 1h }` (`CACHE_TTL_MS`). Random wild spawns aren't cacheable; starters, evolutions, and species lookups are.
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

1. **Add command:**
   - Define metadata in `controllers/commands.ts` (EN + ES).
   - Implement handler method in the appropriate controller (`AuthController`, `PokemonController`, `SystemController`) and register via `registerCommand` inside the controller's `start()`/`register()` method.
   - Update README/AGENTS if command footprint changes.
2. **Add conversation:**
   - Implement method in `AuthConversation`/`PokemonConversation`, decorate with `@addConversation`.
   - Invoke via controller (`ctx.conversation.enter("name")`), ensure inline keyboards/callbacks are namespaced and every wait has a `maxMilliseconds` timeout.
3. **Repository/DTO change:**
   - Update interfaces in `src/domain/datasource` or `src/domain/entities`.
   - Implement adjustments in infrastructure datasources, plus tests/dev scripts.
4. **Prisma schema update:**
   - Edit schema, run migrate/generate, ensure `generated/prisma` compiles.
   - Adjust entities/DTOs and sample data accordingly.
5. **Bot smoke test:**
   - Ensure `.env` has valid token + DB URL + `WEBHOOK_URL`/`WEBHOOK_SECRET`.
   - Run `pnpm dev`, watch console for `Server running` + `COMMANDS REGISTERED` logs.
   - Interact with bot via Telegram; use test chat to verify new flows.

---

## 13. Documentation & Messaging

- README currently lists commands and setup steps. Update it whenever env vars, flows, or tooling change.
- Keep AGENTS.md around ~150 lines; append new knowledge instead of rewriting entire sections.
- Mention manual steps or data migrations in PR descriptions so future agents know what to reproduce.

---

## 14. Cursor / Copilot Rules

- No `.cursor/rules/` or `.cursorrules` files exist.
- No `.github/copilot-instructions.md` exists.
- If you add such rules, summarize them in this section with paths so automation can honor them.

---

## 15. Exit Checklist

- `pnpm run typecheck` + `pnpm lint` + `pnpm format:check` (plus relevant prisma commands) pass.
- `pnpm dev` starts without crashes; new commands appear via `bot.api.getMyCommands()`.
- Database migrations applied or documented; data seeds updated if needed.
- `git status` clean; no leftover experimental files.
- README and AGENTS updated if any workflow/tooling changed.

---

## 16. Roadmap · Phase 5 (Future Work)

Previous phases (landed on `main`): P1 tooling/CI + webhook hardening, P2 conversation timeouts + conversation-local encounters, P3 PokeAPI caching + gen-9 pool + dead-code sweep, P4 dead datasource/`ErrorEntity` removal + constants tidy.

Planned Phase 5 (features), not yet started — pick scope with the user before executing:

1. **Testing setup**: add Vitest + a minimal suite (repository/DTO/entity unit tests, conversation/service smoke tests). Document `pnpm vitest run` in §2 once added.
2. **Battles**: design a `BattleController`/`BattleConversation` with turn-based flow; extend `commands.ts` (EN + ES) and scope to group chats.
3. **Pokedex / pokédex lookup**: new `/pokedex` command backed by `PokeApiService` (cache-friendly), plus a persisted dex-progress column if desired.
4. **Encounter rate tuning**: expose spawn weights/shininess via constants (`SHINY_ODDS`, `TOTAL_OF_POKEMON`) and make them config-driven if requested.
5. **Anti-abuse**: rate-limit spawns/catches per user, tie encounters to `userId` instead of username, and add `timesCaught` economy balance checks.

Phase 5 conventions: each feature = one scoped commit set, verified with typecheck/lint/format + `pnpm dev` smoke test, README/AGENTS updated. No new shared mutable state for encounters (keep them conversation-local).

Stay disciplined, document discoveries, and keep this guide trustworthy for the next agent.
