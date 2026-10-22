import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server as HttpServer } from "node:http";

import express from "express";
import { Bot } from "grammy";
import { afterEach, describe, expect, it } from "vitest";

import type { AppContext } from "../../../src/presentation/data/types.js";
import { createAppDeps } from "../../../src/presentation/deps.js";
import { Server } from "../../../src/presentation/server.js";
import { createWebApp } from "../../../src/presentation/web/app.js";
import { createTestArena } from "../../harness/arena.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";
import {
  InMemoryPokemonDataSource,
  InMemoryUserDataSource,
} from "../../harness/inMemoryDatasources.js";
import { MockTelegramClient } from "../../harness/mockTelegramClient.js";
import { createMockPokemon } from "../../harness/testHarness.js";

const BOT_TOKEN = "123456:TEST_TOKEN";

interface InitDataFields {
  telegramId?: number;
  authDateSeconds?: number;
}

function signInitData(fields: InitDataFields = {}, token: string = BOT_TOKEN): string {
  const authDate = fields.authDateSeconds ?? Math.floor(Date.now() / 1000);
  const params: Record<string, string> = {
    auth_date: String(authDate),
    query_id: "AAHdF6IQAAAAAN0XohDhrOrc",
    user: JSON.stringify({ id: fields.telegramId ?? 42, first_name: "Ash" }),
  };

  const dataCheckString = Object.entries(params)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(dataCheckString).digest("hex");

  return new URLSearchParams({ ...params, hash }).toString();
}

function buildDeps() {
  const userDataSource = new InMemoryUserDataSource();
  const pokemonDataSource = new InMemoryPokemonDataSource(userDataSource);
  const deps = createAppDeps({ userDataSource, pokemonDataSource });
  const arena = createTestArena();
  return { deps, userDataSource, arena };
}

function seedTrainer(userDataSource: InMemoryUserDataSource, telegramId = 42): UserEntity {
  const user = new UserEntity({
    id: null,
    telegramId,
    username: "ash_ketchum",
    createdAt: new Date(),
    updatedAt: new Date(),
    pokemons: [],
    wins: 3,
    losses: 1,
  });
  userDataSource.seedUser(user);

  user.pokemons.push(
    createMockPokemon("pikachu", "electric", { id: 7, isInParty: true }),
    createMockPokemon("eevee", "normal", { id: 8, isInParty: false }),
  );

  return user;
}

describe("web api", () => {
  let httpServer: HttpServer | undefined;

  afterEach(async () => {
    if (!httpServer) return;
    await new Promise<void>((resolve, reject) => {
      httpServer?.close((error) => (error ? reject(error) : resolve()));
    });
    httpServer = undefined;
  });

  async function startWebLayer() {
    const { deps, userDataSource, arena } = buildDeps();
    const app = express();
    app.use(createWebApp({ deps, botToken: BOT_TOKEN, arena }));

    httpServer = app.listen(0);
    const address = httpServer.address() as AddressInfo;

    return { baseUrl: `http://127.0.0.1:${address.port}`, userDataSource };
  }

  it("serves the public health route with hardened headers", async () => {
    const { baseUrl } = await startWebLayer();

    const res = await fetch(`${baseUrl}/api/health`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors");
    expect(res.headers.get("x-frame-options")).toBeNull();
  });

  it("rejects a request without the init data header", async () => {
    const { baseUrl } = await startWebLayer();

    const res = await fetch(`${baseUrl}/api/me`);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: "missing_init_data", message: "X-Telegram-Init-Data header is required" },
    });
  });

  it("rejects a payload signed with another token", async () => {
    const { baseUrl } = await startWebLayer();

    const res = await fetch(`${baseUrl}/api/me`, {
      headers: { "x-telegram-init-data": signInitData({}, "999:OTHER") },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("bad_signature");
  });

  it("rejects an expired payload", async () => {
    const { baseUrl } = await startWebLayer();
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;

    const res = await fetch(`${baseUrl}/api/me`, {
      headers: { "x-telegram-init-data": signInitData({ authDateSeconds: twoDaysAgo }) },
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("expired");
  });

  it("returns 404 when the authenticated trainer is not registered", async () => {
    const { baseUrl } = await startWebLayer();

    const res = await fetch(`${baseUrl}/api/me`, {
      headers: { "x-telegram-init-data": signInitData({ telegramId: 777 }) },
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("user_not_registered");
  });

  it("returns the trainer and their active party", async () => {
    const { baseUrl, userDataSource } = await startWebLayer();
    seedTrainer(userDataSource);

    const res = await fetch(`${baseUrl}/api/me`, {
      headers: { "x-telegram-init-data": signInitData() },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { telegramId: string; username: string; wins: number; losses: number };
      party: Array<{ name: string; isInParty: boolean; sprites: { frontDefault: string } }>;
    };

    expect(body.user.telegramId).toBe("42");
    expect(body.user.username).toBe("ash_ketchum");
    expect(body.user.wins).toBe(3);
    expect(body.user.losses).toBe(1);
    expect(body.party).toHaveLength(1);
    expect(body.party[0]).toMatchObject({ name: "pikachu", isInParty: true });
    expect(body.party[0]?.sprites.frontDefault).toContain("pikachu");
  });

  it("returns a json 404 for unknown api routes", async () => {
    const { baseUrl, userDataSource } = await startWebLayer();
    seedTrainer(userDataSource);

    const res = await fetch(`${baseUrl}/api/unknown`, {
      headers: { "x-telegram-init-data": signInitData() },
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("not_found");
  });
});

describe("server with the web layer", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (!server) return;
    await server.close();
    server = undefined;
  });

  it("serves both /health and /api/health", async () => {
    const mockClient = new MockTelegramClient();
    const bot = new Bot<AppContext>(BOT_TOKEN, {
      client: { apiRoot: "https://api.telegram.org", fetch: mockClient.createFetch() },
    });
    const { deps, arena } = buildDeps();

    server = new Server({
      port: 0,
      bot,
      mode: "polling",
      webApp: createWebApp({ deps, botToken: BOT_TOKEN, arena }),
    });
    await server.setup();

    const address = server.httpServer?.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/api/health`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/api/me`)).status).toBe(401);
  });
});
