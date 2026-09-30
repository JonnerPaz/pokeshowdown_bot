import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import { EVOLVE_CAP } from "../../domain/data/constants.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";
import { escapeMarkdown } from "../common/stringHelper.js";

export const TYPE_EMOJIS: Record<string, string> = {
  normal: "⚪ Normal",
  fire: "🔥 Fire",
  water: "💧 Water",
  grass: "🌿 Grass",
  electric: "⚡ Electric",
  ice: "❄️ Ice",
  fighting: "🥊 Fighting",
  poison: "☠️ Poison",
  ground: "🏜️ Ground",
  flying: "🦅 Flying",
  psychic: "🔮 Psychic",
  bug: "🐛 Bug",
  rock: "🪨 Rock",
  ghost: "👻 Ghost",
  dragon: "🐉 Dragon",
  steel: "⚙️ Steel",
  dark: "🌑 Dark",
  fairy: "✨ Fairy",
};

export function getPokemonTypeDisplay(types: string[]): string {
  return types
    .map((t) => {
      const lower = t.toLowerCase();
      return TYPE_EMOJIS[lower] ?? `🏷️ ${t.charAt(0).toUpperCase() + t.slice(1)}`;
    })
    .join(" / ");
}

export function getPokemonLevel(timesCaught: number): number {
  return Math.min(100, 20 + timesCaught * 5);
}

export function formatPokemonCarouselCard(
  pokemon: PokemonEntity,
  user: UserEntity,
  index: number,
  total: number,
  viewMode: "party" | "box" = "party",
): string {
  const isBuddy = user.buddyPokemonId === pokemon.id;
  const buddyPrefix = isBuddy ? "⭐ " : "";
  const shinyBadge = pokemon.isShiny ? " ✨" : "";
  const rawDisplayName = pokemon.nickname
    ? `${pokemon.nickname} (${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)})`
    : pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  const displayName = escapeMarkdown(rawDisplayName);
  const level = getPokemonLevel(pokemon.timesCaught);
  const typesDisplay = getPokemonTypeDisplay(pokemon.types);
  const abilityDisplay = escapeMarkdown(
    pokemon.ability.charAt(0).toUpperCase() + pokemon.ability.slice(1),
  );

  const evolutionSection =
    pokemon.timesCaught >= EVOLVE_CAP
      ? `🧬 *Evolution:* Ready to evolve! (/evolve)`
      : `🧬 *Evolution:* ${pokemon.timesCaught}/${EVOLVE_CAP} catches (${EVOLVE_CAP - pokemon.timesCaught} more needed)`;

  const headerTitle = viewMode === "box" ? `📦 *Your PC Storage Box*` : `🎒 *Your Pokémon Party*`;
  const statusDisplay = isBuddy
    ? `⭐ Active Companion Buddy${viewMode === "box" ? " (Boxed)" : ""}`
    : viewMode === "box"
      ? "📦 Stored in Box"
      : "🎒 Battle Party Member";

  return (
    `${headerTitle} (${index + 1}/${total})\n` +
    `${buddyPrefix}*${displayName}*${shinyBadge} (Lv. ${level})\n` +
    `────────────────────────\n` +
    `🏷️ *Type:* ${typesDisplay}\n` +
    `🛡️ *Ability:* ${abilityDisplay}\n` +
    `🎯 *Catches:* ${pokemon.timesCaught}x\n` +
    `${evolutionSection}\n` +
    `📌 *Status:* ${statusDisplay}\n` +
    `────────────────────────`
  );
}

export function formatSwapPrompt(boxPokemon: PokemonEntity): string {
  const pName = boxPokemon.nickname
    ? `${boxPokemon.nickname} (${boxPokemon.name.charAt(0).toUpperCase() + boxPokemon.name.slice(1)})`
    : boxPokemon.name.charAt(0).toUpperCase() + boxPokemon.name.slice(1);
  return (
    `🔄 *Swap Pokémon with Battle Party*\n────────────────────────\n` +
    `Your battle party is currently full (6/6).\n\n` +
    `Which party member would you like to send to the *PC Storage Box* to make room for *${escapeMarkdown(pName)}*?`
  );
}

export function formatPartyRosterText(user: UserEntity): string {
  const partyList = user.party.length > 0 ? user.party : user.pokemons;
  const total = partyList.length;
  const username = escapeMarkdown(user.username);
  let text = `🎒 *Trainer @${username}'s Party* (${total}/6)\n────────────────────────\n`;

  partyList.forEach((p, idx) => {
    const isBuddy = user.buddyPokemonId === p.id;
    const buddyStar = isBuddy ? "⭐ " : "";
    const shinyStar = p.isShiny ? " ✨" : "";
    const pName = p.nickname
      ? `${p.nickname} (${p.name.charAt(0).toUpperCase() + p.name.slice(1)})`
      : p.name.charAt(0).toUpperCase() + p.name.slice(1);
    const escapedName = escapeMarkdown(pName);
    const level = getPokemonLevel(p.timesCaught);
    const types = getPokemonTypeDisplay(p.types);
    const evolveBadge = p.timesCaught >= EVOLVE_CAP ? " • 🧬 Ready!" : "";

    text += `${idx + 1}. ${buddyStar}*${escapedName}*${shinyStar} • Lv. ${level}${evolveBadge}\n`;
    text += `   ${types} • 🛡️ ${escapeMarkdown(p.ability)} • ${p.timesCaught}x caught\n\n`;
  });

  const buddy = user.pokemons.find((p) => p.id === user.buddyPokemonId) ?? partyList[0];
  const buddyName = buddy
    ? escapeMarkdown(buddy.nickname ? `${buddy.nickname} (${buddy.name})` : buddy.name)
    : "None";

  const boxCount = user.box.length;
  const boxNotice = boxCount > 0 ? `\n📦 *PC Storage Box:* ${boxCount} Pokémon stored (/box)` : "";

  text += `────────────────────────\n⭐ *Buddy:* ${buddyName} • 🏆 *Record:* ${user.wins}W - ${user.losses}L${boxNotice}`;
  return text;
}

export function getPokemonFrontSprite(pokemon: PokemonEntity): string {
  return pokemon.isShiny ? pokemon.sprites.frontShiny : pokemon.sprites.frontDefault;
}

export async function evolvePokemonOperation(
  pokemon: PokemonEntity,
  pokeApi: PokeApiService,
  pokemonDataSource: PokemonDataSource,
): Promise<PokemonEntity> {
  const evolvedPokemon = await pokeApi.evolvePokemon(pokemon);
  if (evolvedPokemon.name === pokemon.name) {
    return pokemon;
  }

  const updatedPokemon = await pokemonDataSource.updatePokemon(pokemon, {
    name: evolvedPokemon.name,
    types: evolvedPokemon.types,
    ability: evolvedPokemon.ability,
    sprites: evolvedPokemon.sprites,
    isShiny: pokemon.isShiny,
    timesCaught: Math.max(0, pokemon.timesCaught - EVOLVE_CAP),
  });
  return updatedPokemon;
}

export function getReleaseReward(pokemon: PokemonEntity): {
  pokeballs: number;
  greatballs: number;
  text: string;
} {
  if (pokemon.isShiny) {
    return {
      pokeballs: 5,
      greatballs: 1,
      text: "+5 🔴 Pokéballs & +1 🔵 Great Ball ✨",
    };
  }
  return {
    pokeballs: 3,
    greatballs: 0,
    text: "+3 🔴 Pokéballs",
  };
}

export function formatReleaseConfirmationPrompt(pokemon: PokemonEntity): string {
  const pName = pokemon.nickname
    ? `${pokemon.nickname} (${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)})`
    : pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  const reward = getReleaseReward(pokemon);
  const level = getPokemonLevel(pokemon.timesCaught);
  const shinyMark = pokemon.isShiny ? " ✨" : "";

  return (
    `👋 *Release Pokémon Confirmation*\n────────────────────────\n` +
    `Are you sure you want to release *${escapeMarkdown(pName)}*${shinyMark} (Lv. ${level}) back into the wild?\n\n` +
    `🎁 *Professor Oak's Research Grant:* ${reward.text}\n` +
    `⚠️ *Warning:* This action is irreversible! Once released, this Pokémon cannot be recovered.`
  );
}

export function formatReleasePickPrompt(): string {
  return (
    `👋 *Release Pokémon into the Wild*\n────────────────────────\n` +
    `Select which Pokémon you want to transfer to Professor Oak for research data.\n\n` +
    `🎁 *Rewards:* Freeing a Pokémon rewards you with Pokéballs (+3 for normal, +5 & Great Ball for shiny)!`
  );
}
