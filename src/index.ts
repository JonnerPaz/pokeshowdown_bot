import "dotenv/config";
import { Server } from "./presentation/server.js";
import { MainBot } from "./presentation/mainbot.js";
import { prisma } from "./data/postgres/index.js";

async function startup() {
  const { API_KEY: apiKey, WEBHOOK_URL: webhookUrl, WEBHOOK_SECRET: webhookSecret } = process.env;
  const port = process.env.PORT ? Number(process.env.PORT) : 5000;
  if (!apiKey) throw new Error("API_KEY is not defined");
  if (!webhookUrl) throw new Error("WEBHOOK_URL is not defined");
  if (!webhookSecret) throw new Error("WEBHOOK_SECRET is not defined");

  const botInstance = new MainBot(apiKey);
  await botInstance.registerControllers();

  const server = new Server({ port, bot: botInstance.bot, webhookUrl, webhookSecret });
  await server.setup();

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    try {
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
