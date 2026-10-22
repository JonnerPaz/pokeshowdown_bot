#!/usr/bin/env node
import { watch as watchFile } from "node:fs";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

import { build, context } from "esbuild";

const root = process.cwd();
const clientDir = path.join(root, "src", "presentation", "web", "client");
const outDir = path.join(root, "dist", "web");
const watchMode = process.argv.includes("--watch");

const options = {
  entryPoints: [path.join(clientDir, "main.ts")],
  outfile: path.join(outDir, "app.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  logLevel: "info",
};

async function copyAssets() {
  await mkdir(outDir, { recursive: true });
  await Promise.all([
    cp(path.join(clientDir, "index.html"), path.join(outDir, "index.html")),
    cp(path.join(clientDir, "styles.css"), path.join(outDir, "styles.css")),
  ]);
}

if (watchMode) {
  const ctx = await context(options);
  await ctx.watch();
  await copyAssets();

  let timer;
  for (const asset of ["index.html", "styles.css"]) {
    watchFile(path.join(clientDir, asset), () => {
      clearTimeout(timer);
      timer = setTimeout(() => void copyAssets(), 100);
    });
  }

  console.log("Watching the Mini App client. Run `pnpm dev` in another terminal.");
} else {
  await build(options);
  await copyAssets();
}
