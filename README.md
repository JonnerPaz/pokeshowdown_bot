<div align="center">
 <h1>PokeBotShowdown</h1>

[![CI](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/ci.yml/badge.svg)](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/ci.yml)
[![Release Please](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/release-please.yml/badge.svg)](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/release-please.yml)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.12.0-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-ESM-3178C6?logo=typescript&logoColor=white)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**A competitive Pokémon experience inside Telegram.**

Catch, evolve, trade, and battle other trainers without leaving the chat.

</div>

---

## Table of contents

- [What you can do](#what-you-can-do)
- [Quickstart](#quickstart)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)

## What you can do

- **Catch and collect** wild Pokémon in private chats or in spontaneous group
  encounters, with authentic ball tiers and catch mechanics.
- **Battle in the Mini App Arena** with visual sprites, live HP, turn deadlines,
  battle logs, automatic rankings, and group result announcements.
- **Build your team** with a six-member party, PC Storage Box, withdrawals,
  deposits, swaps, and release rewards.
- **Complete the Pokédex** with all 1025 species, lore, artwork, and stat
  breakdowns.
- **Climb the leaderboard** through trainer profiles, win rates, rank titles, and
  a global top 10.
- **Trade, evolve, and customize** Pokémon with secure trades, evolution chains,
  shiny forms, and nicknames.
- **Play together** in group chats with shared spawns and multiplayer catching.
- **Share anywhere** with inline Pokédex cards, buddy showcases, and team cards.

## Quickstart

**Requirements:**

- Node.js 22.12+
- pnpm 10
- Docker
- Telegram bot token from [@BotFather](https://t.me/botfather).

for a local development setup, you only need to use this commands on a terminal:

```bash
corepack enable pnpm
pnpm install
cp env-sample.env .env
# Edit .env: set API_KEY and DATABASE_URL.

docker compose -f compose.dev.yaml up -d db
pnpm prisma:generate
pnpm prisma:deploy
pnpm dev
```

`pnpm dev` starts the bot and the Vite Mini App watcher. The web layer is
optional: set `WEBAPP_URL` to a public HTTPS origin to enable the Arena. See
[Local development](docs/local-development.md) for the full setup, including the
optional HTTPS setup and troubleshooting.

> [!IMPORTANT]
> **Arena state lives in memory.** Run one replica while using the Arena; a
> restart or deploy drops active rooms.

## Documentation

| Guide                                          | What it covers                                                    |
| :--------------------------------------------- | :---------------------------------------------------------------- |
| [Architecture](docs/architecture.md)           | Layers, runtime flow, services, data model, and Arena internals   |
| [Local development](docs/local-development.md) | Environment, database, dev server, Mini App, and troubleshooting  |
| [Gameplay](docs/gameplay.md)                   | Encounters, catching, party/box, progression, and social features |
| [Commands](docs/commands.md)                   | Every bot command in English and Spanish                          |
| [Mini App Arena](docs/mini-app-arena.md)       | Rules, REST API, SSE, authentication, and limits                  |
| [Testing](docs/testing.md)                     | Vitest suites, harness, CI gates, and test-writing guidance       |
| [Operations](docs/operations.md)               | Runtime modes, environment variables, health, and shutdown        |
| [Deployment](docs/deployment.md)               | Provider-neutral production deployment guidance                   |
| [Contributing](CONTRIBUTING.md)                | Workflow, commit conventions, and quality gates                   |

## Tech stack

- **Runtime:** Node.js 22.12+ with strict ESM and TypeScript.
- **Bot framework:** [grammY](https://grammy.dev/) with commands, conversations,
  and auto-retry.
- **Database:** PostgreSQL with [Prisma](https://www.prisma.io/).
- **Web:** Express 5, Vite, and native `EventSource`.
- **External data:** [pokenode-ts](https://github.com/Gabb-c/pokenode-ts) with
  in-memory caching.
- **Testing:** [Vitest](https://vitest.dev/) with in-memory datasources and a
  mocked Bot API.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the
branching model, commit conventions, architecture guidelines, and required
checks.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Acknowledgements

This project relies heavily on
[pokenode-ts](https://github.com/Gabb-c/pokenode-ts) for access to PokéAPI.
Thanks to [Gabb-c](https://github.com/Gabb-c) for creating and maintaining the
library, the PokéAPI team for the data, and the
[Grammy team](https://grammy.dev/) for making Telegram bots enjoyable to build.
