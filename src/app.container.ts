import { Server } from "./presentation/server.js";
import { MainBot } from "./presentation/mainbot.js";

export class AppContainer {
  public static async setup() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY is not defined");

    const botController = new MainBot(apiKey);

    const server = new Server({
      port: +process.env.PORT! || 3000,
      bot: botController.bot,
      webhookUrl: process.env.WEBHOOK_URL!,
    });

    await server.setup();
  }
}
