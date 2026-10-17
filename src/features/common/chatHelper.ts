import type { AppContext } from "../../presentation/data/types.js";

/** True when the update originates from a group or supergroup chat. */
export function isGroupChat(ctx: AppContext): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}
