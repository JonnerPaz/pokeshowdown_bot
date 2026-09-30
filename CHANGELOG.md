# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0](https://github.com/JonnerPaz/pokeshowdown_bot/compare/showdownbot-v1.1.0...showdownbot-v2.0.0) (2026-09-30)


### ⚠ BREAKING CHANGES

* Switch bot arquitecture to use webhook instead of long polling
* Add shiny support for pokemons
* Split `ConversationService` into smaller classes
* Split `LoginController` into smaller classes

### Features

* add bot.catch() global error handler ([0c7e982](https://github.com/JonnerPaz/pokeshowdown_bot/commit/0c7e98279fc78aec178c8d99f491b95895462a2e))
* Add nickname command ([d55b659](https://github.com/JonnerPaz/pokeshowdown_bot/commit/d55b659bdd0a725d66200c9c8a91a792e5ba5fd5))
* add nickname field ([edc5e0f](https://github.com/JonnerPaz/pokeshowdown_bot/commit/edc5e0f5de902b1df28af94100f62f573b806b4d))
* add per-user spawn/catch rate limiter ([58943b6](https://github.com/JonnerPaz/pokeshowdown_bot/commit/58943b6294dcb778ac3452e8e6bd836bc090953d))
* Add shiny support for pokemons ([af28b53](https://github.com/JonnerPaz/pokeshowdown_bot/commit/af28b538038ccb167cd7af921072e6727a23a62e))
* Add tunnel command ([3457322](https://github.com/JonnerPaz/pokeshowdown_bot/commit/34573224e69b02842fbf8c63438194d649bab488))
* Add webhook_url option ([f9421ce](https://github.com/JonnerPaz/pokeshowdown_bot/commit/f9421ce59f16acf1eacf3d493e68ef19690ee41b))
* **auth:** migrate auth commands and conversations to auth feature composer ([6165991](https://github.com/JonnerPaz/pokeshowdown_bot/commit/6165991b3cccf2fd859818f50960e0dfee1eb74c))
* **battle:** battle conversation, controller, and mainbot wiring ([f4b21c2](https://github.com/JonnerPaz/pokeshowdown_bot/commit/f4b21c2793d188d43ee3dcb5490409a0725a9bd1))
* **battle:** battle stats resolver and battle service with victory rewards ([2c562e6](https://github.com/JonnerPaz/pokeshowdown_bot/commit/2c562e67a09ed4e5fc1bda489fa4addb7ba71a85))
* **battle:** domain battle engine, type effectiveness, and unit tests ([4c4c456](https://github.com/JonnerPaz/pokeshowdown_bot/commit/4c4c4563f8818fedb2f263ab8d1a710f4b32315d))
* **battle:** migrate battle commands and conversation to battle feature composer ([995130d](https://github.com/JonnerPaz/pokeshowdown_bot/commit/995130d7e40c6da9c568d75c5ff465a084c49752))
* containerize dev server in docker compose ([216036e](https://github.com/JonnerPaz/pokeshowdown_bot/commit/216036e05f55262a997e6a28de2fabe3085ce861))
* enable explicit PokeAPI response caching ([6c7b8ee](https://github.com/JonnerPaz/pokeshowdown_bot/commit/6c7b8ee2d27d49da7aadb7d6993eb7ba9c80524b))
* expand wild pokemon pool to gen 9 ([db90cc8](https://github.com/JonnerPaz/pokeshowdown_bot/commit/db90cc895cbf1af123594546a8039434cc34dd7b))
* **inline:** integrate auto-retry plugin and implement telegram inline queries ([4087843](https://github.com/JonnerPaz/pokeshowdown_bot/commit/4087843201c58df729403576912e9e3d0bf78a27))
* **inventory:** implement pokeball tiers, catch rate mechanics, and daily reward streaks ([0698798](https://github.com/JonnerPaz/pokeshowdown_bot/commit/0698798ecf1bfb183748bdaec2109bb124711969))
* **loginController:** Replace `CommandGroup` as composition ([7521172](https://github.com/JonnerPaz/pokeshowdown_bot/commit/7521172cfad2bf0a3d3e9c53c2cff37c6cf66f39))
* make encounter rate constants config-driven via env ([a3f879f](https://github.com/JonnerPaz/pokeshowdown_bot/commit/a3f879fa2e7306b90b1767e4959be008ba707916))
* migrate to pokenode-ts 2.x and drop axios deps ([28eb2d1](https://github.com/JonnerPaz/pokeshowdown_bot/commit/28eb2d1f9e38c9dfcbea1a5ffb9d066fe28a4c18))
* **pokedex:** implement pokedex vertical slice, fix media limits, and add graceful shutdown ([2e6b126](https://github.com/JonnerPaz/pokeshowdown_bot/commit/2e6b1262a777359cd557432e6b4f03a12972bc35))
* **PokemonConversation:** Complete trade flow ([b1af4bd](https://github.com/JonnerPaz/pokeshowdown_bot/commit/b1af4bd3d808daea74fe1e21cb4cd41f24ee891d))
* **pokemon:** implement interactive /pokemons carousel and harden encounter lifecycle ([4cef1dd](https://github.com/JonnerPaz/pokeshowdown_bot/commit/4cef1dda05ed3aac0faed37241691d47bfb12a09))
* **pokemon:** implement multiplayer group chat encounters and ambient spawns ([2f12b39](https://github.com/JonnerPaz/pokeshowdown_bot/commit/2f12b390f8515d8a162e52bf2d1a539496f5016f))
* **pokemon:** implement PC storage box system and release with pokeball rewards ([a36cacb](https://github.com/JonnerPaz/pokeshowdown_bot/commit/a36cacb12517098f61f28a7cc36a721d65dca1f3))
* **pokemon:** migrate pokemon commands and conversations to pokemon feature composer ([1cfec29](https://github.com/JonnerPaz/pokeshowdown_bot/commit/1cfec29a086481c5e0714edf9ad52a6f79258e96))
* **prisma:** add migration for pokemon isInParty column ([0ffe1e2](https://github.com/JonnerPaz/pokeshowdown_bot/commit/0ffe1e25d51eb53e956b50ef9ea6a6377ccbb4b1))
* **prisma:** Update pokemon schema ([afc537f](https://github.com/JonnerPaz/pokeshowdown_bot/commit/afc537f16a021c39c1206e01bb70888d8091b147))
* **profile:** implement trainer profiles, battle leaderboard, and buddy pokemon ([cab6d51](https://github.com/JonnerPaz/pokeshowdown_bot/commit/cab6d510b8a0c84349de6129d31755a7c9e27d9c))
* Remove unnecessary singleton ([348aa10](https://github.com/JonnerPaz/pokeshowdown_bot/commit/348aa106d71b3ad92ad4b79df48d564e60fdc609))
* Split `ConversationService` into smaller classes ([5d7e977](https://github.com/JonnerPaz/pokeshowdown_bot/commit/5d7e97790bf4d03d10e57a1efecc33074733312b))
* Split `LoginController` into smaller classes ([38bb8eb](https://github.com/JonnerPaz/pokeshowdown_bot/commit/38bb8ebf30a7d897d82f14d875dd3f7d2461bbb1))
* Switch bot arquitecture to use webhook instead of long polling ([3fee2d0](https://github.com/JonnerPaz/pokeshowdown_bot/commit/3fee2d0f6c1054f7a35918670c5e3166c24db3cf))
* **SystemController:** Add spanish commands to output ([f9bff40](https://github.com/JonnerPaz/pokeshowdown_bot/commit/f9bff4032e9ec21075ed021088f5a9aefc4cf46b))
* **system:** migrate system help command to system feature composer ([c346c8e](https://github.com/JonnerPaz/pokeshowdown_bot/commit/c346c8ec41b02fff3db542aa142382167960d766))


### Bug Fixes

* add timeouts to conversation waits to prevent hangs ([9485503](https://github.com/JonnerPaz/pokeshowdown_bot/commit/94855036b9c9a29e49a12e651e37438e84eb0544))
* Add types to pokemons entities ([d76bc57](https://github.com/JonnerPaz/pokeshowdown_bot/commit/d76bc571f324952f478d1eec65bf0e614743d6ba))
* await async controller registration ([afddbfc](https://github.com/JonnerPaz/pokeshowdown_bot/commit/afddbfc63bfa690c653a324640b5525a1b6e5b6e))
* **bot:** initialize bot on startup and sanitize registration flow ([2afae6a](https://github.com/JonnerPaz/pokeshowdown_bot/commit/2afae6a4630837523624106d7aa59214d7da7fd8))
* **ci:** provide DATABASE_URL fallback for prisma client generation in CI ([2ffe736](https://github.com/JonnerPaz/pokeshowdown_bot/commit/2ffe73653e17ac6515abcace35f683e7a92f804d))
* **datasource:** hydrate PokemonEntity instances in UserDataSource ([7de2d4e](https://github.com/JonnerPaz/pokeshowdown_bot/commit/7de2d4ec237a1ba3b6ab262346693e2c70aa26e1))
* eliminate stale-encounter race by using local conversation state ([df3f2b5](https://github.com/JonnerPaz/pokeshowdown_bot/commit/df3f2b5e3b4bb5a795573999f813fe8a54e9ad3e))
* emit single error reply on conversation failures ([8136948](https://github.com/JonnerPaz/pokeshowdown_bot/commit/8136948a192ccaa67837505fb1735127fa8185bf))
* **encounter:** allow duplicate catches when party is full and send photos safely ([b0326a4](https://github.com/JonnerPaz/pokeshowdown_bot/commit/b0326a42e2e7733901fb61b64386ff2c2fc897b6))
* **evolution:** prevent non-evolving pokemon random spawns and deduct evolution cost ([c9d96d8](https://github.com/JonnerPaz/pokeshowdown_bot/commit/c9d96d88bdcd982e6209aebb6279cf9fb88708ef))
* fail fast when webhook setup fails ([a9418b4](https://github.com/JonnerPaz/pokeshowdown_bot/commit/a9418b45a491e451ae23741f1732ecf7ff6dc6df))
* few bugs and changes ([7bf0d6b](https://github.com/JonnerPaz/pokeshowdown_bot/commit/7bf0d6b810c6d745407db446e4e31d2791c509df))
* handle delete only by the user who request it ([3ec71e6](https://github.com/JonnerPaz/pokeshowdown_bot/commit/3ec71e6d4c38aed5970d1d735d3dc72fc81cf9fd))
* handle register only by the user who request it ([e842577](https://github.com/JonnerPaz/pokeshowdown_bot/commit/e8425775064e8672df544013c4da504840417971))
* **pokeapi:** resolve builder concurrency and sprite null fallbacks ([39b85cf](https://github.com/JonnerPaz/pokeshowdown_bot/commit/39b85cf381d97e559715fb27e8cd8023e97a32f2))
* **pokemon:** resolve markdown entity parse error on usernames with underscores ([0ff58f5](https://github.com/JonnerPaz/pokeshowdown_bot/commit/0ff58f5a71b12d8e68a014ce7c0bde320083578f))
* register webhook with secret_token ([f62be97](https://github.com/JonnerPaz/pokeshowdown_bot/commit/f62be9717471d9cc58bd0e8658f2495aef5802e2))
* Replace throw error with an early return ([a233fa7](https://github.com/JonnerPaz/pokeshowdown_bot/commit/a233fa7cc603b83b16a0cb47bd144fdec0f77f60))
* **schema:** migrate telegramId from Int to BigInt to support modern IDs ([a98639a](https://github.com/JonnerPaz/pokeshowdown_bot/commit/a98639a58a5ce61ee03327d538e743b760480761))
* scope pokemon encounters by user id to prevent race conditions ([0407078](https://github.com/JonnerPaz/pokeshowdown_bot/commit/0407078eac173e5c77d3e139e0f192e5a8b04777))
* scope trade-accept callbacks to the trading chat ([606931c](https://github.com/JonnerPaz/pokeshowdown_bot/commit/606931c8be56ebfe55274e27802b49250b6cbb24))
* Send message when pokemon cannot evolve anymore ([6ec3ec2](https://github.com/JonnerPaz/pokeshowdown_bot/commit/6ec3ec2292271e354f6cdff212db7cb68185ea18))
* Send pokemon photos where it were requested, not private chat ([646a33c](https://github.com/JonnerPaz/pokeshowdown_bot/commit/646a33c94383c70bd89d0e669328f998f87dba4e))
* stops only generating charmeleon in favor of random pokemons ([d017076](https://github.com/JonnerPaz/pokeshowdown_bot/commit/d017076fc8b13e14124f3f6c3acd4665e46fa577))
* tie encounters and user lookups to telegramId ([909d393](https://github.com/JonnerPaz/pokeshowdown_bot/commit/909d393fd9c4d267fb7985449fc58be59ba0abbf))
* **trade:** validate self-trade with telegramId and sanitize nickname input ([19d3830](https://github.com/JonnerPaz/pokeshowdown_bot/commit/19d38309bef123baa13d718e135c3310c7b615eb))
* typos in conversation enter callbacks ([5804423](https://github.com/JonnerPaz/pokeshowdown_bot/commit/58044231804aa06f9756b912abccb885ff0fe216))
* validate username before DB lookup in register ([bdce1b7](https://github.com/JonnerPaz/pokeshowdown_bot/commit/bdce1b7f07bf043645185ae598f2769c4f9653bd))
* **webhook:** sanitize markdown entities and add root error boundary to prevent webhook deadlocks ([61f8f51](https://github.com/JonnerPaz/pokeshowdown_bot/commit/61f8f51e5f03e44441a6d804a53fc9bdc8f2c3e2))

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
