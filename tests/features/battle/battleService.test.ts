import { describe, expect, it, vi } from "vitest";
import { BattleService } from "../../../src/features/battle/battle.service.js";
import { PokemonEntity } from "../../../src/domain/entities/pokemon.entity.js";
import type { PokeApiService } from "../../../src/presentation/services/pokeapi.service.js";
import type { UserDataSource } from "../../../src/domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../../../src/domain/datasource/pokemon.datasource.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";

const makePokemon = (overrides: Partial<PokemonEntity> = {}): PokemonEntity =>
  new PokemonEntity({
    id: 1,
    name: "charizard",
    types: ["fire", "flying"],
    ability: "blaze",
    isShiny: false,
    sprites: {
      frontDefault: "https://example.com/charizard.png",
      backDefault: "https://example.com/charizard-back.png",
      frontShiny: "https://example.com/charizard-shiny.png",
      backShiny: "https://example.com/charizard-back-shiny.png",
    },
    timesCaught: 3,
    ...overrides,
  });

describe("BattleService", () => {
  it("resolves battle pokemon stats using PokeApi base stats and timesCaught scaling", async () => {
    const mockPokeApi = {
      getPokemonBaseStats: vi.fn().mockResolvedValue({
        hp: 78,
        attack: 84,
        defense: 78,
        specialAttack: 109,
        specialDefense: 85,
        speed: 100,
      }),
    } as unknown as PokeApiService;

    const mockUserDataSource = {} as unknown as UserDataSource;
    const mockPokemonDataSource = {} as unknown as PokemonDataSource;
    const battleService = new BattleService(mockPokeApi, mockUserDataSource, mockPokemonDataSource);

    const pokemon = makePokemon({ timesCaught: 2, nickname: "Ignis" });
    const battlePokemon = await battleService.resolveBattlePokemon(pokemon);

    expect(mockPokeApi.getPokemonBaseStats).toHaveBeenCalledWith("charizard");
    expect(battlePokemon.name).toBe("Ignis");
    expect(battlePokemon.primaryType).toBe("fire");
    expect(battlePokemon.currentHp).toBe(battlePokemon.maxHp);
    expect(battlePokemon.maxHp).toBeGreaterThan(50);
    expect(battlePokemon.attack).toBeGreaterThan(0);
    expect(battlePokemon.speed).toBeGreaterThan(0);
    expect(battlePokemon.spriteUrl).toBe("https://example.com/charizard.png");
  });

  it("awards victory by incrementing timesCaught for the winning pokemon", async () => {
    const mockPokemon = makePokemon({ id: 42, timesCaught: 5 });
    const mockUser = new UserEntity({
      id: 1,
      telegramId: 99999n,
      username: "ash_ketchum",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [mockPokemon],
    });

    const mockUpdatePokemon = vi.fn().mockResolvedValue({
      ...mockPokemon,
      timesCaught: 6,
    });

    const mockUserDataSource = {
      findUserByTelegramId: vi.fn().mockResolvedValue(mockUser),
      updateUser: vi.fn().mockResolvedValue(mockUser),
    } as unknown as UserDataSource;

    const mockPokemonDataSource = {
      updatePokemon: mockUpdatePokemon,
    } as unknown as PokemonDataSource;

    const mockPokeApi = {} as unknown as PokeApiService;
    const battleService = new BattleService(mockPokeApi, mockUserDataSource, mockPokemonDataSource);

    const result = await battleService.awardVictory(99999n, 42);

    expect(mockUserDataSource.findUserByTelegramId).toHaveBeenCalledWith(99999n);
    expect(mockUserDataSource.updateUser).toHaveBeenCalledWith(mockUser, { wins: 1 });
    expect(mockUpdatePokemon).toHaveBeenCalledWith(mockPokemon, { timesCaught: 6 });
    expect(result).toBeDefined();
    expect(result?.timesCaught).toBe(6);
  });

  it("records battle outcome with winner victory and loser defeat", async () => {
    const winnerPokemon = makePokemon({ id: 10, timesCaught: 2 });
    const winner = new UserEntity({
      id: 1,
      telegramId: 100n,
      username: "winner_ash",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [winnerPokemon],
      wins: 3,
      losses: 1,
    });
    const loser = new UserEntity({
      id: 2,
      telegramId: 200n,
      username: "loser_gary",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [],
      wins: 2,
      losses: 2,
    });

    const mockUserDataSource = {
      findUserByTelegramId: vi.fn((id: bigint) => {
        if (id === 100n) return Promise.resolve(winner);
        if (id === 200n) return Promise.resolve(loser);
        return Promise.resolve(null);
      }),
      updateUser: vi.fn((_user: UserEntity, data: Partial<UserEntity>) =>
        Promise.resolve({ ..._user, ...data }),
      ),
    } as unknown as UserDataSource;

    const mockPokemonDataSource = {
      updatePokemon: vi.fn((pokemon: PokemonEntity, data: Partial<PokemonEntity>) =>
        Promise.resolve({ ...pokemon, ...data }),
      ),
    } as unknown as PokemonDataSource;

    const battleService = new BattleService(
      {} as PokeApiService,
      mockUserDataSource,
      mockPokemonDataSource,
    );

    const outcome = await battleService.recordBattleOutcome(100n, 200n, 10);
    expect(outcome.winner?.wins).toBe(4);
    expect(outcome.loser?.losses).toBe(3);
    expect(outcome.upgradedPokemon?.timesCaught).toBe(3);
  });

  it("returns null when user or pokemon is not found during victory award", async () => {
    const mockUserDataSource = {
      findUserByTelegramId: vi.fn().mockResolvedValue(null),
    } as unknown as UserDataSource;

    const mockPokemonDataSource = {} as unknown as PokemonDataSource;
    const battleService = new BattleService(
      {} as PokeApiService,
      mockUserDataSource,
      mockPokemonDataSource,
    );
    const result = await battleService.awardVictory(12345n, 99);
    expect(result).toBeNull();
  });
});
