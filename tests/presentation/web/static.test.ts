import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

import express from "express";
import { afterEach, describe, expect, it } from "vitest";

import { createAppDeps } from "../../../src/presentation/deps.js";
import { createWebApp } from "../../../src/presentation/web/app.js";
import { createTestArena } from "../../harness/arena.js";
import {
  InMemoryPokemonDataSource,
  InMemoryUserDataSource,
} from "../../harness/inMemoryDatasources.js";

const BOT_TOKEN = "123456:TEST_TOKEN";

describe("mini app static shell", () => {
  let httpServer: HttpServer | undefined;
  let staticDir: string | undefined;
  let baseUrl = "";

  afterEach(async () => {
    if (httpServer) {
      httpServer.closeAllConnections?.();
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((error) => (error ? reject(error) : resolve()));
      });
      httpServer = undefined;
    }

    if (staticDir) {
      await rm(staticDir, { recursive: true, force: true });
      staticDir = undefined;
    }
  });

  async function startWebLayer(): Promise<void> {
    staticDir = await mkdtemp(path.join(tmpdir(), "pokebot-web-"));
    await writeFile(
      path.join(staticDir, "index.html"),
      "<!doctype html><title>PokeBot Arena</title>",
    );
    await writeFile(path.join(staticDir, "app.js"), "console.log('arena');");

    const userDataSource = new InMemoryUserDataSource();
    const pokemonDataSource = new InMemoryPokemonDataSource(userDataSource);
    const deps = createAppDeps({ userDataSource, pokemonDataSource });

    const app = express();
    app.use(
      createWebApp({
        deps,
        botToken: BOT_TOKEN,
        arena: createTestArena(),
        staticDir,
      }),
    );

    httpServer = app.listen(0);
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  }

  it("serves the shell and assets without Telegram auth", async () => {
    await startWebLayer();

    const shell = await fetch(`${baseUrl}/`);
    expect(shell.status).toBe(200);
    expect(await shell.text()).toContain("PokeBot Arena");
    expect(shell.headers.get("cache-control")).toBe("no-store");
    expect(shell.headers.get("x-content-type-options")).toBe("nosniff");

    const asset = await fetch(`${baseUrl}/app.js`);
    expect(asset.status).toBe(200);
    expect(await asset.text()).toContain("arena");
  });

  it("serves the SPA fallback without shadowing the API or missing assets", async () => {
    await startWebLayer();

    const fallback = await fetch(`${baseUrl}/room/ABC123`);
    expect(fallback.status).toBe(200);
    expect(await fallback.text()).toContain("PokeBot Arena");

    const api = await fetch(`${baseUrl}/api/unknown`);
    expect(api.status).toBe(401);
    expect(api.headers.get("content-type")).toContain("application/json");

    const missingAsset = await fetch(`${baseUrl}/missing.js`);
    expect(missingAsset.status).toBe(404);
  });
});
