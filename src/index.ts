import "dotenv/config";
import { Server } from "./presentation/server.js";
import { MainBot } from "./presentation/mainbot.js";

async function startup() {
  const { API_KEY: apiKey, WEBHOOK_URL: webhookUrl } = process.env;
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  if (!apiKey) throw new Error("API_KEY is not defined");
  if (!webhookUrl) throw new Error("WEBHOOK_URL is not defined");

  const { bot } = new MainBot(apiKey);

  const server = new Server({ port, bot, webhookUrl });
  await server.setup();
}

await startup();
