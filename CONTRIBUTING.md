# Contributing to PokeBotShowdown

Thank you for your interest in contributing to **PokeBotShowdown**! We welcome bug fixes, documentation improvements, new game mechanics, and feature enhancements.

Please take a moment to review this document to ensure a smooth, professional, and consistent contribution workflow.

---

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## Getting Started

### 1. Prerequisites

Before setting up the project locally, ensure you have:

- **Node.js**: 22+ (CI runs Node 26)
- **pnpm**: 10.x (`corepack enable pnpm`)
- **Docker & Docker Compose**: for local PostgreSQL
- **Telegram Bot Token**: obtained from [@BotFather](https://t.me/botfather)
- **Cloudflare Tunnel (`cloudflared`)**: for local webhook development

### 2. Environment Bring-Up

1. **Fork and clone** the repository:

   ```bash
   git clone https://github.com/<your-username>/pokeshowdown_bot.git
   cd pokeshowdown_bot
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

   _(This automatically installs and configures local Husky git hooks)._

3. **Configure environment variables**:

   ```bash
   cp env-sample.env .env
   ```

   Fill in your `API_KEY` (Telegram bot token), `DATABASE_URL`, `WEBHOOK_URL`, and `WEBHOOK_SECRET`.

4. **Start PostgreSQL and generate Prisma client**:

   ```bash
   docker compose up -d db
   pnpm run prisma:generate
   pnpm run prisma:migrate
   ```

5. **Start local development**:
   ```bash
   pnpm dev
   ```

---

## Development Workflow & Git Standards

### Branching Strategy

- Always create a dedicated branch off `main` for your work:
  - `feat/feature-name` for new user-facing functionality or mechanics.
  - `fix/bug-description` for bug fixes.
  - `docs/doc-update` for documentation changes.
  - `refactor/scope-description` for internal restructuring.
- Keep branches focused on a single logical change.

### Conventional Commits

This repository strictly enforces the [Conventional Commits specification](https://www.conventionalcommits.org/) via **Commitlint** and Git hooks. Every commit message must follow this format:

```text
<type>(<scope>): <short description>
```

#### Allowed Types:

- `feat`: A new user-facing feature or bot command.
- `fix`: A bug fix.
- `docs`: Documentation updates.
- `test`: Adding or correcting tests.
- `refactor`: Code changes that neither fix a bug nor add a feature.
- `perf`: Code changes that improve performance.
- `style`: Formatting, whitespace, or lint fixes without logic change.
- `build`: Changes to build scripts, bundling, or tooling.
- `ci`: Changes to CI/CD workflows (`.github/`).
- `chore`: Maintenance tasks or dependency updates.

#### Recognized Scopes:

`auth`, `battle`, `ci`, `common`, `config`, `deps`, `docs`, `domain`, `hooks`, `inventory`, `pokedex`, `pokemon`, `profile`, `release`, `structure`, `system`, `test`, `webhook`.

#### Examples:

```text
feat(pokemon): implement shiny encounter sparkles
fix(webhook): sanitize markdown entities in user profiles
docs(contributing): clarify commitlint scopes and setup
test(battle): add test case for type effectiveness multipliers
```

---

## Architecture & Code Guidelines

- **Vertical Slice Architecture**: Features live under `src/features/<feature>/` (`auth`, `battle`, `inventory`, `pokedex`, `pokemon`, `profile`, `system`). Each slice exports a composer factory `create<Feature>Feature(deps): Composer<AppContext>`.
- **Pure Composable Functions**: Avoid classes or decorators for controllers and conversations. Conversations are standalone async functions mounted via `feature.use(createConversation(...))`.
- **Concurrency & State**: No shared mutable maps for wild encounters or battles. Encounters are conversation-local or managed atomically via `GroupEncounterService` with double-checked mutex locking.
- **Strict Typing**: TypeScript ESM (`"moduleResolution": "nodenext"`). Always include the `.js` extension on local imports. Respect strict null checks and `exactOptionalPropertyTypes: true`.
- **Persistence Invariants**: Wrap related database mutations (e.g. creating user-owned Pokémon and deducting items) in transactions to preserve consistency.

---

## Verification & Quality Gates

Before submitting a Pull Request, verify that all quality gates pass locally:

```bash
# 1. Static typecheck (must pass with 0 errors)
pnpm run typecheck

# 2. Linter (ESLint)
pnpm lint

# 3. Format check (Prettier)
pnpm format:check

# 4. Full test suite (Vitest in-memory harness)
pnpm test
```

> [!TIP]
> Our pre-push Git hook automatically executes `pnpm run typecheck && pnpm test` whenever you run `git push`, preventing broken pushes from reaching GitHub Actions.

---

## Submitting a Pull Request

1. Push your branch to your GitHub fork:
   ```bash
   git push origin feat/your-feature
   ```
2. Open a Pull Request against the `main` branch.
3. Fill out the **Pull Request Template**:
   - Provide a clear summary of what changed and why.
   - Link any related issue (`Closes #123`).
   - Check off the verification checklist.
4. Ensure all GitHub Actions CI checks are green.
5. A maintainer will review your code. Address feedback promptly and keep commit history clean.
