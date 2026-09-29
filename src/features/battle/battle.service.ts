import type { BattlePokemonStats } from "../../domain/battle/types.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";

export class BattleService {
  constructor(
    private readonly pokeApi: PokeApiService,
    private readonly userDataSource: UserDataSource,
    private readonly pokemonDataSource: PokemonDataSource,
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
    const user = await this.userDataSource.findUserByTelegramId(winnerTelegramId);
    if (!user) return null;

    await this.userDataSource.updateUser(user, {
      wins: user.wins + 1,
    });

    const winningPokemon = user.pokemons.find((p) => p.id === pokemonId);
    if (!winningPokemon) return null;

    return await this.pokemonDataSource.updatePokemon(winningPokemon, {
      timesCaught: winningPokemon.timesCaught + 1,
    });
  }

  public async recordBattleOutcome(
    winnerTelegramId: number | bigint,
    loserTelegramId: number | bigint,
    winningPokemonId?: number,
  ): Promise<{
    winner: UserEntity | null;
    loser: UserEntity | null;
    upgradedPokemon: PokemonEntity | null;
  }> {
    const winner = await this.userDataSource.findUserByTelegramId(winnerTelegramId);
    const loser = await this.userDataSource.findUserByTelegramId(loserTelegramId);

    let updatedWinner: UserEntity | null = null;
    let updatedLoser: UserEntity | null = null;
    let upgradedPokemon: PokemonEntity | null = null;

    if (winner) {
      updatedWinner = await this.userDataSource.updateUser(winner, {
        wins: winner.wins + 1,
      });

      if (winningPokemonId) {
        const winningPokemon = winner.pokemons.find((p) => p.id === winningPokemonId);
        if (winningPokemon) {
          upgradedPokemon = await this.pokemonDataSource.updatePokemon(winningPokemon, {
            timesCaught: winningPokemon.timesCaught + 1,
          });
        }
      }
    }

    if (loser) {
      updatedLoser = await this.userDataSource.updateUser(loser, {
        losses: loser.losses + 1,
      });
    }

    return { winner: updatedWinner, loser: updatedLoser, upgradedPokemon };
  }
}
