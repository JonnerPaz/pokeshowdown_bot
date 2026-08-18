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
    this.app.use(express.json());

    try {
      await this.bot.api.setWebhook(this.webhookUrl, {
        secret_token: this.webhookSecret,
      });
    } catch (error) {
      if (error instanceof GrammyError) {
        console.error("Webhook registration failed:", error.description);
      } else if (error instanceof HttpError) {
        console.error("Could not contact Telegram:", error);
      } else if (error instanceof BotError) {
        console.error("Error associate with BotError:", error);
      } else {
        console.error("Unknown error while registering webhook:", error);
      }
      throw error;
    }

    this.app.use(
      webhookCallback(this.bot, "express", {
        secretToken: this.webhookSecret,
      }),
    );
    this.app.listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}
