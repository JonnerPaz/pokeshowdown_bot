import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import { EVOLVE_CAP } from "../../domain/data/constants.js";
import type {
  BasePokemonStats,
  PokeApiService,
} from "../../presentation/services/pokeapi.service.js";
import { formatTypeBadges, renderStat } from "../common/pokemonFormat.js";
import { escapeMarkdown } from "../common/stringHelper.js";

export function getPokemonFrontSprite(pokemon: PokemonEntity): string {
  return pokemon.isShiny ? pokemon.sprites.frontShiny : pokemon.sprites.frontDefault;
}

/** Battle level derived from how many times the pokemon has been caught. */
export function getPokemonLevel(timesCaught: number): number {
  return Math.min(100, 20 + timesCaught * 5);
}

/** Builds the Markdown caption used by `/pokemonsummary`. */
export function buildPokemonSummaryCaption(
  pokemon: PokemonEntity,
  baseStats: BasePokemonStats,
): string {
  const total =
    baseStats.hp +
    baseStats.attack +
    baseStats.defense +
    baseStats.specialAttack +
    baseStats.specialDefense +
    baseStats.speed;

  return [
    "📊 *POKÉMON SUMMARY*",
    `*Name:* ${escapeMarkdown(pokemon.name.toUpperCase())}`,
    `*Nickname:* ${pokemon.nickname ? escapeMarkdown(pokemon.nickname) : "None"}`,
    `*Shiny:* ${pokemon.isShiny ? "✨ Yes" : "No"}`,
    `*Type:* ${formatTypeBadges(pokemon.types)}`,
    `*Ability:* ${escapeMarkdown(pokemon.ability)}`,
    `*Caught:* ${pokemon.timesCaught}x`,
    `*Level:* ${getPokemonLevel(pokemon.timesCaught)}`,
    "",
    "📈 *Base Stats:*",
    `\`${renderStat("HP", baseStats.hp)}\``,
    `\`${renderStat("Attack", baseStats.attack)}\``,
    `\`${renderStat("Defense", baseStats.defense)}\``,
    `\`${renderStat("Sp.Atk", baseStats.specialAttack)}\``,
    `\`${renderStat("Sp.Def", baseStats.specialDefense)}\``,
    `\`${renderStat("Speed", baseStats.speed)}\``,
    `*Total:* ${total}`,
  ].join("\n");
}

export async function evolvePokemonOperation(
  pokemon: PokemonEntity,
  pokeApi: PokeApiService,
  pokemonDataSource: PokemonDataSource,
  ownerId?: number,
): Promise<PokemonEntity> {
  const evolvedPokemon = await pokeApi.evolvePokemon(pokemon);
  if (evolvedPokemon.name === pokemon.name) {
    return pokemon;
  }

  const remainingCaught = Math.max(0, pokemon.timesCaught - EVOLVE_CAP);

  // If the trainer already owns the evolved form (same shiny variant), merge the
  // catch counter into that row and drop the pre-evolution duplicate instead of
  // ending up with two rows sharing the same name.
  if (ownerId !== undefined) {
    const existing = await pokemonDataSource.findUserPokemonByNameAndVariant(
      ownerId,
      evolvedPokemon.name,
      pokemon.isShiny,
    );

    if (existing && existing.id !== pokemon.id) {
      const merged = await pokemonDataSource.updatePokemon(existing, {
        timesCaught: existing.timesCaught + 1 + remainingCaught,
      });
      if (pokemon.id !== null) {
        await pokemonDataSource.deletePokemon(pokemon);
      }
      return merged;
    }
  }

  return await pokemonDataSource.updatePokemon(pokemon, {
    name: evolvedPokemon.name,
    types: evolvedPokemon.types,
    ability: evolvedPokemon.ability,
    sprites: evolvedPokemon.sprites,
    isShiny: pokemon.isShiny,
    timesCaught: 1 + remainingCaught,
  });
}
