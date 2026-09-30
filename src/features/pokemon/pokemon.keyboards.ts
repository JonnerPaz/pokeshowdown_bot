import { InlineKeyboard } from "grammy";
import type { UserEntity } from "../../domain/entities/users.entity.js";

import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import { MAX_PKMN_PARTY } from "../../domain/data/constants.js";

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
  viewMode: "party" | "box" = "party",
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const list = viewMode === "party" ? user.party : user.box;
  const total = list.length;
  const currentPokemon = list[currentIndex];
  const userId = String(user.telegramId);

  // Row 1: Navigation
  if (total > 1) {
    const prevIndex = (currentIndex - 1 + total) % total;
    const nextIndex = (currentIndex + 1) % total;
    keyboard
      .text("◀ Prev", `pkmn:nav:${viewMode}:${prevIndex}:${userId}`)
      .text(`${currentIndex + 1} / ${total}`, "pkmn:noop")
      .text("Next ▶", `pkmn:nav:${viewMode}:${nextIndex}:${userId}`)
      .row();
  }

  // Row 2: Buddy Status & Storage Actions
  if (currentPokemon && currentPokemon.id !== null) {
    const isBuddy = user.buddyPokemonId === currentPokemon.id;
    if (isBuddy) {
      keyboard.text("⭐ Active Buddy", "pkmn:noop");
    } else {
      keyboard.text(
        "⭐ Set as Buddy",
        `pkmn:buddy:${currentPokemon.id}:${currentIndex}:${viewMode}:${userId}`,
      );
    }

    if (viewMode === "party") {
      // Can deposit if party has > 1 member
      if (user.party.length > 1) {
        keyboard.text("⬇️ Send to Box", `pkmn:deposit:${currentPokemon.id}:${userId}`);
      }
    } else {
      // In box: withdraw or swap
      if (user.party.length < MAX_PKMN_PARTY) {
        keyboard.text("⬆️ Move to Party", `pkmn:withdraw:${currentPokemon.id}:${userId}`);
      } else {
        keyboard.text("🔄 Swap with Party", `pkmn:swap:pick:${currentPokemon.id}:${userId}`);
      }
    }

    if (user.pokemons.length > 1) {
      keyboard.text(
        "👋 Release",
        `pkmn:rel:ask:${currentPokemon.id}:${currentIndex}:${viewMode}:${userId}`,
      );
    }

    keyboard.row();
  }

  // Row 3: View Mode Switch & Roster
  if (viewMode === "party") {
    if (user.box.length > 0) {
      keyboard
        .text(`📦 View Storage Box (${user.box.length})`, `pkmn:switch:box:0:${userId}`)
        .row();
    }
    keyboard.text("📋 View Party Roster", `pkmn:roster:${currentIndex}:${userId}`);
  } else {
    keyboard.text(
      `🎒 View Battle Party (${user.party.length}/${MAX_PKMN_PARTY})`,
      `pkmn:switch:party:0:${userId}`,
    );
  }

  return keyboard;
}

export function createPartyRosterKeyboard(user: UserEntity, currentIndex: number): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const userId = String(user.telegramId);
  const partyList = user.party.length > 0 ? user.party : user.pokemons;

  partyList.forEach((p, idx) => {
    const isBuddy = user.buddyPokemonId === p.id;
    const star = isBuddy ? " ⭐" : "";
    const pName = p.nickname ?? p.name.charAt(0).toUpperCase() + p.name.slice(1);
    keyboard.text(`${idx + 1}. ${pName}${star}`, `pkmn:nav:party:${idx}:${userId}`);
    if (idx % 2 === 1) {
      keyboard.row();
    }
  });

  if (partyList.length % 2 !== 0) {
    keyboard.row();
  }

  keyboard.text("🖼️ Back to Carousel", `pkmn:nav:party:${currentIndex}:${userId}`);
  return keyboard;
}

export function createSwapPartyKeyboard(
  boxPokemonId: number,
  partyPokemons: PokemonEntity[],
  userId: string,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  partyPokemons.forEach((p, idx) => {
    const pName = p.nickname ?? p.name.charAt(0).toUpperCase() + p.name.slice(1);
    keyboard.text(`${idx + 1}. ${pName}`, `pkmn:swap:do:${boxPokemonId}:${p.id}:${userId}`);
    if (idx % 2 === 1) {
      keyboard.row();
    }
  });

  if (partyPokemons.length % 2 !== 0) {
    keyboard.row();
  }

  keyboard.text("❌ Cancel", `pkmn:switch:box:0:${userId}`);
  return keyboard;
}

export function createReleasePickKeyboard(user: UserEntity): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const userId = String(user.telegramId);

  user.pokemons.forEach((p, idx) => {
    const isBuddy = user.buddyPokemonId === p.id;
    const star = isBuddy ? " ⭐" : "";
    const shiny = p.isShiny ? " ✨" : "";
    const pName = p.nickname ?? p.name.charAt(0).toUpperCase() + p.name.slice(1);
    const boxTag = !p.isInParty ? " [Box]" : "";
    keyboard.text(
      `${idx + 1}. ${pName}${shiny}${star}${boxTag}`,
      `pkmn:rel:ask:${p.id}:0:party:${userId}`,
    );
    if (idx % 2 === 1) {
      keyboard.row();
    }
  });

  if (user.pokemons.length % 2 !== 0) {
    keyboard.row();
  }

  keyboard.text("❌ Cancel", `pkmn:nav:party:0:${userId}`);
  return keyboard;
}

export function createReleaseConfirmKeyboard(
  pokemonId: number,
  currentIndex: number,
  viewMode: "party" | "box",
  userId: string,
): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Confirm Release", `pkmn:rel:do:${pokemonId}:${currentIndex}:${viewMode}:${userId}`)
    .text("❌ Cancel", `pkmn:nav:${viewMode}:${currentIndex}:${userId}`);
}
