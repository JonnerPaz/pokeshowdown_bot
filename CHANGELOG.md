# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-09-29

### Added

- **Multiplayer Group Encounters & Ambient Spawns**:
  - `GroupEncounterService` tracking group chat chatter with dynamic message thresholds (20–40 messages) and cooldowns.
  - Anti-spam burst filtering preventing message flooding from a single user within 2 seconds.
  - Multiplayer Pokéball throw buttons (`gcatch:<ballType>`) with real-time inventory deduction and spook/flee rolls.
  - Atomic double-checked mutex locking preventing double-captures and inventory loss across concurrent throws.
  - 2-minute auto-despawn timer with clean resource teardown.
- **Trainer Profiles & Battle Leaderboard**:
  - `/profile` command rendering custom Trainer Cards with win/loss rates, rank titles, collection counts, and companion buddy sprite.
  - `/leaderboard` command ranking top 10 trainers by PvP victories with medal icons and user positioning.
  - `/buddy` command for inspecting and setting active companion Pokémon.
- **Inventory System & Pokéball Tiers**:
  - `/bag` command viewing Pokéball counts and items.
  - `/daily` reward command with consecutive streak multipliers.
  - Authentic Gen-9 catch rate formulas factoring base catch rates, ball multipliers, and shake checks (`ballTypes.ts`).
- **Pokédex Encyclopedia**:
  - `/pokedex <name|id>` command displaying Pokémon lore flavor text, animated/static sprites, typings, visual stat progress bars, and ownership detection.
- **Turn-Based Battle System**:
  - `/battle` command facilitating interactive PvP battles with 18-type effectiveness matrix, move categories, rate limiting, and automated battle outcome recording.
- **Quality & Community Infrastructure**:
  - Pre-commit and pre-push Git hooks via Husky and lint-staged.
  - Conventional Commits enforcement via Commitlint.
  - GitHub issue forms, pull request template, Code of Conduct, Contributing guide, and Security policy.

### Changed

- Group chat wild encounters now omit the "Run" button to prevent single-member griefing.
- Architectural vertical-slice migration grouping features under `src/features/` with composable functions and dependency injection.
- Replaced class-based controllers and decorator metadata with pure grammY composer factories.

### Fixed

- Telegram legacy Markdown entity parse errors on usernames containing underscores (`_`) via `escapeMarkdown`.
- Webhook 500 retry deadlock resolved with top-level error boundary middleware guaranteeing `200 OK` HTTP responses.
- Telegram 10-media batching limit fix in `sendPokemonPhotos`.

## [1.0.0] - 2026-09-06

### Added

- Initial release of PokeBotShowdown.
- User registration (`/register`) and starter Pokémon selection.
- Solo wild Pokémon generation and capture loop (`/generate_pokemon`).
- Pokémon collection management (`/pokemons`).
- Evolution system (`/evolve`) and shiny variants (`/shiny`).
- Nickname customization (`/nickname`).
- Player-to-player Pokémon trading (`/trade`).
- Account deletion (`/delete_account`) with cascading cleanup.
- Express webhook server with Cloudflare Tunnel development support.
