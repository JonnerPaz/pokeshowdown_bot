import type { PokemonDataSource } from "../domain/datasource/pokemon.datasource.js";
import type { UserDataSource } from "../domain/datasource/user.datasource.js";
import { ArenaService } from "../features/arena/arena.service.js";
import type { ArenaRoom } from "../features/arena/arena.types.js";
import { BattleService } from "../features/battle/battle.service.js";
import { GroupEncounterService } from "../features/pokemon/groupEncounter.service.js";
import { PokemonDataSourceImpl } from "../infrastructure/datasource/pokemon.datasource.impl.js";
import { UserDataSourceImpl } from "../infrastructure/datasource/user.datasource.impl.js";
import { PokeApiService } from "./services/pokeapi.service.js";
import { RateLimiterService } from "./services/rateLimiter.service.js";

/**
 * Long-lived collaborators shared by the Telegram bot and the web layer.
 * Both entry points must use the same instances so state (rate limits,
 * group encounters, arena rooms, datasource connections) is not duplicated.
 */
export interface AppDeps {
  userDataSource: UserDataSource;
  pokemonDataSource: PokemonDataSource;
  pokeApi: PokeApiService;
  rateLimiter: RateLimiterService;
  battleService: BattleService;
  groupEncounterService: GroupEncounterService;
  arena: ArenaService | null;
  webAppUrl: string | undefined;
}

export interface AppDepsOverrides {
  userDataSource?: UserDataSource | undefined;
  pokemonDataSource?: PokemonDataSource | undefined;
  pokeApi?: PokeApiService | undefined;
  rateLimiter?: RateLimiterService | undefined;
  battleService?: BattleService | undefined;
  groupEncounterService?: GroupEncounterService | undefined;
  arena?: ArenaService | null | undefined;
  webAppUrl?: string | undefined;
  turnTimeoutMs?: number | undefined;
  onBattleFinished?: ((room: ArenaRoom) => Promise<void> | void) | undefined;
}

export function createAppDeps(overrides: AppDepsOverrides = {}): AppDeps {
  const userDataSource = overrides.userDataSource ?? new UserDataSourceImpl();
  const pokemonDataSource = overrides.pokemonDataSource ?? new PokemonDataSourceImpl();
  const pokeApi = overrides.pokeApi ?? new PokeApiService();
  const rateLimiter = overrides.rateLimiter ?? new RateLimiterService();
  const battleService =
    overrides.battleService ?? new BattleService(pokeApi, userDataSource, pokemonDataSource);
  const groupEncounterService = overrides.groupEncounterService ?? new GroupEncounterService();
  const webAppUrl = overrides.webAppUrl;
  const arena =
    overrides.arena !== undefined
      ? overrides.arena
      : webAppUrl
        ? new ArenaService({
            battleService,
            ...(overrides.turnTimeoutMs !== undefined
              ? { turnTimeoutMs: overrides.turnTimeoutMs }
              : {}),
            ...(overrides.onBattleFinished ? { onFinished: overrides.onBattleFinished } : {}),
          })
        : null;

  return {
    userDataSource,
    pokemonDataSource,
    pokeApi,
    rateLimiter,
    battleService,
    groupEncounterService,
    arena,
    webAppUrl,
  };
}
