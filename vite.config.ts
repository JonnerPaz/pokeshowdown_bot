import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.join(projectRoot, "src", "presentation", "web", "client");

export default defineConfig({
  root: clientRoot,
  base: "/",
  publicDir: false,
  build: {
    outDir: path.join(projectRoot, "dist", "web"),
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
  },
});
