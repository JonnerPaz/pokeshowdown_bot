import { InlineKeyboard } from "grammy";
import type { UserEntity } from "../../domain/entities/users.entity.js";

export function createCatchKeyboard(user?: UserEntity): InlineKeyboard {
  const pokeCount = user ? ` (${user.pokeballs})` : "";
  const greatCount = user ? ` (${user.greatballs})` : "";
  const ultraCount = user ? ` (${user.ultraballs})` : "";
  const masterCount = user ? ` (${user.masterballs})` : "";

  return new InlineKeyboard()
    .text(`🔴 Pokéball${pokeCount}`, "catch:pokeball")
    .text(`🔵 Great Ball${greatCount}`, "catch:greatball")
    .row()
    .text(`🟡 Ultra Ball${ultraCount}`, "catch:ultraball")
    .text(`🟣 Master Ball${masterCount}`, "catch:masterball")
    .row()
    .text("🏃 Run", "catch:run");
}

export function createGroupCatchKeyboard(encounterId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔴 Pokéball", `gcatch:${encounterId}:pokeball`)
    .text("🔵 Great Ball", `gcatch:${encounterId}:greatball`)
    .row()
    .text("🟡 Ultra Ball", `gcatch:${encounterId}:ultraball`)
    .text("🟣 Master Ball", `gcatch:${encounterId}:masterball`);
}

export function createTradeInviteKeyboard(tradeId: string): InlineKeyboard {
  return new InlineKeyboard().text("Accept", `trade-accept:${tradeId}`);
}

export function createTradeConfirmKeyboard(tradeId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Accept", `trade-accept:${tradeId}`)
    .text("Reject", `trade-reject:${tradeId}`);
}
