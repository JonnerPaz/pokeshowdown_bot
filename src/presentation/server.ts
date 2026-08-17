import express from "express";
import type { Express } from "express";
import { Bot, BotError, GrammyError, HttpError, webhookCallback } from "grammy";
import type { AppContext } from "./data/types.js";

interface ServerOptions {
  port: number;
  webhookUrl: string;
  webhookSecret: string;
  bot: Bot<AppContext>;
}

export class Server {
  public app: Express;
  public readonly bot: Bot<AppContext>;
  public readonly port: number;
  public readonly webhookUrl: string;
  public readonly webhookSecret: string;

  constructor(options: ServerOptions) {
    this.app = express();
    this.port = options.port;
    this.bot = options.bot;
    this.webhookUrl = options.webhookUrl;
    this.webhookSecret = options.webhookSecret;
  }

  public async setup() {
    try {
      this.app.use(express.json());

      await this.bot.api.setWebhook(this.webhookUrl, {
        secret_token: this.webhookSecret,
      });

      this.app.use(
        webhookCallback(this.bot, "express", {
          secretToken: this.webhookSecret,
        }),
      );
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
