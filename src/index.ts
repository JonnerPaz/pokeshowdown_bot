import "dotenv/config";
import { AppContainer } from "./app.container.js";

async function main() {
  return await AppContainer.setup();
}

await main();
