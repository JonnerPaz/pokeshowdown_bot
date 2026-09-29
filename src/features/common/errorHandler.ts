import type { AppContext } from "../../presentation/data/types.js";

export async function displayCommandError<T extends AppContext>(e: Error, ctx: T, msg?: string) {
  const username = ctx.from?.username ?? ctx.chat?.id?.toString() ?? "unknown";
  console.error("command failed", { username, error: e.message, cause: e.cause });
  return msg ? ctx.reply(msg) : ctx.reply("There was an error during request. Please report it");
}
