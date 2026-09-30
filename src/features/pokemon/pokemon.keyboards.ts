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

export function createPokemonCarouselKeyboard(
  user: UserEntity,
  currentIndex: number,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const total = user.pokemons.length;
  const currentPokemon = user.pokemons[currentIndex];
  const userId = String(user.telegramId);

  // Row 1: Navigation
  if (total > 1) {
    const prevIndex = (currentIndex - 1 + total) % total;
    const nextIndex = (currentIndex + 1) % total;
    keyboard
      .text("◀ Prev", `pkmn:nav:${prevIndex}:${userId}`)
      .text(`${currentIndex + 1} / ${total}`, "pkmn:noop")
      .text("Next ▶", `pkmn:nav:${nextIndex}:${userId}`)
      .row();
  }

  // Row 2: Buddy Status & Action
  if (currentPokemon) {
    const isBuddy = user.buddyPokemonId === currentPokemon.id;
    if (isBuddy) {
      keyboard.text("⭐ Active Buddy", "pkmn:noop");
    } else if (currentPokemon.id !== null) {
      keyboard.text("⭐ Set as Buddy", `pkmn:buddy:${currentPokemon.id}:${currentIndex}:${userId}`);
    }
    keyboard.row();
  }

  // Row 3: Roster Overview toggle
  keyboard.text("📋 View Party Roster", `pkmn:roster:${currentIndex}:${userId}`);

  return keyboard;
}

export function createPartyRosterKeyboard(user: UserEntity, currentIndex: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const userId = String(user.telegramId);

  user.pokemons.forEach((p, idx) => {
    const isBuddy = user.buddyPokemonId === p.id;
    const star = isBuddy ? " ⭐" : "";
    const pName = p.nickname ?? p.name.charAt(0).toUpperCase() + p.name.slice(1);
    keyboard.text(`${idx + 1}. ${pName}${star}`, `pkmn:nav:${idx}:${userId}`);
    if (idx % 2 === 1) {
      keyboard.row();
    }
  });

  if (user.pokemons.length % 2 !== 0) {
    keyboard.row();
  }

  keyboard.text("🖼️ Back to Carousel", `pkmn:nav:${currentIndex}:${userId}`);
  return keyboard;
}
