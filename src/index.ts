import "dotenv/config";
import { Server } from "./presentation/server.js";
import { MainBot } from "./presentation/mainbot.js";

async function startup() {
  const { API_KEY: apiKey, WEBHOOK_URL: webhookUrl, WEBHOOK_SECRET: webhookSecret } = process.env;
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  if (!apiKey) throw new Error("API_KEY is not defined");
  if (!webhookUrl) throw new Error("WEBHOOK_URL is not defined");
  if (!webhookSecret) throw new Error("WEBHOOK_SECRET is not defined");

  const botInstance = new MainBot(apiKey);
  await botInstance.registerControllers();

  const server = new Server({ port, bot: botInstance.bot, webhookUrl, webhookSecret });
  await server.setup();
}

await startup();
