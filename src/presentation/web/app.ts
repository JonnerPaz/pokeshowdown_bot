import { existsSync } from "node:fs";
import path from "node:path";

import express, { Router } from "express";
import type { ErrorRequestHandler } from "express";
import type { ArenaService } from "../../features/arena/arena.service.js";
import type { AppDeps } from "../deps.js";
import { sendApiError } from "./errors.js";
import { requireTelegramUser } from "./middleware/auth.js";
import { createBattlesRouter } from "./routes/battles.js";
import { createMeRouter } from "./routes/me.js";

/** Built by `pnpm run build:web`; also present in the production image. */
export const DEFAULT_WEB_ROOT = path.resolve(process.cwd(), "dist", "web");

export interface WebAppOptions {
  deps: AppDeps;
  botToken: string;
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
  const staticDir = options.staticDir ?? DEFAULT_WEB_ROOT;
  const indexPath = path.join(staticDir, "index.html");
  const hasClient = existsSync(indexPath);

  router.use((_req, res, next) => {
    // Everything here is per-user and authenticated: never cache at the edge.
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", TELEGRAM_FRAME_ANCESTORS);
    next();
  });

  router.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  if (hasClient) {
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
  }

  router.use(
    "/api",
    requireTelegramUser({
      botToken: options.botToken,
      userDataSource: options.deps.userDataSource,
      maxAgeSeconds: options.maxAgeSeconds,
    }),
  );

  router.use("/api", createMeRouter());

  router.use(
    "/api/battles",
    createBattlesRouter({ arena: options.arena, heartbeatMs: options.sseHeartbeatMs }),
  );

  router.use("/api", (_req, res) => {
    sendApiError(res, 404, "not_found", "Unknown API route");
  });

  if (hasClient) {
    // Single-page app fallback. Skip paths with an extension so a missing
    // asset still returns 404 instead of an HTML page with a 200 status.
    router.get(/.*/, (req, res, next) => {
      if (path.extname(req.path)) {
        next();
        return;
      }
      res.sendFile(indexPath, { cacheControl: false }, (error) => {
        if (error) next(error);
      });
    });
  }

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
