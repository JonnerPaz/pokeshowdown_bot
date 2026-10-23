# Testing

The project uses [Vitest](https://vitest.dev/) with native ESM. Tests cover the
domain, feature slices, the bot presentation layer, and the Mini App API/client.

## Commands

```bash
pnpm test                 # run the full suite once
pnpm vitest               # watch mode
pnpm vitest run tests/domain/battleEngine.test.ts
pnpm run typecheck        # TypeScript only
pnpm lint                 # ESLint
pnpm format:check         # Prettier, including docs
pnpm run build:web        # verify the Mini App bundle
```

## Test layout

| Path                      | Coverage                                                                                                                     |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| `tests/domain/`           | Entities, builders, ball formulas, and the battle engine.                                                                    |
| `tests/features/`         | Feature conversations and services: auth, battle, pokemon, inventory, pokedex, profile, inline, arena, and group encounters. |
| `tests/presentation/`     | Command metadata, rate limiting, auto-retry, server behavior, and the web layer.                                             |
| `tests/presentation/web/` | init-data validation, stream tickets, API/SSE routes, static serving, and the client parser.                                 |
| `tests/harness/`          | Reusable in-memory datasources, mocked Telegram client, and bot factory.                                                     |

## Integration harness

`tests/harness/testHarness.ts` builds a real `MainBot` with:

- In-memory `UserDataSource` and `PokemonDataSource`.
- A mocked `PokeApiService`.
- A real `RateLimiterService` and `BattleService`.
- A `MockTelegramClient` injected through grammY's `ApiClientOptions.fetch`.

The mock captures outgoing Bot API calls and can assert messages, keyboards, and
Markdown validity without contacting Telegram. Tests can dispatch commands,
callbacks, text messages, and inline queries through helper functions.

This means feature tests exercise the real composer/conversation wiring while
staying deterministic and offline.

For Arena tests, `tests/harness/arena.ts` provides a room/battle-port factory.
Inject a deterministic `rng` and a controllable `now` when asserting turn order,
timeouts, or absence behavior.

## What is covered

- Battle turn order, speed ties, actions, type effectiveness, and rank outcomes.
- Arena lobby/join/pick/action/leave flows, timers, absences, turn-limit draws,
  room expiry, and SSE payloads.
- Telegram init-data validation, stream ticket signing and expiry, auth failures,
  static fallback, and API error shapes.
- Feature conversations, including trade callbacks, group encounters, party/box
  invariants, and catch flows.
- Command registration metadata for English and Spanish.

## CI and hooks

The GitHub Actions workflow runs:

1. `pnpm install --frozen-lockfile`
2. `pnpm run prisma:generate`
3. `pnpm run typecheck`
4. `pnpm lint`
5. `pnpm format:check`
6. `pnpm run build:web`
7. `pnpm test`

Husky also runs `lint-staged` on pre-commit, commitlint on `commit-msg`, and
typecheck plus tests on pre-push.

## Writing tests

- Prefer the harness over ad-hoc mocks; it keeps bot behavior realistic.
- Use the in-memory datasources for feature tests.
- Use a deterministic `rng` and fake/controlled time for Arena tests.
- Assert user-visible behavior (messages, buttons, API payloads) rather than
  private implementation details.
- Keep tests independent; do not share mutable room or encounter state between
  cases.
- Add a regression test for every bug fix that changes behavior.
