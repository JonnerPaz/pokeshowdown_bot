import { PokemonBuilder } from "../../domain/entities/PokemonBuilder.entity.js";
import { SHINY_ODDS, TOTAL_OF_POKEMON } from "../../domain/data/constants.js";
import { EvolutionClient, MemoryCache, type Pokemon, PokemonClient } from "pokenode-ts";
import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";

interface EncounterConfig {
  shinyOdds: number;
  spawnPoolSize: number;
}

export class PokeApiService {
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000;
  private api: PokemonClient;
  private evolution: EvolutionClient;
  private encounterConfig: EncounterConfig;
  constructor() {
    const cache = new MemoryCache({ ttl: PokeApiService.CACHE_TTL_MS });
    this.api = new PokemonClient({ cache });
    this.evolution = new EvolutionClient({ cache });
    this.encounterConfig = PokeApiService.resolveEncounterConfig();
  }

  public async createStarterPokemon(): Promise<[PokemonEntity, PokemonEntity, PokemonEntity]> {
    // Creates a random ID array with 3 random numbers
    const starterList = [
      "bulbasaur",
      "charmander",
      "squirtle",
      "chikorita",
      "cyndaquil",
      "totodile",
      "treecko",
      "torchic",
      "mudkip",
      "turtwig",
      "chimchar",
      "piplup",
      "snivy",
      "tepig",
      "oshawott",
      "chespin",
      "fennekin",
      "froakie",
      "rowlet",
      "litten",
      "popplio",
    ];

    const uniqueNames = new Set<string>();
    const SELECTION_SIZE = 3;
    while (uniqueNames.size < SELECTION_SIZE) {
      const pokemonName = this.randomizer(starterList);
      if (typeof pokemonName === "string" && !uniqueNames.has(pokemonName)) {
        uniqueNames.add(pokemonName);
      }
    }

    const [p1, p2, p3] = [...uniqueNames].map((name) => this.createPokemon(name));

    const [starter, starter2, starter3] = (await Promise.all([p1, p2, p3])) as [
      PokemonEntity,
      PokemonEntity,
      PokemonEntity,
    ];

    return [starter, starter2, starter3];
  }

  public async createPokemon(pokemon?: string | number): Promise<PokemonEntity> {
    if (pokemon && typeof pokemon === "string") {
      const requestPokemon = await this.api.getPokemonByName(pokemon);
      return this.buildPokemon(requestPokemon);
    }

    if (pokemon && typeof pokemon === "number") {
      const requestPokemon = await this.api.getPokemonById(pokemon);
      return this.buildPokemon(requestPokemon);
    }

    // get a random pokemon
    const requestPokemon = await this.api.getPokemonById(this.randomizer());
    return this.buildPokemon(requestPokemon, this.rollForShiny());
  }

  public async evolvePokemon(pokemon: PokemonEntity): Promise<PokemonEntity> {
    const pokemonToEvolve = await this.api.getPokemonSpeciesByName(pokemon.name);
    if (!pokemonToEvolve.evolution_chain?.url) {
      return pokemon;
    }

    const evoQuery = +pokemonToEvolve.evolution_chain.url.split("/").at(-2)!;
    const { chain } = await this.evolution.getEvolutionChainById(evoQuery);

    let nextSpeciesName: string | undefined;

    if (pokemon.name === chain.species.name) {
      if (chain.evolves_to.length > 0) {
        const branch = chain.evolves_to[Math.floor(Math.random() * chain.evolves_to.length)];
        nextSpeciesName = branch?.species.name;
      }
    } else {
      const currentBranch = chain.evolves_to.find((e) => e.species.name === pokemon.name);
      if (currentBranch && currentBranch.evolves_to.length > 0) {
        const nextBranch =
          currentBranch.evolves_to[Math.floor(Math.random() * currentBranch.evolves_to.length)];
        nextSpeciesName = nextBranch?.species.name;
      }
    }

    if (!nextSpeciesName) {
      return pokemon;
    }

    return await this.createPokemon(nextSpeciesName);
  }

  /**
   * Rolls a random number to determine if the pokemon is shiny
   */
  private rollForShiny(): boolean {
    return Math.floor(Math.random() * this.encounterConfig.shinyOdds) === 0;
  }

  private buildPokemon(pokemon: Pokemon, isShiny = false): PokemonEntity {
    const builder = new PokemonBuilder();
    const frontDefault =
      pokemon.sprites.other?.["official-artwork"]?.front_default ??
      pokemon.sprites.front_default ??
      "";
    const frontShiny = pokemon.sprites.front_shiny ?? frontDefault;
    const backDefault = pokemon.sprites.back_default ?? frontDefault;
    const backShiny = pokemon.sprites.back_shiny ?? frontShiny;

    return builder
      .setName(pokemon.name)
      .setTypes(pokemon.types.map((type) => type.type.name))
      .setAbility(pokemon.abilities[0]?.ability?.name ?? "unknown")
      .setShiny(isShiny)
      .setSprite({
        frontShiny,
        frontDefault,
        backShiny,
        backDefault,
      })
      .build();
  }

  private randomizer<T>(array?: T[]): T | number {
    if (Array.isArray(array) && array.length > 0) {
      // gets a random number from an array
      return array.at(Math.floor(Math.random() * array.length)) ?? 0;
    }
    return Math.floor(Math.random() * this.encounterConfig.spawnPoolSize + 1);
  }

  private static resolveEncounterConfig(): EncounterConfig {
    return {
      shinyOdds: PokeApiService.readPositiveInt(process.env.SHINY_ODDS, SHINY_ODDS),
      spawnPoolSize: PokeApiService.readPositiveInt(process.env.SPAWN_POOL_SIZE, TOTAL_OF_POKEMON),
    };
  }

  private static readPositiveInt(raw: string | undefined, fallback: number): number {
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
