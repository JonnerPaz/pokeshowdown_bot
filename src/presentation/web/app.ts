import { existsSync } from "node:fs";
import path from "node:path";

import express, { Router } from "express";
import type { ErrorRequestHandler } from "express";
import type { ArenaService } from "../../features/arena/arena.service.js";
import type { AppDeps } from "../deps.js";
import { sendApiError } from "./errors.js";
import { requireTelegramUser } from "./middleware/auth.js";
import { createBattleEventsHandler, createBattlesRouter } from "./routes/battles.js";
import { createMeRouter } from "./routes/me.js";
import { deriveStreamTicketKey } from "./streamTicket.js";

/** Built by `pnpm run build:web`; also present in the production image. */
export const DEFAULT_WEB_ROOT = path.resolve(process.cwd(), "dist", "web");

export interface WebAppOptions {
  deps: AppDeps;
  botToken: string;
  botUsername?: string | undefined;
  maxAgeSeconds?: number | undefined;
  arena: ArenaService;
  sseHeartbeatMs?: number | undefined;
  /** Overridable for tests; defaults to `dist/web`. */
  staticDir?: string | undefined;
}

/**
 * Telegram renders Mini Apps inside an iframe, so the page must be allowed to
 * be framed by Telegram and only by Telegram. Never send `X-Frame-Options`.
 */
export const TELEGRAM_FRAME_ANCESTORS =
  "frame-ancestors https://web.telegram.org https://*.telegram.org";

export function createWebApp(options: WebAppOptions): Router {
  const router = Router();
  const staticDir = path.resolve(options.staticDir ?? DEFAULT_WEB_ROOT);
  const indexPath = path.join(staticDir, "index.html");
  const ticketKey = deriveStreamTicketKey(options.botToken);

  router.use((_req, res, next) => {
    // Everything here is per-user and authenticated: never cache at the edge.
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", TELEGRAM_FRAME_ANCESTORS);
    next();
  });

  router.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Public shell and assets: the app authenticates every API call with the
  // signed init data header, so static files never need credentials.
  router.use(
    express.static(staticDir, {
      index: "index.html",
      cacheControl: false,
      dotfiles: "ignore",
      etag: true,
    }),
  );

  // Native EventSource cannot attach custom headers; the stream authenticates
  // with a short-lived HMAC ticket in the query string instead of hitting DB.
  router.get(
    "/api/battles/:code/events",
    createBattleEventsHandler({
      arena: options.arena,
      ticketKey,
      heartbeatMs: options.sseHeartbeatMs,
    }),
  );

  router.use(
    "/api",
    requireTelegramUser({
      botToken: options.botToken,
      userDataSource: options.deps.userDataSource,
      maxAgeSeconds: options.maxAgeSeconds,
    }),
  );

  router.use("/api", createMeRouter({ botUsername: options.botUsername }));

  router.use("/api/battles", createBattlesRouter({ arena: options.arena, ticketKey }));

  router.use("/api", (_req, res) => {
    sendApiError(res, 404, "not_found", "Unknown API route");
  });

  // Single-page app fallback. Check `existsSync(indexPath)` per request so that
  // assets built after server startup (e.g. `vite build --watch` in dev) are
  // served immediately without restarting the bot.
  router.get(/.*/, (req, res, next) => {
    if (path.extname(req.path) || !existsSync(indexPath)) {
      next();
      return;
    }
    res.sendFile(indexPath, { cacheControl: false }, (error) => {
      if (error) next(error);
    });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    console.error("web request failed", { error });
    sendApiError(res, 500, "internal_error", "Unexpected server error");
  };
  router.use(errorHandler);

  return router;
}
