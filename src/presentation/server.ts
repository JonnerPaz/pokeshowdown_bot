import express from "express";
import type { Express } from "express";
import { Bot, BotError, GrammyError, HttpError, webhookCallback } from "grammy";
import type { AppContext } from "./data/types.js";

interface ServerOptions {
  port: number;
  /** @description path to webhook url */
  webhookUrl: string;
  bot: Bot<AppContext>;
}

export class Server {
  public app: Express;
  public readonly bot: Bot<AppContext>;
  public readonly port: number;
  public readonly webhookUrl: string;

  constructor(options: ServerOptions) {
    this.app = express();
    this.port = options.port;
    this.bot = options.bot;
    this.webhookUrl = options.webhookUrl;
  }

  public async setup() {
    if (!this.webhookUrl) {
      console.error("WEBHOOK_URL is not set — add your tunnel URL to .env");
      throw new Error("WEBHOOK_URL is not defined");
    }

    try {
      this.app.use(express.json());

      await this.bot.api.setWebhook(this.webhookUrl);

      this.app.use(webhookCallback(this.bot, "express"));
      this.app.listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);
      });
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
