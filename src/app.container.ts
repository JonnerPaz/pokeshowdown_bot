import { Server } from "./presentation/server.js";
import { MainBot } from "./presentation/mainbot.js";

export class AppContainer {
  public static async setup() {
    const apiKey = process.env.API_KEY as string;
    const botController = await MainBot.getInstance(apiKey);

    await botController.setup();
    const server = new Server({
      port: +process.env.PORT! || 3000,
      bot: botController.bot,
    });

    await server.setup();
  }
}
