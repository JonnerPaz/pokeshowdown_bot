import express from "express";
import type { Express } from "express";
import { Bot, BotError, GrammyError, HttpError, webhookCallback } from "grammy";
import type { AppContext } from "./data/types.js";

interface ServerOptions {
  port: number;
  bot: Bot<AppContext>;
}

export class Server {
  public app: Express;
  public readonly bot: Bot<AppContext>;
  public readonly port: number;

  constructor(options: ServerOptions) {
    this.app = express();
    this.port = options.port;
    this.bot = options.bot;
  }

  public async setup() {
    try {
      this.app.use(express.json());

      // this.app.post("/webhook", webhookCallback(this.bot, "express"));

      this.app.listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);
      });

      console.log("COMMANDS REGISTERED", await this.bot.api.getMyCommands());

      this.bot.start();

      // this.bot.api.setWebhook(`https://jonner.loca.lt/bot/webhook`);
    } catch (error) {
      if (error instanceof GrammyError) {
        console.error("Error in request:", error.description);
      } else if (error instanceof HttpError) {
        console.error("Could not contact Telegram:", error);
      } else if (error instanceof BotError) {
        console.error("Error associate with BotError:", error);
      } else {
        console.error("Unknown error:", error);
      }
    }
  }
}
