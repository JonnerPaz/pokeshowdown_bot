import { MainBot } from "./presentation/bot.container.js";

export class AppContainer {
  public static async setup(): Promise<MainBot> {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return new Error("API_KEY is not defined");

    return new MainBot({ apiKey }).setup();
  }
}
