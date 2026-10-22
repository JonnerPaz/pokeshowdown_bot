import type { Server as HttpServer } from "node:http";

import express from "express";
import type { Express, RequestHandler } from "express";
import { Bot, BotError, GrammyError, HttpError, webhookCallback } from "grammy";
import type { AppContext } from "./data/types.js";

export type ServerMode = "webhook" | "polling";

export interface ServerOptions {
  port: number;
  bot: Bot<AppContext>;
  mode?: ServerMode | undefined;
  webhookUrl?: string | undefined;
  webhookSecret?: string | undefined;
  /** Web layer (Mini App API). Mounted before the webhook so both can coexist. */
  webApp?: RequestHandler | undefined;
}

export class Server {
  public app: Express;
  public readonly bot: Bot<AppContext>;
  public readonly port: number;
  public readonly mode: ServerMode;
  public readonly webhookUrl?: string | undefined;
  public readonly webhookSecret?: string | undefined;
  public readonly webApp?: RequestHandler | undefined;
  public httpServer?: HttpServer;

  constructor(options: ServerOptions) {
    this.app = express();
    this.port = options.port;
    this.bot = options.bot;
    this.mode = options.mode ?? (options.webhookUrl ? "webhook" : "polling");
    this.webhookUrl = options.webhookUrl;
    this.webhookSecret = options.webhookSecret;
    this.webApp = options.webApp;
  }

  public async setup() {
    this.app.use(express.json());

    // to ping the bot on a regular basis
    this.app.get("/health", (_req, res) => {
      res.status(200).json({ status: "ok" });
    });

    if (this.webApp) {
      this.app.use(this.webApp);
    }

    if (this.mode === "webhook") {
      if (!this.webhookUrl || !this.webhookSecret) {
        throw new Error("webhookUrl and webhookSecret are required in webhook mode");
      }

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
          timeoutMilliseconds: 30_000,
          onTimeout: "return",
        }),
      );
    }

    await new Promise<void>((resolve) => {
      this.httpServer = this.app.listen(this.port, () => {
        console.log(`Server running on port ${this.port} (${this.mode} mode)`);
        resolve();
      });
    });
  }

  public async close(): Promise<void> {
    const server = this.httpServer;
    if (!server) return;

    return new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
      // SSE streams stay open forever; without this, close() waits for clients
      // that will never disconnect on their own.
      server.closeAllConnections?.();
    });
  }
}
