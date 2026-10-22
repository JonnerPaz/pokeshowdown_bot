import { vi } from "vitest";

import type { BattlePokemonStats } from "../../src/domain/battle/types.js";
import type { PokemonEntity } from "../../src/domain/entities/pokemon.entity.js";
import { ArenaService } from "../../src/features/arena/arena.service.js";

export function makeBattleStats(
  pokemon: PokemonEntity,
  overrides: Partial<BattlePokemonStats> = {},
): BattlePokemonStats {
  return {
    id: pokemon.id,
    name: pokemon.name,
    types: [...pokemon.types],
    primaryType: pokemon.types[0] ?? "normal",
    currentHp: 100,
    maxHp: 100,
    attack: 50,
    defense: 50,
    specialAttack: 50,
    specialDefense: 50,
    speed: 50,
    isDefending: false,
    isCharged: false,
    isShiny: pokemon.isShiny,
    timesCaught: pokemon.timesCaught,
    spriteUrl: pokemon.sprites.frontDefault,
    ...overrides,
  };
}

export function createArenaPort(overrides: Partial<BattlePokemonStats> = {}) {
  return {
    resolveBattlePokemon: vi.fn(async (pokemon: PokemonEntity) =>
      makeBattleStats(pokemon, overrides),
    ),
    recordBattleOutcome: vi.fn(async () => ({})),
  };
}

export function createTestArena(
  options: { rng?: () => number; stats?: Partial<BattlePokemonStats> } = {},
): ArenaService {
  return new ArenaService({
    battleService: createArenaPort(options.stats),
    rng: options.rng ?? (() => 0.5),
    sweepIntervalMs: 0,
  });
}
