import { Router } from "express";
import type { Request, RequestHandler, Response } from "express";

import type { TurnActionResult } from "../../../domain/battle/types.js";
import { serializeRoom } from "../../../features/arena/arena.serializer.js";
import type { ArenaService } from "../../../features/arena/arena.service.js";
import { ArenaError } from "../../../features/arena/arena.types.js";
import type { AuthenticatedLocals } from "../middleware/auth.js";
import { sendApiError } from "../errors.js";

export const ARENA_SSE_HEARTBEAT_MS = 20_000;
const MAX_STREAMS_PER_ROOM = 4;

export interface BattlesRouterOptions {
  arena: ArenaService;
  heartbeatMs?: number | undefined;
}

type RouteHandler = (req: Request, res: Response) => Promise<void> | void;

function route(handler: RouteHandler): RequestHandler {
  return (req, res, next) => {
    // Wrap the invocation so synchronous throws are caught too; calling the
    // handler directly would let them escape to Express' generic error handler.
    Promise.resolve()
      .then(() => handler(req, res))
      .catch((error: unknown) => {
        if (error instanceof ArenaError) {
          sendApiError(res, error.status, error.code, error.message);
          return;
        }
        next(error);
      });
  };
}

function localsOf(res: Response): AuthenticatedLocals {
  return res.locals as AuthenticatedLocals;
}

function codeOf(req: Request): string {
  return String(req.params.code ?? "");
}

function bodyOf(req: Request): Record<string, unknown> {
  const body = req.body as unknown;
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

function parseChatId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

function serializeTurnResult(result: TurnActionResult): Record<string, unknown> {
  return {
    attackerTelegramId: String(result.attackerTrainerId),
    action: result.action,
    damageDealt: result.damageDealt,
    typeMultiplier: result.typeMultiplier,
    isCritical: result.isCritical,
    targetFainted: result.targetFainted,
  };
}

export function createBattlesRouter(options: BattlesRouterOptions): Router {
  const router = Router();
  const { arena } = options;
  const heartbeatMs = options.heartbeatMs ?? ARENA_SSE_HEARTBEAT_MS;
  const streamsByRoom = new Map<string, number>();

  router.post(
    "/",
    route((req, res) => {
      const { user } = localsOf(res);
      const room = arena.createRoom(user, parseChatId(bodyOf(req).chatId));
      res.status(201).json({ room: serializeRoom(room) });
    }),
  );

  // Keep this route above /:code so "current" is not read as a room code.
  router.get(
    "/current",
    route((_req, res) => {
      const room = arena.getCurrentRoom(localsOf(res).telegramId);
      res.status(200).json({ room: room ? serializeRoom(room) : null });
    }),
  );

  router.post(
    "/:code/join",
    route((req, res) => {
      const room = arena.joinRoom(codeOf(req), localsOf(res).user);
      res.status(200).json({ room: serializeRoom(room) });
    }),
  );

  router.post(
    "/:code/pokemon",
    route(async (req, res) => {
      const pokemonId = bodyOf(req).pokemonId;
      if (typeof pokemonId !== "number" || !Number.isInteger(pokemonId)) {
        sendApiError(res, 400, "invalid_pokemon", "pokemonId must be an integer");
        return;
      }

      const room = await arena.pickPokemon(codeOf(req), localsOf(res).user, pokemonId);
      res.status(200).json({ room: serializeRoom(room) });
    }),
  );

  router.post(
    "/:code/start",
    route((req, res) => {
      const room = arena.startBattle(codeOf(req), localsOf(res).user);
      res.status(200).json({ room: serializeRoom(room) });
    }),
  );

  router.post(
    "/:code/action",
    route(async (req, res) => {
      const { room, result } = await arena.submitAction(
        codeOf(req),
        localsOf(res).user,
        bodyOf(req).action,
      );
      res.status(200).json({ room: serializeRoom(room), result: serializeTurnResult(result) });
    }),
  );

  router.post(
    "/:code/forfeit",
    route(async (req, res) => {
      const room = await arena.forfeit(codeOf(req), localsOf(res).user);
      res.status(200).json({ room: serializeRoom(room) });
    }),
  );

  router.post(
    "/:code/leave",
    route((req, res) => {
      const room = arena.leaveRoom(codeOf(req), localsOf(res).user);
      res.status(200).json({ room: room ? serializeRoom(room) : null });
    }),
  );

  router.get(
    "/:code",
    route((req, res) => {
      const room = arena.getRoomFor(codeOf(req), localsOf(res).telegramId);
      res.status(200).json({ room: serializeRoom(room) });
    }),
  );

  router.get(
    "/:code/events",
    route((req, res) => {
      const code = codeOf(req).trim().toUpperCase();
      const room = arena.getRoomFor(code, localsOf(res).telegramId);

      const openStreams = streamsByRoom.get(code) ?? 0;
      if (openStreams >= MAX_STREAMS_PER_ROOM) {
        sendApiError(res, 429, "too_many_streams", "Too many open streams for this room");
        return;
      }

      res.status(200);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      streamsByRoom.set(code, openStreams + 1);
      let streamClosed = false;
      let heartbeat: NodeJS.Timeout | null = null;
      let unsubscribe: (() => void) | null = null;

      const cleanup = (): void => {
        if (streamClosed) return;
        streamClosed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();

        const remaining = (streamsByRoom.get(code) ?? 1) - 1;
        if (remaining <= 0) streamsByRoom.delete(code);
        else streamsByRoom.set(code, remaining);
      };

      const writeEvent = (event: string, data: unknown, revision: number): void => {
        if (res.writableEnded || streamClosed) return;
        res.write(`id: ${revision}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      writeEvent("snapshot", serializeRoom(room), room.revision);

      if (room.status === "finished") {
        cleanup();
        res.end();
        return;
      }

      unsubscribe = arena.subscribe(code, (event) => {
        switch (event.type) {
          case "room":
            writeEvent("room", serializeRoom(event.room), event.room.revision);
            break;
          case "turn":
            writeEvent(
              "turn",
              {
                room: serializeRoom(event.room),
                result: serializeTurnResult(event.result),
              },
              event.room.revision,
            );
            break;
          case "finished":
            writeEvent("finished", serializeRoom(event.room), event.room.revision);
            cleanup();
            res.end();
            break;
        }
      });

      heartbeat = setInterval(() => {
        if (!res.writableEnded && !streamClosed) res.write(": ping\n\n");
      }, heartbeatMs);
      heartbeat.unref?.();

      res.on("close", cleanup);
    }),
  );

  return router;
}
