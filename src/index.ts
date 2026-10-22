import "dotenv/config";
import type { Bot } from "grammy";
import { Server } from "./presentation/server.js";
import { MainBot } from "./presentation/mainbot.js";
import type { AppContext } from "./presentation/data/types.js";
import { createWebApp } from "./presentation/web/app.js";
import { ARENA_DEFAULT_TURN_TIMEOUT_MS, ArenaService } from "./features/arena/arena.service.js";
import { prisma } from "./data/postgres/index.js";

const WEBAPP_MENU_TEXT = "Open Arena";

function resolveWebAppUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (!value.startsWith("https://")) {
    console.error("WEBAPP_URL must start with https://; the web layer stays disabled");
    return undefined;
  }
  return value.replace(/\/+$/, "");
}

function readMaxAgeSeconds(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.floor(value);
}

function readSecondsAsMs(raw: string | undefined, fallbackMs: number): number {
  if (!raw) return fallbackMs;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallbackMs;
  return Math.floor(value * 1000);
}

async function registerArenaMenuButton(bot: Bot<AppContext>, url: string): Promise<void> {
  try {
    await bot.api.setChatMenuButton({
      menu_button: { type: "web_app", text: WEBAPP_MENU_TEXT, web_app: { url } },
    });
    console.log(`Arena menu button registered for ${url}`);
  } catch (error) {
    // A failed menu button must never prevent the bot from starting.
    console.error("failed to register the arena menu button", { error });
  }
}

async function startup() {
  const {
    API_KEY: apiKey,
    WEBHOOK_URL: webhookUrl,
    WEBHOOK_SECRET: webhookSecret,
    BOT_MODE: rawBotMode,
    DROP_PENDING_UPDATES: rawDropPending,
  } = process.env;
  const port = process.env.PORT ? Number(process.env.PORT) : 5000;
  if (!apiKey) throw new Error("API_KEY is not defined");

  const mode =
    rawBotMode?.toLowerCase() === "webhook"
      ? "webhook"
      : rawBotMode?.toLowerCase() === "polling" || !webhookUrl
        ? "polling"
        : "webhook";

  const dropPendingUpdates = rawDropPending === "true";

  if (mode === "webhook") {
    if (!webhookUrl) throw new Error("WEBHOOK_URL is not defined");
    if (!webhookSecret) throw new Error("WEBHOOK_SECRET is not defined");
  }

  const botInstance = new MainBot(apiKey);
  await botInstance.registerControllers();

  const webAppUrl = resolveWebAppUrl(process.env.WEBAPP_URL);
  const arena = webAppUrl
    ? new ArenaService({
        battleService: botInstance.deps.battleService,
        turnTimeoutMs: readSecondsAsMs(
          process.env.ARENA_TURN_TIMEOUT_SEC,
          ARENA_DEFAULT_TURN_TIMEOUT_MS,
        ),
      })
    : null;
  const webApp =
    webAppUrl && arena
      ? createWebApp({
          deps: botInstance.deps,
          botToken: apiKey,
          maxAgeSeconds: readMaxAgeSeconds(process.env.WEBAPP_AUTH_MAX_AGE_SEC),
          arena,
        })
      : undefined;

  const server = new Server({
    port,
    bot: botInstance.bot,
    mode,
    ...(webApp ? { webApp } : {}),
    ...(mode === "webhook" ? { webhookUrl, webhookSecret } : {}),
  });
  await server.setup();

  if (webAppUrl) {
    await registerArenaMenuButton(botInstance.bot, webAppUrl);
  }

  if (mode === "polling") {
    await botInstance.bot.api.deleteWebhook({ drop_pending_updates: dropPendingUpdates });
    void botInstance.bot.start({
      drop_pending_updates: dropPendingUpdates,
      onStart: (info) => {
        console.log(`Bot @${info.username} started in polling mode`);
      },
    });
  }

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    try {
      if (mode === "polling") {
        await botInstance.bot.stop();
      }
      arena?.destroy();
      await server.close();
      await prisma.$disconnect();
      console.log("Cleanup complete. Process exiting.");
      process.exit(0);
    } catch (err) {
      console.error("Error during graceful shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

await startup();
