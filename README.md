# ⚡ PokeBotShowdown

<div align="center">

[![CI](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/ci.yml/badge.svg)](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/ci.yml)
[![Release Please](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/release-please.yml/badge.svg)](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/release-please.yml)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-339933?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-ESM-3178C6?logo=typescript&logoColor=white)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**A competitive, feature-complete Pokémon experience directly inside Telegram.**

Catch, evolve, trade, battle fellow trainers and more!

[Features](#-features--gameplay) • [Operational Modes](#-operational-modes) • [Quickstart](#-quickstart) • [Dokploy Deployment](#-deploying-on-dokploy) • [Commands](#-bot-commands) • [Tech Stack](#-tech-stack)

</div>

---

## 🌟 Features & Gameplay

PokeBotShowdown brings the depth of authentic Pokémon mechanics into solo chats
and bustling Telegram groups.

### Turn-Based PvP Battle Engine

- **Authentic Combat Formulas**: Damage calculated using base stats, levels, and
  a complete Gen 1–9 elemental type effectiveness matrix
  (super effective, resisted, immunities).

- **Interactive Battlefield**: Dynamic Telegram inline keyboards with live HP
  bars, active turn prompts, and surrender options.

- **Fair Play & Draw Resolution**: 10-turn strategic cap with tie-break draw
  handling to prevent stalling, plus automatic battle records (wins/losses)
  logged to user profiles.

### Spontaneous Group Chat Encounters

- **Activity-Driven Spawns**: Wild Pokémon appear spontaneously in group chats
  based on conversation message thresholds, safeguarded by burst anti-spam protection.

- **Multiplayer Catch Races**: Multiple group members can throw balls
  simultaneously. Handled with synchronous atomic reservation mutexes to eliminate
  race conditions.

- **Authentic Mechanics**: Wild Pokémon can be spooked, break free from balls,
  or flee if too many attempts fail.

### Pokéball Tiers & Bag Inventory

- **4 Authentic Ball Tiers**:
  - 🔴 **Pokéball** (1.0x catch rate)
  - 🔵 **Great Ball** (1.5x catch rate)
  - ⚫ **Ultra Ball** (2.0x catch rate)
  - 🟣 **Master Ball** (100% guaranteed catch rate)
- **Live Bag Inspection**: View your inventory anytime with `/bag`.
- **Daily Rewards & Streaks**: Claim free supplies with `/daily`—consecutive
  daily logins grant progressive streak bonuses.

### PC Storage Box & Party Management

- **Active 6-Member Party**: Your top 6 Pokémon form your active battle and
  showcase party.

- **Automatic Overflow Routing**: Any Pokémon caught beyond 6 are automatically
  routed to your PC Storage Box (`/box`).

- **Full Box Operations**: Browse, Withdraw, Deposit, and Swap Pokémon seamlessly
  between your active team and PC storage.

- **Release for Rewards**: Release duplicate Pokémon with `/release` to earn
  Professor Oak rewards
  (+3 Pokéballs standard; +5 Pokéballs & +1 Great Ball for shinies). Built-in
  guards prevent releasing your last remaining Pokémon.

### 🎠 Interactive Pokémon Carousel & Detailed Stats

- **Paged Card Viewer (`/pokemons`)**: Interactive inline carousel showing
  Pokémon sprites, derived battle levels, dual types, abilities, and evolution
  progress.

- **Detailed Stat Inspector (`/pokemonsummary`)**: Comprehensive breakdown of
  individual stats—HP, Attack, Defense, Special Attack, Special Defense, Speed,
  Base Stat Total (BST), and custom nicknames.

### 📖 National Pokédex Encyclopedia

- **All 1025 Pokémon Supported**: Look up any Pokémon across Generations 1
  through 9 with `/pokedex <name|id>`.

- **Lore & Stats**: High-resolution artwork, official Pokédex lore flavor text,
  elemental badges, and clamped visual base stat bars.

- **Bag Ownership Indicator**: Automatically displays whether you already own
  the searched species in your collection.

### 💬 Telegram Inline Mode

Query the bot from **any** chat, private conversation, or channel without adding it by typing `@bot_username`:

- `@bot <pokemon>`: Instant Pokédex preview card with artwork, types, and stats.
- `@bot buddy`: Showcase your companion buddy Pokémon, battle rank, and win rate.
- `@bot team`: Share your active 6-member battle team party into any conversation.

### 🏆 Trainer Profiles & Leaderboard

- **Trainer Card (`/profile`)**: Displays trainer rank titles, total wins,
  losses, win rate percentage, collection counts, and active companion buddy sprite.

- **Global Leaderboard (`/leaderboard`)**: Real-time top 10 rankings with
  podium medals (🥇, 🥈, 🥉) and the caller's current rank position.

- **Buddy System (`/buddy`)**: Choose your favorite companion Pokémon to
  accompany your profile and inline cards.

### 🤝 Trading & Evolution

- **Safe 2-Way Trading**: Player-to-player trade proposals with secure,
  namespaced inline confirmation buttons.

- **Evolution System**: Evolve your Pokémon when they reach catch thresholds.
  The system preserves companion buddy assignments and merges duplicates cleanly.

---

## ⚙️ Operational Modes

PokeBotShowdown is engineered with a **Dual-Mode** runtime, ensuring seamless
operation regardless of your hosting environment:

### 1. Long Polling Mode (`BOT_MODE="polling"`) — _Recommended_

- **Zero Inbound Ports / Tunnels**: The bot makes outbound HTTPS requests to
  Telegram (`api.telegram.org:443`). No port forwarding, public IP, domain, or
  SSL certificate required.

- **Dynamic IP & Power Outage Resilient**: If your home server reboots after a
  power outage or your internet provider rotates your public IP, the bot
  automatically reconnects in seconds.

- **Healthcheck Endpoint**: Automatically serves `GET /health` on `PORT`
  (default: 5000) for container health monitoring (Dokploy, Docker, Uptime Kuma).

- **Queue Protection**: Supports `DROP_PENDING_UPDATES="true"` to prevent
  processing a backlog of stale messages after a server restart.

### 2. Webhook Mode (`BOT_MODE="webhook"`)

- Designed for cloud production environments with a static IP and public domain.

- Securely validates incoming Telegram HTTP POST updates using `WEBHOOK_SECRET`.

- Can be paired with a reverse proxy (Caddy, Nginx, Traefik) or tunneling
  solutions (such as Cloudflare Tunnel) if inbound routing is desired.

---

## 🚀 Quickstart

### Prerequisites

- **Node.js**: 22+ (TypeScript ESM)
- **pnpm**: 10.x (`corepack enable pnpm`)
- **Docker & Docker Compose**: for PostgreSQL
- **Telegram Bot Token**: from [@BotFather](https://t.me/botfather)

### Option A: Local Development

```bash
# 1. Clone repository and install dependencies
git clone https://github.com/JonnerPaz/pokeshowdown_bot.git
cd pokeshowdown_bot
pnpm install

# 2. Configure environment variables
cp env-sample.env .env
# Edit .env and set your API_KEY and DATABASE_URL

# 3. Start local PostgreSQL
docker compose up -d db

# 4. Generate Prisma client & apply database migrations
pnpm run prisma:generate
pnpm run prisma:deploy

# 5. Start bot in development mode (hot-reload)
pnpm dev
```

### Option B: High-Speed Production Run

The project includes an ultra-fast build pipeline powered by `esbuild`:

```bash
# Compile TypeScript to an optimized ESM bundle in ~20ms
pnpm run build

# Start production server (pure V8 execution, minimal RAM)
pnpm start
```

---

## 🐳 Deploying on Dokploy

PokeBotShowdown provides a preconfigured, production-ready stack in `compose.yaml` (also mirrored in `compose.dokploy.yaml`). It sets up PostgreSQL 18 with persistent storage and runs the bot in Long Polling mode—requiring zero open ports on your router:

1. **Create Compose Service in Dokploy**:
   - In Dokploy, go to **Projects** → select your project → **Create Service** → **Compose**.
   - Keep default **Compose Path** (`compose.yaml` or `compose.dokploy.yaml`).
   - Keep **Compose Type** on **Docker Compose**. The **Stack** type does not support
     `build`, so the bot image could not be built from this file.
2. **Configure Environment Variables**:

   In Dokploy's **Environment** tab, set:

   ```env
   API_KEY="your_telegram_bot_token"
   BOT_MODE="polling"
   DROP_PENDING_UPDATES="true"
   POSTGRES_USER="postgres"
   POSTGRES_PASSWORD="your_secure_password"
   POSTGRES_DB="pokemons"
   ```

   Optional overrides:

   | Variable          | Default            | Purpose                                                                                         |
   | :---------------- | :----------------- | :---------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`    | `postgresql://...` | Full connection string. Useful when targeting an external or Dokploy-managed database directly. |
   | `DB_HOST`         | `db`               | Hostname of the database. Change it when using an external Dokploy database.                    |
   | `DB_PORT`         | `5432`             | Port of the database.                                                                           |
   | `DB_MAX_ATTEMPTS` | `40`               | How many times the entrypoint retries `prisma migrate deploy` before giving up.                 |
   | `PORT`            | `5000`             | Port used by the internal `/health` endpoint.                                                   |

3. **Deploy**:
   - Click **Deploy**. Dokploy will spin up PostgreSQL, run Prisma schema
     migrations automatically, and start the bot in polling mode with internal
     health checks on `/health`.

> ℹ️ **Environment variables are not injected into containers automatically.**
> Dokploy writes them to a `.env` file next to the compose file and only reaches
> your services through the `${VAR}` references in `compose.yaml`. Keep
> those references in place (or add `env_file: .env`) if you edit the file.

### Troubleshooting: the bot cannot reach the database

The container entrypoint (`docker-entrypoint.sh`) already waits for PostgreSQL
and retries the migrations, so a slow boot is not the problem. If the logs show
`P1001: Can't reach database server at db:5432` for more than a minute, the two
containers are not on the same Docker network. Common causes and fixes:

| Symptom                                                      | Cause                                                                                                                          | Fix                                                                                                                                                                                                                                                                   |
| :----------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getent hosts db` prints nothing inside the bot container    | The database service is missing, isolated, or belongs to another Docker Compose project.                                       | Deploy the whole stack from `compose.dokploy.yaml` as a **single** Compose service so both containers share a project network.                                                                                                                                        |
| `Waiting for db:5432: EHOSTUNREACH` on Fedora / RHEL hosts   | `firewalld` + `br_netfilter` rejects container-to-container packets on Linux `bridge` interfaces with `ICMP admin-prohibited`. | Keep `pokebot-net` configured with `driver: overlay` and `attachable: true` (default in `compose.yaml` / `compose.dokploy.yaml`) so traffic runs inside Docker Swarm's isolated network namespace, or add Docker's bridge interfaces to `firewalld`'s `trusted` zone. |
| The database is a **Dokploy Database** (created separately)  | A standalone database lives on its own network and is not reachable as `db`.                                                   | Attach the bot to that database's network and set `DB_HOST` to its real container name (see Dokploy → Docker).                                                                                                                                                        |
| The database container shows a legacy Postgres major version | An older `postgres_data` volume is being reused.                                                                               | Recreate the volume (see [Recreating the bundled database](#recreating-the-bundled-database)); PostgreSQL refuses to start on a data directory from another major.                                                                                                    |
| Everything resolves but connections hang behind Docker Swarm | The host kernel lacks the IPVS modules used by Swarm's VIP load balancing.                                                     | Switch Dokploy's endpoints to DNSRR mode, or use the `tasks.<service>` hostname as `DB_HOST`.                                                                                                                                                                         |

Handy diagnostic commands (replace `<bot>`/`<db>` with the container names
shown in Dokploy → Docker):

```bash
docker ps --format '{{.Names}}\t{{.Image}}'
docker inspect <bot> --format '{{json .NetworkSettings.Networks}}'
docker inspect <db>  --format '{{json .NetworkSettings.Networks}}'
docker exec <bot> getent hosts db
```

### Recreating the bundled database

The named volume `postgres_data` is tied to a PostgreSQL major version: version
18 changed the on-disk layout to `/var/lib/postgresql/<major>/docker`, while
previous majors stored the cluster directly at `/var/lib/postgresql/data`. When a
volume initialised by an older major is mounted at `/var/lib/postgresql`, the
container exits with `there appears to be PostgreSQL data in: /var/lib/postgresql`
and restarts in a loop.

The bundled database holds no data until migrations run, so the fix is to
recreate the volume:

```bash
# 1. Identify the volume and confirm which major initialised it
docker volume ls | grep -i postgres      # → <appName>_postgres_data
docker run --rm -v <appName>_postgres_data:/v alpine sh -c 'cat /v/PG_VERSION'

# 2. Stop the Compose service in Dokploy (a restarting container keeps the volume in use)

# 3. Remove the stale volume
docker volume rm <appName>_postgres_data
```

Redeploy afterwards: Docker recreates the volume and the container runs `initdb`
with the current PostgreSQL version. To keep the existing cluster instead, pin
`postgres:17-alpine` and mount the volume back at `/var/lib/postgresql/data`.

---

## 📋 Bot Commands

All commands are case sensitive and must start with `/`.

### ⚔️ Battle & PvP

| Command   | Spanish Alias | Description                                          |
| :-------- | :------------ | :--------------------------------------------------- |
| `/battle` | `/batalla`    | Challenge another trainer to a turn-based PvP battle |

### 🌲 Wild Encounters & Catching

| Command             | Spanish Alias      | Description                                                             |
| :------------------ | :----------------- | :---------------------------------------------------------------------- |
| `/generate_pokemon` | `/generar_pokemon` | Spawn a wild Pokémon encounter                                          |
| `/bag`              | `/mochila`         | View inventory of Pokéballs, Great Balls, Ultra Balls, and Master Balls |
| `/daily`            | `/diario`          | Claim daily Pokéball supplies and streak bonuses                        |

### 📦 Party, PC Box & Collection

| Command           | Spanish Alias      | Description                                                |
| :---------------- | :----------------- | :--------------------------------------------------------- |
| `/pokemons`       | `/pokemons`        | Interactive carousel of your active 6-member party         |
| `/pokemonsummary` | `/resumen_pokemon` | View detailed base stats, BST, and nicknames               |
| `/box`            | `/caja`            | Browse PC Storage Box, withdraw, deposit, and swap Pokémon |
| `/release`        | `/liberar`         | Release Pokémon for Professor Oak Pokéball rewards         |
| `/evolve`         | `/evolucionar`     | Evolve an owned Pokémon when catch threshold is met        |
| `/shiny`          | `/brillante`       | Convert a qualified Pokémon into its shiny form            |
| `/nickname`       | `/nickname`        | Set a custom nickname for your Pokémon                     |

### 🤝 Social & Information

| Command        | Spanish Alias   | Description                                                    |
| :------------- | :-------------- | :------------------------------------------------------------- |
| `/trade`       | `/intercambiar` | Propose a secure trade with another trainer in group chat      |
| `/pokedex`     | `/pokedex`      | Look up any Pokémon (Gen 1–9) with lore and stat bars          |
| `/profile`     | `/perfil`       | View your Trainer Card, win/loss record, rank title, and buddy |
| `/leaderboard` | `/ranking`      | Global top 10 trainer rankings                                 |
| `/buddy`       | `/companero`    | Set your favorite Pokémon companion                            |

### ⚙️ Account & Setup

| Command           | Spanish Alias    | Description                                              |
| :---------------- | :--------------- | :------------------------------------------------------- |
| `/start`          | `/comenzar`      | Initialize the bot and welcome screen                    |
| `/register`       | `/registrarse`   | Register your trainer account and pick a starter Pokémon |
| `/delete_account` | `/borrar_cuenta` | Delete account and all associated Pokémon data           |
| `/help`           | `/ayuda`         | Display command list and instructions                    |

---

## 🧪 Testing

The repository features comprehensive unit and integration test suites powered by [Vitest](https://vitest.dev/):

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm vitest

# Run TypeScript typechecking
pnpm run typecheck

# Run linter & formatter checks
pnpm lint
pnpm format:check
```

Integration tests utilize an in-memory repository harness and grammY's `ApiClientOptions.fetch` to intercept Bot API calls with zero network latency and no live Telegram connection required.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 22+ (Strict ESM, `moduleResolution: nodenext`)
- **Bot Framework**: [grammY](https://grammy.dev/) (`@grammyjs/commands`, `@grammyjs/conversations`, `@grammyjs/auto-retry`)
- **Database & ORM**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Build Engine**: [esbuild](https://esbuild.github.io/) (~20ms bundle times)
- **HTTP Server**: Express 5 (Health checks and optional Webhook adapter)
- **External API**: [pokenode-ts](https://github.com/Gabb-c/pokenode-ts) with in-memory caching
- **Testing**: [Vitest](https://vitest.dev/) with native ESM execution

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Special thanks

This project relies heavily on [pokenode-ts](https://github.com/Gabb-c/pokenode-ts)
to get access to the PokeAPI. So from here, I want to give a special thanks to
[Gabb-c](https://github.com/Gabb-c) for creating and maintaining this library,
and the PokeAPI team for maintaining and providing the data. Also, thanks to
the [Grammy team](https://grammy.dev/) for bringing joy to building telegram bots.
