import { createHmac } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import express from "express";
import { afterEach, describe, expect, it } from "vitest";

import { UserEntity } from "../../../src/domain/entities/users.entity.js";
import type { ArenaRoomDto } from "../../../src/features/arena/arena.serializer.js";
import { createAppDeps } from "../../../src/presentation/deps.js";
import { createWebApp } from "../../../src/presentation/web/app.js";
import { createTestArena } from "../../harness/arena.js";
import {
  InMemoryPokemonDataSource,
  InMemoryUserDataSource,
} from "../../harness/inMemoryDatasources.js";
import { createMockPokemon } from "../../harness/testHarness.js";

const BOT_TOKEN = "123456:TEST_TOKEN";

function signInitData(telegramId: number): string {
  const params: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    user: JSON.stringify({ id: telegramId, first_name: "Trainer" }),
  };

  const dataCheckString = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  return new URLSearchParams({ ...params, hash }).toString();
}

function headers(telegramId: number): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-telegram-init-data": signInitData(telegramId),
  };
}

class SseReader {
  private buffer = "";
  private readonly decoder = new TextDecoder();
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;

  constructor(response: Response) {
    if (!response.body) throw new Error("SSE response has no body");
    this.reader = response.body.getReader();
  }

  public async next(): Promise<{ event: string; data: string }> {
    for (;;) {
      const boundary = this.buffer.indexOf("\n\n");
      if (boundary !== -1) {
        const frame = this.buffer.slice(0, boundary);
        this.buffer = this.buffer.slice(boundary + 2);
        const lines = frame.split("\n");

        return {
          event: lines.find((line) => line.startsWith("event: "))?.slice(7) ?? "message",
          data: lines
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice(6))
            .join("\n"),
        };
      }

      const { value, done } = await this.reader.read();
      if (done) throw new Error("SSE stream ended before the expected frame");
      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }

  public async done(): Promise<boolean> {
    const { done } = await this.reader.read();
    return done;
  }
}

function seedTrainer(
  userDataSource: InMemoryUserDataSource,
  telegramId: number,
  username: string,
  pokemonId: number,
  pokemonName: string,
): void {
  const user = new UserEntity({
    id: telegramId,
    telegramId,
    username,
    createdAt: new Date(),
    updatedAt: new Date(),
    pokemons: [createMockPokemon(pokemonName, "normal", { id: pokemonId })],
  });
  userDataSource.seedUser(user);
}

describe("battles api", () => {
  let httpServer: HttpServer | undefined;
  let baseUrl = "";
  let userDataSource: InMemoryUserDataSource;

  afterEach(async () => {
    if (!httpServer) return;
    httpServer.closeAllConnections?.();
    await new Promise<void>((resolve, reject) => {
      httpServer?.close((error) => (error ? reject(error) : resolve()));
    });
    httpServer = undefined;
  });

  async function startWebLayer(): Promise<void> {
    userDataSource = new InMemoryUserDataSource();
    const pokemonDataSource = new InMemoryPokemonDataSource(userDataSource);
    const deps = createAppDeps({ userDataSource, pokemonDataSource });
    const arena = createTestArena({ rng: () => 0.1 });

    const app = express();
    app.use(express.json());
    app.use(createWebApp({ deps, botToken: BOT_TOKEN, arena, sseHeartbeatMs: 60_000 }));

    httpServer = app.listen(0);
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  }

  async function call(
    path: string,
    options: { method?: string; telegramId?: number; body?: unknown } = {},
  ): Promise<Response> {
    const init: RequestInit = { method: options.method ?? "GET" };
    if (options.telegramId !== undefined) init.headers = headers(options.telegramId);
    if (options.body !== undefined) init.body = JSON.stringify(options.body);

    return fetch(`${baseUrl}${path}`, init);
  }

  async function openRoom(): Promise<string> {
    const created = await call("/api/battles", { method: "POST", telegramId: 1 });
    expect(created.status).toBe(201);
    const body = (await created.json()) as { room: ArenaRoomDto };
    return body.room.code;
  }

  it("requires telegram auth and an existing room", async () => {
    await startWebLayer();
    seedTrainer(userDataSource, 1, "ash", 11, "pikachu");

    const anonymous = await fetch(`${baseUrl}/api/battles`, { method: "POST" });
    expect(anonymous.status).toBe(401);

    const missing = await call("/api/battles/ZZZZZZ", { telegramId: 1 });
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as { error: { code: string } }).error.code).toBe(
      "room_not_found",
    );
  });

  it("walks a duel from lobby to forfeit", async () => {
    await startWebLayer();
    seedTrainer(userDataSource, 1, "ash", 11, "pikachu");
    seedTrainer(userDataSource, 2, "gary", 22, "eevee");

    const created = await call("/api/battles", { method: "POST", telegramId: 1 });
    const { room } = (await created.json()) as { room: ArenaRoomDto };
    const code = room.code;
    expect(room.status).toBe("open");
    expect(room.participants[0]?.telegramId).toBe("1");

    const duplicate = await call("/api/battles", { method: "POST", telegramId: 1 });
    expect(duplicate.status).toBe(409);
    expect(((await duplicate.json()) as { error: { code: string } }).error.code).toBe(
      "already_in_room",
    );

    const joined = await call(`/api/battles/${code}/join`, { method: "POST", telegramId: 2 });
    expect(joined.status).toBe(200);
    expect(((await joined.json()) as { room: ArenaRoomDto }).room.participants).toHaveLength(2);

    seedTrainer(userDataSource, 3, "brock", 33, "onix");
    const outsider = await call(`/api/battles/${code}`, { telegramId: 3 });
    expect(outsider.status).toBe(403);

    const pickA = await call(`/api/battles/${code}/pokemon`, {
      method: "POST",
      telegramId: 1,
      body: { pokemonId: 11 },
    });
    expect(pickA.status).toBe(200);

    const pickB = await call(`/api/battles/${code}/pokemon`, {
      method: "POST",
      telegramId: 2,
      body: { pokemonId: 22 },
    });
    expect(pickB.status).toBe(200);

    const started = await call(`/api/battles/${code}/start`, { method: "POST", telegramId: 1 });
    expect(started.status).toBe(200);
    const startedRoom = ((await started.json()) as { room: ArenaRoomDto }).room;
    expect(startedRoom.status).toBe("battle");
    expect(startedRoom.turn?.currentTelegramId).toBe("1");

    const offTurn = await call(`/api/battles/${code}/action`, {
      method: "POST",
      telegramId: 2,
      body: { action: "attack" },
    });
    expect(offTurn.status).toBe(403);
    expect(((await offTurn.json()) as { error: { code: string } }).error.code).toBe(
      "not_your_turn",
    );

    const attacked = await call(`/api/battles/${code}/action`, {
      method: "POST",
      telegramId: 1,
      body: { action: "attack" },
    });
    expect(attacked.status).toBe(200);
    const attackBody = (await attacked.json()) as {
      room: ArenaRoomDto;
      result: { damageDealt: number };
    };
    expect(attackBody.result.damageDealt).toBeGreaterThan(0);
    expect(attackBody.room.turn?.currentTelegramId).toBe("2");

    const current = await call("/api/battles/current", { telegramId: 2 });
    expect(((await current.json()) as { room: ArenaRoomDto }).room.code).toBe(code);

    const forfeited = await call(`/api/battles/${code}/forfeit`, {
      method: "POST",
      telegramId: 2,
    });
    expect(forfeited.status).toBe(200);
    expect(((await forfeited.json()) as { room: ArenaRoomDto }).room.result).toEqual({
      winnerTelegramId: "1",
      reason: "forfeit",
    });

    const after = await call("/api/battles/current", { telegramId: 1 });
    expect(((await after.json()) as { room: ArenaRoomDto | null }).room).toBeNull();
  });

  it("rejects malformed picks and actions", async () => {
    await startWebLayer();
    seedTrainer(userDataSource, 1, "ash", 11, "pikachu");
    seedTrainer(userDataSource, 2, "gary", 22, "eevee");
    const code = await openRoom();
    await call(`/api/battles/${code}/join`, { method: "POST", telegramId: 2 });

    const badPick = await call(`/api/battles/${code}/pokemon`, {
      method: "POST",
      telegramId: 1,
      body: { pokemonId: "11" },
    });
    expect(badPick.status).toBe(400);

    await call(`/api/battles/${code}/pokemon`, {
      method: "POST",
      telegramId: 1,
      body: { pokemonId: 11 },
    });
    await call(`/api/battles/${code}/pokemon`, {
      method: "POST",
      telegramId: 2,
      body: { pokemonId: 22 },
    });
    await call(`/api/battles/${code}/start`, { method: "POST", telegramId: 1 });

    const badAction = await call(`/api/battles/${code}/action`, {
      method: "POST",
      telegramId: 1,
      body: { action: "dance" },
    });
    expect(badAction.status).toBe(400);
    expect(((await badAction.json()) as { error: { code: string } }).error.code).toBe(
      "invalid_action",
    );
  });

  it("closes the lobby when the creator leaves", async () => {
    await startWebLayer();
    seedTrainer(userDataSource, 1, "ash", 11, "pikachu");
    seedTrainer(userDataSource, 2, "gary", 22, "eevee");
    const code = await openRoom();
    await call(`/api/battles/${code}/join`, { method: "POST", telegramId: 2 });

    const guestLeaves = await call(`/api/battles/${code}/leave`, {
      method: "POST",
      telegramId: 2,
    });
    expect(((await guestLeaves.json()) as { room: ArenaRoomDto }).room.participants).toHaveLength(
      1,
    );

    const creatorLeaves = await call(`/api/battles/${code}/leave`, {
      method: "POST",
      telegramId: 1,
    });
    expect(((await creatorLeaves.json()) as { room: ArenaRoomDto | null }).room).toBeNull();

    const gone = await call(`/api/battles/${code}`, { telegramId: 1 });
    expect(gone.status).toBe(404);
  });

  it("streams the snapshot, each turn and the final result", async () => {
    await startWebLayer();
    seedTrainer(userDataSource, 1, "ash", 11, "pikachu");
    seedTrainer(userDataSource, 2, "gary", 22, "eevee");
    const code = await openRoom();
    await call(`/api/battles/${code}/join`, { method: "POST", telegramId: 2 });
    await call(`/api/battles/${code}/pokemon`, {
      method: "POST",
      telegramId: 1,
      body: { pokemonId: 11 },
    });
    await call(`/api/battles/${code}/pokemon`, {
      method: "POST",
      telegramId: 2,
      body: { pokemonId: 22 },
    });
    await call(`/api/battles/${code}/start`, { method: "POST", telegramId: 1 });

    const stream = await fetch(`${baseUrl}/api/battles/${code}/events`, {
      headers: headers(1),
    });
    expect(stream.status).toBe(200);
    expect(stream.headers.get("content-type")).toContain("text/event-stream");

    const reader = new SseReader(stream);
    const snapshot = await reader.next();
    expect(snapshot.event).toBe("snapshot");
    expect((JSON.parse(snapshot.data) as ArenaRoomDto).code).toBe(code);

    await call(`/api/battles/${code}/action`, {
      method: "POST",
      telegramId: 1,
      body: { action: "attack" },
    });
    const turn = await reader.next();
    expect(turn.event).toBe("turn");
    expect(
      (JSON.parse(turn.data) as { result: { damageDealt: number } }).result.damageDealt,
    ).toBeGreaterThan(0);

    await call(`/api/battles/${code}/forfeit`, { method: "POST", telegramId: 2 });
    const finished = await reader.next();
    expect(finished.event).toBe("finished");
    expect((JSON.parse(finished.data) as ArenaRoomDto).result?.reason).toBe("forfeit");

    expect(await reader.done()).toBe(true);
  });

  it("refuses the events stream to non participants", async () => {
    await startWebLayer();
    seedTrainer(userDataSource, 1, "ash", 11, "pikachu");
    seedTrainer(userDataSource, 2, "gary", 22, "eevee");
    seedTrainer(userDataSource, 3, "brock", 33, "onix");
    const code = await openRoom();

    const stream = await fetch(`${baseUrl}/api/battles/${code}/events`, {
      headers: headers(3),
    });
    expect(stream.status).toBe(403);
    expect(((await stream.json()) as { error: { code: string } }).error.code).toBe(
      "not_participant",
    );
  });
});
