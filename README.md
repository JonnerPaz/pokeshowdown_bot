# PokeBotShowdown

[![CI](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/ci.yml/badge.svg)](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/ci.yml)
[![Release Please](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/release-please.yml/badge.svg)](https://github.com/JonnerPaz/pokeshowdown_bot/actions/workflows/release-please.yml)
![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)
![pnpm](https://img.shields.io/badge/pnpm-10.x-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-ESM-blue)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
![License](https://img.shields.io/badge/license-MIT-blue)

A Telegram bot to catch, evolve, and trade Pokemon with your friends.

## What it does

- Register users and choose a starter Pokemon.
- Spawn wild Pokemon encounters and catch them (solo or spontaneous multiplayer group chat encounters).
- View and manage your Pokemon collection.
- Evolve Pokemon and set companion buddy Pokemon.
- Player-to-player Pokemon trading and turn-based PvP battles with rank leaderboards.
- Inventory system with Pokeball tiers, daily rewards, and Pokedex encyclopedia.
- Telegram Inline Mode (`@pokeshowdown_bot <pokemon|buddy|team>`) to showcase stats anywhere.
- Delete account and related user data.

---

## Architecture & Operational Modes

PokeBotShowdown supports **Dual-Mode** operation via grammY and Express (`src/presentation/server.ts`):

### 1. Long Polling Mode (`BOT_MODE="polling"`) — Recommended for Dokploy, Homelabs & Dynamic IP

- The bot establishes an outbound connection to Telegram (`api.telegram.org:443`).
- **Zero Inbound Ports / Tunnels**: Completely eliminates the need for Cloudflare Tunnels, reverse proxies, public domains, or SSL certificates.
- **Dynamic IP & Power Outage Resilient**: When your internet provider changes your public IP or when your server reboots after a power outage, the bot automatically reconnects without any manual intervention.
- An internal Express server serves `GET /health` on `PORT` for Docker/Dokploy healthchecks.

### 2. Webhook Mode (`BOT_MODE="webhook"`) — For Cloud Environments with Static IP / Domains

- Telegram sends inbound HTTP `POST` requests to `WEBHOOK_URL` secured with `WEBHOOK_SECRET`.
- Requires an accessible public HTTPS endpoint with a valid SSL/TLS certificate (or a tunnel like `cloudflared` for local development).

```mermaid
flowchart TD
    subgraph Polling ["Long Polling Mode (Dokploy / Dynamic IP)"]
        D1["Dokploy / Server<br/>(ShowdownBot Container)"] -- "Outbound HTTPS (443)" --> TG1["Telegram API Server"]
        TG1 -- "getUpdates Stream" --> D1
    end

    subgraph Webhook ["Webhook Mode (Cloud / Static IP)"]
        TG2["Telegram API Server"] -- "HTTPS POST (Webhook)" --> CF["Reverse Proxy / Tunnel"]
        CF --> D2["Express Server (:5000)"]
    end
```

---

## Requirements

Before starting, ensure you have the following installed on your machine:

- **Node.js**: 22+ (CI uses Node 26)
- **pnpm**: 10.x (`corepack enable pnpm`)
- **Docker & Docker Compose**: for running PostgreSQL (and optional containerized bot)
- **Telegram Bot Token**: from [@BotFather](https://t.me/botfather)
- **Cloudflare Tunnel (`cloudflared`)**: for exposing your local development server to Telegram

---

## Installing `cloudflared` (From Scratch)

If you are setting up a fresh development machine and do not have `cloudflared` installed:

### Linux

- **Debian / Ubuntu / Pop!\_OS / Linux Mint**:

  ```bash
  curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  sudo dpkg -i cloudflared.deb && rm cloudflared.deb
  ```

- **Fedora / RHEL / Rocky Linux**:

  ```bash
  sudo dnf install -y https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
  ```

- **Arch Linux / Manjaro**:
  ```bash
  sudo pacman -S cloudflared
  ```

### macOS

Using [Homebrew](https://brew.sh):

```bash
brew install cloudflare/cloudflare/cloudflared
```

### Windows

Using Windows Package Manager (PowerShell as Administrator):

```powershell
winget install --id Cloudflare.cloudflared
```

_Or using Chocolatey:_

```powershell
choco install cloudflared
```

### Verify Installation

```bash
cloudflared --version
```

---

## Local Setup (Step-by-Step)

Follow these steps in chronological order:

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd pokeshowdown_bot
pnpm install
```

### 2. Prepare Environment File

Copy the template environment file:

```bash
cp env-sample.env .env
```

Open `.env` and fill in:

- `API_KEY`: Your Telegram Bot API token obtained from [@BotFather](https://t.me/botfather).
- `WEBHOOK_SECRET`: A random secret token (1-256 characters) used to verify that incoming webhook requests genuinely originate from Telegram. You can generate one via:
  ```bash
  openssl rand -hex 32
  ```

Leave `WEBHOOK_URL` empty for now; you will obtain it in the next step.

### 3. Start the Cloudflare Tunnel

Open a dedicated terminal window (keep it running throughout your development session):

```bash
pnpm tunnel
# or: cloudflared tunnel --url http://localhost:5000
```

> [!NOTE]
> This command starts a **Cloudflare Quick Tunnel** (TryCloudflare). It requires **no Cloudflare account**, no login, and no custom domain.
>
> In the console output, look for a line containing your public HTTPS tunnel URL:
>
> ```text
> +--------------------------------------------------------------------------------------------+
> |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
> |  https://orange-apples-random-words.trycloudflare.com                                      |
> +--------------------------------------------------------------------------------------------+
> ```

### 4. Set `WEBHOOK_URL` in `.env`

Copy the HTTPS URL output by `cloudflared` into `.env`:

```env
WEBHOOK_URL="https://orange-apples-random-words.trycloudflare.com"
```

---

### 5. Start the Application

Choose **one** of the two workflows below:

#### Workflow A: Host Development (Recommended)

In this workflow, PostgreSQL runs in a lightweight Docker container while the bot runs directly on your host machine with instant TypeScript hot-reloading (`tsx watch`).

1. **Start PostgreSQL in Docker**:
   ```bash
   docker compose up -d db
   ```
2. **Generate Prisma Client & Apply Migrations**:
   ```bash
   pnpm run prisma:generate
   pnpm run prisma:migrate
   ```
3. **Run the Bot in Development Mode**:
   ```bash
   pnpm dev
   ```

You will see:

```text
COMMANDS REGISTERED
Server running on port 5000
```

#### Workflow B: Full Docker Development

In this workflow, both PostgreSQL and the bot run in Docker containers.

```bash
docker compose up -d
```

This starts the `db` and `dev` containers, generates the Prisma client, runs migrations, and boots the bot on port `5000`.

> [!IMPORTANT]
> If your Cloudflare Tunnel restarts and issues a new URL, you must update `WEBHOOK_URL` in `.env` and recreate the container:
>
> ```bash
> docker compose up -d --force-recreate dev
> ```
>
> (`docker compose restart` does **not** reload `.env` values in existing containers).

---

## Verifying the Webhook

To confirm that Telegram successfully registered your webhook URL:

```bash
curl -s "https://api.telegram.org/bot<YOUR_API_KEY>/getWebhookInfo"
```

Expected JSON response:

```json
{
  "ok": true,
  "result": {
    "url": "https://orange-apples-random-words.trycloudflare.com",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

Now open Telegram, search for your bot, and send `/start`.

---

## Alternative Tunneling Tools

While `cloudflared` is the primary and recommended tool, you can use these alternatives if preferred:

### Pinggy (SSH - Zero Installation)

Requires no tools installed beyond an SSH client:

```bash
ssh -p 443 -R0:localhost:5000 a.pinggy.io
```

Copy the resulting `https://...` URL into `WEBHOOK_URL` in `.env`.

### ngrok

```bash
ngrok http 5000
```

Copy the generated `https://...ngrok-free.app` URL into `WEBHOOK_URL` in `.env`.

---

## Deploying to Dokploy (Self-Hosted / Dynamic IP)

You can easily deploy PokeBotShowdown on [Dokploy](https://dokploy.com/) using the preconfigured `compose.dokploy.yaml` stack (Postgres + Bot in Long Polling mode).

### Step 1: Create a Compose Project in Dokploy

1. In Dokploy, go to **Projects** → select/create a project → **Create Service** → **Compose**.
2. Set the Compose file path to: `compose.dokploy.yaml` (or connect your GitHub repository and branch `main`).

### Step 2: Configure Environment Variables

In the **Environment** tab, set:

```env
API_KEY="your-telegram-bot-token"
BOT_MODE="polling"
DROP_PENDING_UPDATES="true"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="your-secure-password"
POSTGRES_DB="pokemons"
```

### Step 3: Deploy

Click **Deploy**. Dokploy will:

1. Boot PostgreSQL 17 with a persistent Docker volume (`postgres_data`).
2. Run database health checks.
3. Apply Prisma database migrations automatically (`prisma migrate deploy`).
4. Start the bot in **Long Polling mode** and expose `/health` internally for health checks.
5. Auto-recover and reconnect upon power outages or dynamic IP changes with zero downtime.

---

## Troubleshooting

- **`Error: WEBHOOK_URL is not defined`**:
  Make sure you started your tunnel, copied the HTTPS URL, and saved it into `.env` under `WEBHOOK_URL`.
- **Tunnel URL changed on restart**:
  Quick tunnels assign a new random URL each time `cloudflared` is restarted. Whenever this happens, paste the new URL into `WEBHOOK_URL` in `.env` and restart your bot (`pnpm dev` or `docker compose up -d --force-recreate dev`).
- **Port 5000 already in use**:
  Ensure you are not running both `pnpm dev` on the host and the `dev` service in Docker Compose simultaneously. Stop one before running the other (`docker compose stop dev`).
- **Telegram updates not arriving**:
  Check `getWebhookInfo` via the curl command above. If `last_error_message` is present in the response, Telegram will describe why the delivery failed (e.g., timeout or SSL handshake error).
- **`generated/` or `postgres/` permission issues**:
  Files written by Docker containers may be owned by `root`. If running on host after Docker, you may need to adjust ownership: `sudo chown -R $USER:$USER generated/`.

---

## Bot Commands

All commands are case sensitive and must start with `/`.

| English Command     | Spanish Alias      | Description                                      |
| :------------------ | :----------------- | :----------------------------------------------- |
| `/start`            | `/comenzar`        | Start the bot                                    |
| `/register`         | `/registrarse`     | Register user and choose starter Pokemon         |
| `/delete_account`   | `/borrar_cuenta`   | Delete account and associated data               |
| `/help`             | `/ayuda`           | Display command list and instructions            |
| `/generate_pokemon` | `/generar_pokemon` | Spawn a wild Pokemon encounter                   |
| `/pokemons`         | `/pokemons`        | Browse Pokemon collection (interactive carousel) |
| `/pokemonsummary`   | `/resumen_pokemon` | View detailed stats of one of your Pokemon       |
| `/box`              | `/caja`            | Browse PC Storage Box collection                 |
| `/release`          | `/liberar`         | Release a Pokemon for Pokeball rewards           |
| `/evolve`           | `/evolucionar`     | Evolve an owned Pokemon                          |
| `/shiny`            | `/brillante`       | Make one of your pokemons shiny                  |
| `/nickname`         | `/nickname`        | Add a custom nickname to your pokemon            |
| `/trade`            | `/intercambiar`    | Trade a Pokemon with another user                |
| `/battle`           | `/batalla`         | Challenge another trainer to a turn-based battle |
| `/pokedex`          | `/pokedex`         | Look up any Pokemon in the national Pokedex      |
| `/bag`              | `/mochila`         | View your Pokeballs and item inventory           |
| `/daily`            | `/diario`          | Claim daily Pokeballs and streak bonuses         |
| `/profile`          | `/perfil`          | View your Trainer Card, battle records & buddy   |
| `/leaderboard`      | `/ranking`         | View battle rankings and top trainers            |
| `/buddy`            | `/companero`       | Set or view your favorite buddy Pokemon          |

### Inline Mode Queries

You can use the bot in **any chat, group, or channel** without adding it by typing `@<bot_username>` followed by a query:

- `@bot <pokemon_name>`: Instant Pokédex card with artwork, types, lore, and visual stat bars.
- `@bot buddy`: Showcase your companion buddy Pokémon, battle stats, and win rate.
- `@bot team`: Share your active Pokémon party roster directly into any conversation.

---

## Testing

The project includes unit and end-to-end integration test suites powered by [Vitest](https://vitest.dev/):

```bash
# Run all tests (unit + integration)
pnpm test

# Run tests in watch mode
pnpm vitest

# Run only feature tests
pnpm vitest run tests/features
```

Integration tests utilize grammY's `ApiClientOptions.fetch` to intercept outgoing Telegram Bot API requests locally in-memory, paired with an in-memory repository harness. No external network credentials, live Telegram servers, or PostgreSQL instances are required to run the test suite.

---

## Tech Stack

- **Runtime**: Node.js 22+ (TypeScript ESM, `moduleResolution: nodenext`)
- **Framework**: [grammY](https://grammy.dev/) (`@grammyjs/commands`, `@grammyjs/conversations`, `@grammyjs/auto-retry`)
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Server**: Express (Webhook middleware)
- **External API**: [pokenode-ts](https://github.com/Gabb-c/pokenode-ts) (with in-memory caching)

---

## Project Structure

```text
src/
├── domain/            # Entities, repository contracts, battle engine, and domain constants
├── features/          # Feature slices (auth, battle, inventory, pokedex, pokemon, profile, system) with composers & conversations
├── infrastructure/    # Prisma-backed repository implementations
├── presentation/      # MainBot wiring, Express server shell, and shared types
prisma/                # Prisma schema and database migrations
generated/prisma/      # Auto-generated Prisma client
```

---

## Contributing & Community

We welcome contributions from the community! Please consult the following guides:

- [Contributing Guidelines](CONTRIBUTING.md) — Setup, Conventional Commits, Git workflow, and architecture rules.
- [Code of Conduct](CODE_OF_CONDUCT.md) — Standards and community pledge (Contributor Covenant v2.1).
- [Security Policy](SECURITY.md) — Vulnerability reporting and credential guidelines.
- [Changelog](CHANGELOG.md) — Documented release history and updates.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
