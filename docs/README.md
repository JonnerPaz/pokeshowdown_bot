# PokeBotShowdown Documentation

PokeBotShowdown is a Telegram bot and Telegram Mini App for catching, evolving,
trading, and battling Pokémon.

Start with the guide that matches your goal:

| Guide                                     | Use it when you want to…                                             |
| :---------------------------------------- | :------------------------------------------------------------------- |
| [Architecture](architecture.md)           | Understand how the bot, web API, services, and database fit together |
| [Local development](local-development.md) | Run the bot and Mini App on your machine                             |
| [Gameplay](gameplay.md)                   | Learn the game systems and player-facing mechanics                   |
| [Commands](commands.md)                   | Look up a bot command in English or Spanish                          |
| [Mini App Arena](mini-app-arena.md)       | Play, integrate with, or debug the web battle experience             |
| [Testing](testing.md)                     | Run or extend the test suite                                         |
| [Operations](operations.md)               | Configure runtime modes, environment variables, health, and shutdown |
| [Deployment](deployment.md)               | Deploy the application safely                                        |
| [Contributing](../CONTRIBUTING.md)        | Follow the project workflow and quality gates                        |

## Quick links

- [Project README](../README.md)
- [Environment sample](../env-sample.env)
- [Prisma schema](../prisma/schema.prisma)
- [Architecture source: `src/`](../src)
- [Tests: `tests/`](../tests)

## Documentation conventions

- Commands, paths, and environment variables are written in `code` style.
- Examples use placeholder values such as `https://arena.example.com`; never
  commit real bot tokens, database URLs, tunnel tokens, or hostnames.
- The Arena is an in-memory feature. Run a single process while using it.
