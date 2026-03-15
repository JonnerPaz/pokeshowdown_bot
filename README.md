# PokeBotShowdown - A telegram bot to catch and trade pokemon with your friends!

## 🌟 Inspiration

I played long ago pokemon showdown and I find fun to build this bot now that I know one thing or two about programming. Besides, telegram is the chat app that I use the most. 

I want to build fun stuff and that's it.

## 🚀 How to run it locally

> [!WARNING]
> This file mentions some configurations that, in case you decide to run your own instance of this bot, you CAN'T share with anyone, including your bot token, the database password, nor any data that goes inside the .env file.
> For security purposes, keep this to yourself.

### Prerequisites

- **Node.js** v22+
- **pnpm** (Package manager)
- **Docker** (For local PostgreSQL database)

### Installation & Setup

1. **Clone the repository**

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment**
   - Copy `env-sample.env` to `.env`.
   - Fill in your `API_KEY` (from @BotFather).
   - The default database settings in `env-sample.env` work out-of-the-box with the provided Docker setup.

4. **Start the Database**
   Start the PostgreSQL container in the background:
   ```bash
   docker compose up -d
   ```

5. **Initialize Database Schema**
   Generate the Prisma client and run migrations to create the database tables:
   ```bash
   pnpm run prisma:generate
   pnpm run prisma:migrate
   ```

6. **Run the Bot**
   - **Development (Watch Mode):**
     ```bash
     pnpm dev
     ```
   - **Production (Single Run):**
     ```bash
     pnpm start
     ```

> **Note:** To test webhooks locally, you'll need a tunneling service like [localhost.run](https://localhost.run/) or ngrok to expose your local port.

## 👤 Core Commands

- `/register` - Register a user into the bot.
- `/pokemongenerate` - Generate random pokemons.
- `/pokemonsummary` - Shows a brief summary of your captured pokemons.
- `/evolve` - Evolve your pokemon once it reaches certain criteria.
- `/delete_account` - Delete your user and all data from the bot.
- `/help` - Show all available commands.

All commands are case sensitive and must start with `/`.
