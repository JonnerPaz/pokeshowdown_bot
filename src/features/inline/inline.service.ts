import type { PokedexEntryData } from "../../presentation/services/pokeapi.service.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import { getPokemonTypeDisplay, getPokemonLevel } from "../pokemon/pokemon.service.js";
import { escapeMarkdown } from "../common/stringHelper.js";

export function formatInlinePokedexCard(entry: PokedexEntryData): string {
  const titleName = escapeMarkdown(entry.name.charAt(0).toUpperCase() + entry.name.slice(1));
  const typesDisplay = getPokemonTypeDisplay(entry.types);
  const abilityDisplay = escapeMarkdown(
    entry.ability.charAt(0).toUpperCase() + entry.ability.slice(1),
  );
  const flavorText = entry.flavorText
    ? escapeMarkdown(entry.flavorText)
    : "No Pokédex description available.";

  return (
    `📖 *Pokédex Entry #${entry.id}: ${titleName}*\n` +
    `────────────────────────\n` +
    `🏷️ *Type:* ${typesDisplay}\n` +
    `🛡️ *Ability:* ${abilityDisplay}\n` +
    `📏 *Height:* ${entry.heightM.toFixed(1)} m | ⚖️ *Weight:* ${entry.weightKg.toFixed(1)} kg\n` +
    `────────────────────────\n` +
    `📊 *Base Stats:*\n` +
    `• HP: \`${entry.stats.hp}\` | Atk: \`${entry.stats.attack}\` | Def: \`${entry.stats.defense}\`\n` +
    `• Sp.Atk: \`${entry.stats.specialAttack}\` | Sp.Def: \`${entry.stats.specialDefense}\` | Spe: \`${entry.stats.speed}\`\n` +
    `────────────────────────\n` +
    `💬 *Lore:*\n` +
    `_${flavorText}_\n\n` +
    `🎮 _Play with Pokémon on @PokeShowdownBot!_`
  );
}

export function formatInlineBuddyCard(user: UserEntity, buddy: PokemonEntity): string {
  const username = escapeMarkdown(user.username);
  const rawDisplayName = buddy.nickname
    ? `${buddy.nickname} (${buddy.name.charAt(0).toUpperCase() + buddy.name.slice(1)})`
    : buddy.name.charAt(0).toUpperCase() + buddy.name.slice(1);
  const displayName = escapeMarkdown(rawDisplayName);
  const shinyBadge = buddy.isShiny ? " ✨" : "";
  const level = getPokemonLevel(buddy.timesCaught);
  const typesDisplay = getPokemonTypeDisplay(buddy.types);
  const abilityDisplay = escapeMarkdown(
    buddy.ability.charAt(0).toUpperCase() + buddy.ability.slice(1),
  );

  const totalBattles = user.wins + user.losses;
  const winRate =
    totalBattles > 0 ? `${Math.round((user.wins / totalBattles) * 100)}%` : "N/A (0 battles)";

  return (
    `⭐ *Trainer ${username}'s Companion Buddy* ⭐\n` +
    `────────────────────────\n` +
    `🐾 *${displayName}*${shinyBadge} (Lv. ${level})\n` +
    `🏷️ *Type:* ${typesDisplay}\n` +
    `🛡️ *Ability:* ${abilityDisplay}\n` +
    `🎯 *Times Caught:* ${buddy.timesCaught}x\n` +
    `────────────────────────\n` +
    `⚔️ *Trainer Battle Record:*\n` +
    `🏆 Wins: \`${user.wins}\` | ❌ Losses: \`${user.losses}\` | 📈 Win Rate: \`${winRate}\`\n\n` +
    `🎮 _Battle and collect with @PokeShowdownBot!_`
  );
}

export function formatInlineTeamCard(user: UserEntity): string {
  const username = escapeMarkdown(user.username);
  const party = user.pokemons.slice(0, 6);

  if (party.length === 0) {
    return `🎒 *Trainer ${username}'s Party*\n\n_No Pokémon caught yet!_`;
  }

  const lines = party.map((pkmn, idx) => {
    const isBuddy = user.buddyPokemonId === pkmn.id;
    const buddyBadge = isBuddy ? "⭐ " : "";
    const shiny = pkmn.isShiny ? " ✨" : "";
    const name = escapeMarkdown(
      pkmn.nickname
        ? `${pkmn.nickname} (${pkmn.name.charAt(0).toUpperCase() + pkmn.name.slice(1)})`
        : pkmn.name.charAt(0).toUpperCase() + pkmn.name.slice(1),
    );
    const level = getPokemonLevel(pkmn.timesCaught);
    const types = getPokemonTypeDisplay(pkmn.types);
    return `${idx + 1}\\. ${buddyBadge}*${name}*${shiny} \\(Lv\\. ${level}\\) — ${types}`;
  });

  return (
    `🎒 *Trainer ${username}'s Active Party* (${user.pokemons.length} owned)\n` +
    `────────────────────────\n` +
    lines.join("\n") +
    `\n────────────────────────\n` +
    `🎮 _Play on Telegram: @PokeShowdownBot_`
  );
}
