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

  const statusDisplay = isBuddy ? "⭐ Active Companion Buddy" : "🎒 Party Member";

  return (
    `🎒 *Your Pokémon Party* (${index + 1}/${total})\n` +
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

export function formatPartyRosterText(user: UserEntity): string {
  const total = user.pokemons.length;
  const username = escapeMarkdown(user.username);
  let text = `🎒 *Trainer @${username}'s Party* (${total}/6)\n────────────────────────\n`;

  user.pokemons.forEach((p, idx) => {
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

  const buddy = user.pokemons.find((p) => p.id === user.buddyPokemonId) ?? user.pokemons[0];
  const buddyName = buddy
    ? escapeMarkdown(buddy.nickname ? `${buddy.nickname} (${buddy.name})` : buddy.name)
    : "None";

  text += `────────────────────────\n⭐ *Buddy:* ${buddyName} • 🏆 *Record:* ${user.wins}W - ${user.losses}L`;
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
