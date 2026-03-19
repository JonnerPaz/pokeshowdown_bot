# PokeBotShowdown

A Telegram bot to catch, evolve, and trade Pokemon with your friends.

## What it does

- Register users and let them choose a starter Pokemon.
- Spawn wild Pokemon and catch them.
- Show your current Pokemon collection.
- Evolve Pokemon.
- Start player-to-player trade flows.
- Delete account and related data.

## Requirements

- Telegram account (to create a bot with [@BotFather](https://t.me/botfather))
- Node.js 22+
- pnpm 
- Docker (recommended for local Postgres)

## Local setup

1. Install dependencies:

```bash
pnpm install
```

2. Create your environment file:

```bash
cp env-sample.env .env
```

3. Fill `.env` with the following values:

- `API_KEY`: Telegram bot token from BotFather
- `PORT`: Express server port (default sample: `5000`)
- `POSTGRES_USER`: Postgres user
- `POSTGRES_PASSWORD`: Postgres password
- `POSTGRES_DB`: Postgres database name
- `DATABASE_URL`: Prisma connection string

> [!NOTE] 
> A .env example has been provided at env-sample.env.
> It's default values are suitable for local development.

4. Start Postgres:

```bash
docker compose up -d
```

5. Generate Prisma client and apply migrations:

```bash
pnpm run prisma:generate
pnpm run prisma:migrate
```

6. Run in development mode:

```bash
pnpm dev
```

## Bot commands

All commands are case sensitive and must start with `/`.

### English

- `/start`: starts the bot
- `/register`: register a user into the bot
- `/delete_account`: delete your account and related data
- `/help`: show all commands
- `/generate_pokemon`: generate a random Pokemon encounter
- `/pokemons`: show your Pokemon collection
- `/evolve`: evolve one of your Pokemon
- `/trade`: trade Pokemon with another user

### Spanish aliases

- `/comenzar`: start
- `/registrarse`: register
- `/borrar_cuenta`: delete account
- `/ayuda`: help
- `/generar_pokemon`: generate Pokemon
- `/pokemons`: show your Pokemon
- `/evolucionar`: evolve
- `/intercambiar`: trade

## Webhook note for local development

This app currently uses Express + Telegram webhook middleware (not long polling). That means Telegram must be able to reach your local server over HTTPS.

Typical local flow:

1. Expose your local app (`PORT`) using a tunnel service (for example, [Pinggy](https://pinggy.io/) or [ngrok](https://ngrok.com/)).
2. Set Telegram webhook to your public HTTPS URL. You can use [grammyjs webhook manager](https://telegram.tools/webhook-manager)
3. Keep `pnpm dev` running while testing commands in Telegram.

If updates are not arriving, verify your webhook URL and that the tunnel is still active.

## Stack

- TypeScript (ESM)
- grammY (`@grammyjs/commands`, `@grammyjs/conversations`)
- Prisma + PostgreSQL
- Express
- pokenode-ts + axios

## Project layout

- `src/domain`: entities, datasource contracts, constants
- `src/infrastructure`: datasource implementations (Prisma-backed)
- `src/presentation`: bot setup, controllers, conversations, services, server
- `prisma`: Prisma schema and migrations
- `generated/prisma`: generated Prisma client
