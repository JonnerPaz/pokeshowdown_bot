# AGENT PLAYBOOK · SHOWDOWNBOT

> Reference guide for autonomous contributors. Keep it current, practical, and grounded in the repository’s real workflows.

---

## 0. Quick Facts
- Node 22+, TypeScript ESM (`"type": "module"`, `moduleResolution: nodenext`).
- Package manager: pnpm 10.x (`corepack enable pnpm`).
- Stack: grammy bot framework, @grammyjs commands/conversations, Prisma/Postgres, axios, pokenode-ts, Express.
- Layers: `domain` (entities/contracts/constants), `infrastructure` (datasources + repositories), `presentation` (controllers/services/bot/server), `generated/prisma` output.
- Secrets: `.env` holds `API_KEY`, `DATABASE_URL`, `PORT`, etc. Never commit or echo secret values.

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
- **Migrations**: `pnpm run prisma:migrate -- --name <desc>` (requires live DB connection).
- **Codegen**: `pnpm run prisma:generate` after migrations/schema edits.
- **Testing**: No official suite yet. For now, add targeted scripts (e.g., `src/devtools/*.ts`) and execute with `pnpm tsx path/to/script.ts`.
- **Single test guidance (future-ready)**: once a runner (Vitest/Jest) is added, document commands like `pnpm vitest run src/foo.test.ts -t "case"`. Until then, mimic single-test behavior by scoping devtool scripts narrowly.

---

## 3. Project Structure Expectations
- `src/index.ts` only calls `AppContainer.setup()`; do not instantiate bots/servers elsewhere.
- `AppContainer` spins up `MainBot` (token, repositories, conversations) first, then passes the configured bot into Express `Server` to own `bot.start()`.
- Layers are now explicit: `src/domain` (entities, DTOs, repository contracts, constants) → `src/infrastructure` (Prisma-backed datasources + repositories) → `src/presentation` (controllers, services, bot, server). Keep PRs scoped to the correct layer.
- Controllers live under `src/presentation/controllers`. `LoginController` currently handles onboarding plus logged-in flows using its private `useCommand` helper (CommandGroup). New controllers should extend `BaseCommandController` to inherit the same localization/scope behavior.
- `MainBot` wires `UserRepositoryImpl` + `PokemonRepositoryImpl`, instantiates `PokeApiService` + `ConversationService`, registers controllers, then installs `conversations()` + `commands()` middleware.
- Conversations stay inside `ConversationService` with the `@addConversation` decorator (`src/presentation/services/addConversation.decorator.ts`). Controllers trigger them with `ctx.conversation.enter("name")`; only register conversations through `botConversations`.
- Domain entities (`PokemonEntity`, `UserEntity`) enforce invariants. DTOs such as `CreateUserDto` / `UpdateUserDto` validate inbound data. Repositories should always return these types rather than raw Prisma models.
- `Server` (`src/presentation/server.ts`) is a thin Express wrapper: mount JSON middleware, optional webhook endpoint, log registered commands, then start the bot. Avoid starting the bot anywhere else to prevent double polling.

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
- Wrap conversation steps with try/catch. On failure, `ctx.reply("There was an error…")` and log a structured message for operators.
- Use contextual logs: `console.error("pokemon.generate failed", { username, error })` rather than plain stack output.
- Differentiate user mistakes (not registered) from system faults (Prisma/PokeAPI issues). Never leak stack traces or secrets into Telegram chats.
- When calling `conv.external`, ensure the inner function throws informative errors so upstream handlers can act.

---

## 7. Conversations & Command Decorators
- Commands live in `LoginController` today; leverage `CommandGroup.useCommand` helpers (see `LoginController.useCommand`) to auto-localize descriptions and scope commands.
- If you create additional controllers, extend `BaseCommandController` and reuse its `useCommand` helper so scopes/translations stay consistent.
- Add translations for every command inside `src/presentation/controllers/commands.ts` (English + Spanish). Remove placeholder or offensive entries immediately.
- Conversations: annotate `ConversationService` methods with `@addConversation`; `botConversations` map drives registration inside `MainBot.registerConversations()`.
- Guard callback queries with `.andFrom(ctx.from!)` or `.andFrom(userCallback.callbackQuery.from)` so other users cannot hijack flows.
- Delete temporary messages (`ctx.api.deleteMessage`) when flows complete to keep chats tidy.

---

## 8. Database & Prisma Layer
- Central Prisma client lives in `src/data/postgres/index.ts`; do not instantiate new `PrismaClient` instances elsewhere.
- Datasources translate Prisma records into domain entities (convert JSON columns like `sprites`). Never return raw database types from repositories.
- When updating relational data (users ↔ pokemons), use Prisma relation helpers (`connect`/`disconnect`) rather than overwriting arrays manually.
- Every schema change: edit `prisma/schema.prisma` → `pnpm run prisma:migrate -- --name <desc>` → `pnpm run prisma:generate`. Commit schema, migrations, and generated client.

---

## 9. Networking & External APIs
- `PokeApiService` encapsulates pokenode-ts usage. Other layers should consume its methods, not the SDK directly.
- Batch external requests with `Promise.all` but limit concurrency if calls become heavy.
- Consider caching (axios-cache-interceptor is installed) for frequently requested resources.
- Expose helper methods (e.g., `createStarterPokemon`, `createPokemon`, `evolvePokemon`) and keep `currentPokemon` handling thread-safe if you expand multi-user flows.

---

## 10. Dependency Hygiene
- Runtime deps: `pnpm add <pkg>`; dev deps: `pnpm add -D <pkg>`.
- `pnpm-lock.yaml` is canonical. Remove accidental `package-lock.json`/`yarn.lock` if generated.
- Never commit `.env`, local DB dumps, or `node_modules`.

---

## 11. Git & Workflow
- Before committing: `pnpm run typecheck` (and `pnpm run prisma:generate` / migrations if schema changed).
- Keep commits scoped; describe rationale + verification steps in messages/PR descriptions.
- Do not amend or force-push shared branches without explicit instruction.
- Always leave the working tree clean; remove stray temporary files.

---

## 12. Operational Playbooks
1. **Add command:**
   - Define metadata in `controllers/commands.ts` (EN + ES).
   - Implement handler method in the appropriate controller, decorate with `@addCommand`, and ensure `registerControllers()` awaits it.
   - Update README/AGENTS if command footprint changes.
2. **Add conversation:**
   - Implement method in `ConversationService`, decorate with `@addConversation`.
   - Invoke via controller (`ctx.conversation.enter("name")`), ensure inline keyboards/callbacks are namespaced.
3. **Repository/DTO change:**
   - Update interfaces in `src/domain/repositories` or `src/domain/dto`.
   - Implement adjustments in infrastructure datasources/repositories, plus tests/dev scripts.
4. **Prisma schema update:**
   - Edit schema, run migrate/generate, ensure `generated/prisma` compiles.
   - Adjust entities/DTOs and sample data accordingly.
5. **Bot smoke test:**
   - Ensure `.env` has valid token + DB URL.
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
- `pnpm run typecheck` (plus relevant prisma commands) passes.
- `pnpm dev` starts without crashes; new commands appear via `bot.api.getMyCommands()`.
- Database migrations applied or documented; data seeds updated if needed.
- `git status` clean; no leftover experimental files.
- README and AGENTS updated if any workflow/tooling changed.

Stay disciplined, document discoveries, and keep this guide trustworthy for the next agent.
