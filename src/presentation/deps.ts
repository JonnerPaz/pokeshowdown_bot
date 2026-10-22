import type { UserDataSource } from "../domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../domain/datasource/pokemon.datasource.js";
import { UserDataSourceImpl } from "../infrastructure/datasource/user.datasource.impl.js";
import { PokemonDataSourceImpl } from "../infrastructure/datasource/pokemon.datasource.impl.js";
import { BattleService } from "../features/battle/battle.service.js";
import { GroupEncounterService } from "../features/pokemon/groupEncounter.service.js";
import { PokeApiService } from "./services/pokeapi.service.js";
import { RateLimiterService } from "./services/rateLimiter.service.js";

/**
 * Long-lived collaborators shared by the Telegram bot and the web layer.
 * Both entry points must use the same instances so state (rate limits,
 * group encounters, datasource connections) is not duplicated.
 */
export interface AppDeps {
  userDataSource: UserDataSource;
  pokemonDataSource: PokemonDataSource;
  pokeApi: PokeApiService;
  rateLimiter: RateLimiterService;
  battleService: BattleService;
  groupEncounterService: GroupEncounterService;
}

export interface AppDepsOverrides {
  userDataSource?: UserDataSource | undefined;
  pokemonDataSource?: PokemonDataSource | undefined;
  pokeApi?: PokeApiService | undefined;
  rateLimiter?: RateLimiterService | undefined;
  battleService?: BattleService | undefined;
  groupEncounterService?: GroupEncounterService | undefined;
}

export function createAppDeps(overrides: AppDepsOverrides = {}): AppDeps {
  const userDataSource = overrides.userDataSource ?? new UserDataSourceImpl();
  const pokemonDataSource = overrides.pokemonDataSource ?? new PokemonDataSourceImpl();
  const pokeApi = overrides.pokeApi ?? new PokeApiService();
  const rateLimiter = overrides.rateLimiter ?? new RateLimiterService();
  const battleService =
    overrides.battleService ?? new BattleService(pokeApi, userDataSource, pokemonDataSource);
  const groupEncounterService = overrides.groupEncounterService ?? new GroupEncounterService();

  return {
    userDataSource,
    pokemonDataSource,
    pokeApi,
    rateLimiter,
    battleService,
    groupEncounterService,
  };
}
