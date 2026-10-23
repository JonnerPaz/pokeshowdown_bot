import { Router } from "express";
import type { AuthenticatedLocals } from "../middleware/auth.js";
import { serializeProfile } from "../serialize.js";

export interface MeRouterOptions {
  botUsername?: string | undefined;
}

export function createMeRouter(options: MeRouterOptions = {}): Router {
  const router = Router();

  router.get("/me", (_req, res) => {
    const { user } = res.locals as AuthenticatedLocals;
    res.status(200).json(serializeProfile(user, options.botUsername ?? null));
  });

  return router;
}
