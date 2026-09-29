import { InlineKeyboard } from "grammy";

export function createCatchKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("Catch", "catch");
}

export function createTradeInviteKeyboard(tradeId: string): InlineKeyboard {
  return new InlineKeyboard().text("Accept", `trade-accept:${tradeId}`);
}

export function createTradeConfirmKeyboard(tradeId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("Accept", `trade-accept:${tradeId}`)
    .text("Reject", `trade-reject:${tradeId}`);
}
