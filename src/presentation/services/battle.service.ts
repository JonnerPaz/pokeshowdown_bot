import type { BattlePokemonStats } from "../../domain/battle/types.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { DBService } from "./db.service.js";
import type { PokeApiService } from "./pokeapi.service.js";

export class BattleService {
  constructor(
    private readonly pokeApi: PokeApiService,
    private readonly dbService: DBService,
  ) {}

  public async resolveBattlePokemon(pokemon: PokemonEntity): Promise<BattlePokemonStats> {
    const baseStats = await this.pokeApi.getPokemonBaseStats(pokemon.name);
    const level = Math.min(100, 20 + pokemon.timesCaught * 5);

    const maxHp = Math.floor(((baseStats.hp * 2 + 50) * level) / 100) + 10;
    const attack = Math.floor((baseStats.attack * 2 * level) / 100) + 5;
    const defense = Math.floor((baseStats.defense * 2 * level) / 100) + 5;
    const specialAttack = Math.floor((baseStats.specialAttack * 2 * level) / 100) + 5;
    const specialDefense = Math.floor((baseStats.specialDefense * 2 * level) / 100) + 5;
    const speed = Math.floor((baseStats.speed * 2 * level) / 100) + 5;

    const primaryType = pokemon.types[0] ?? "normal";
    const spriteUrl = pokemon.isShiny ? pokemon.sprites.frontShiny : pokemon.sprites.frontDefault;

    return {
      id: pokemon.id,
      name: pokemon.nickname ?? pokemon.name,
      nickname: pokemon.nickname,
      types: pokemon.types,
      primaryType,
      currentHp: maxHp,
      maxHp,
      attack,
      defense,
      specialAttack,
      specialDefense,
      speed,
      isDefending: false,
      isCharged: false,
      isShiny: pokemon.isShiny,
      timesCaught: pokemon.timesCaught,
      spriteUrl: spriteUrl || undefined,
    };
  }

  public async awardVictory(
    winnerTelegramId: number | bigint,
    pokemonId: number,
  ): Promise<PokemonEntity | null> {
    const user = await this.dbService.findUserByTelegramId(winnerTelegramId);
    if (!user) return null;

    const winningPokemon = user.pokemons.find((p) => p.id === pokemonId);
    if (!winningPokemon) return null;

    return await this.dbService.updatePokemon(winningPokemon, {
      timesCaught: winningPokemon.timesCaught + 1,
    });
  }
}
