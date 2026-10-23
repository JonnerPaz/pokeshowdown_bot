import { afterEach, describe, expect, it, vi } from "vitest";

import type { BattlePokemonStats } from "../../../src/domain/battle/types.js";
import type { PokemonEntity } from "../../../src/domain/entities/pokemon.entity.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";
import { serializeRoom } from "../../../src/features/arena/arena.serializer.js";
import {
  ARENA_FINISHED_TTL_MS,
  ARENA_LOBBY_TTL_MS,
  ARENA_MAX_TURNS,
  ArenaService,
  type ArenaBattlePort,
} from "../../../src/features/arena/arena.service.js";
import { ArenaError, type ArenaRoom } from "../../../src/features/arena/arena.types.js";
import { createMockPokemon } from "../../harness/testHarness.js";

function makePokemon(id: number, name: string, isInParty = true): PokemonEntity {
  return createMockPokemon(name, "normal", { id, isInParty });
}

function makeUser(telegramId: number, username: string, pokemons: PokemonEntity[]): UserEntity {
  return new UserEntity({
    id: telegramId,
    telegramId,
    username,
    createdAt: new Date(),
    updatedAt: new Date(),
    pokemons,
  });
}

function makeBattlePort(overrides: Partial<BattlePokemonStats> = {}): ArenaBattlePort {
  return {
    resolveBattlePokemon: vi.fn(async (pokemon: PokemonEntity): Promise<BattlePokemonStats> => ({
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
    })),
    recordBattleOutcome: vi.fn(async () => ({})),
  };
}

interface SetupOptions {
  rng?: () => number;
  sweepIntervalMs?: number;
  stats?: Partial<BattlePokemonStats>;
  logger?: Pick<Console, "error" | "warn">;
  onFinished?: (room: ArenaRoom) => Promise<void> | void;
}

function setup(options: SetupOptions = {}) {
  const battleService = makeBattlePort(options.stats);
  const service = new ArenaService({
    battleService,
    rng: options.rng ?? (() => 0.5),
    sweepIntervalMs: options.sweepIntervalMs ?? 0,
    logger: options.logger,
    onFinished: options.onFinished,
  });
  return { service, battleService };
}

function expectArenaError(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ArenaError);
    expect((error as ArenaError).code).toBe(code);
    return;
  }
  throw new Error(`expected ArenaError with code ${code}`);
}

async function expectArenaErrorAsync(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ArenaError);
    expect((error as ArenaError).code).toBe(code);
    return;
  }
  throw new Error(`expected ArenaError with code ${code}`);
}

function makeAsh(): UserEntity {
  return makeUser(1, "ash", [makePokemon(11, "pikachu")]);
}

function makeGary(): UserEntity {
  return makeUser(2, "gary", [makePokemon(22, "eevee")]);
}

async function createDuel(
  service: ArenaService,
  challenger: UserEntity,
  opponent: UserEntity,
): Promise<ArenaRoom> {
  const room = service.createRoom(challenger);
  service.joinRoom(room.code, opponent);
  await service.pickPokemon(room.code, challenger, challenger.pokemons[0]!.id!);
  return service.pickPokemon(room.code, opponent, opponent.pokemons[0]!.id!);
}

describe("ArenaService lobby", () => {
  const services: ArenaService[] = [];

  afterEach(() => {
    for (const service of services.splice(0)) service.destroy();
    vi.useRealTimers();
  });

  function track(service: ArenaService): ArenaService {
    services.push(service);
    return service;
  }

  it("creates an open room with the creator inside", () => {
    const { service } = setup();
    track(service);

    const room = service.createRoom(makeAsh());

    expect(room.status).toBe("open");
    expect(room.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(room.creatorTelegramId).toBe(1);
    expect(room.participants).toHaveLength(1);
    expect(room.revision).toBe(1);
  });

  it("rejects a trainer with an empty party", () => {
    const { service } = setup();
    track(service);
    const user = makeUser(1, "ash", [makePokemon(11, "pikachu", false)]);

    expectArenaError(() => service.createRoom(user), "empty_party");
  });

  it("lets a second trainer join and rejects self joins, full rooms and missing codes", () => {
    const { service } = setup();
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = service.createRoom(ash);

    expectArenaError(() => service.joinRoom("ZZZZZZ", gary), "room_not_found");
    expectArenaError(() => service.joinRoom(room.code, ash), "already_joined");

    service.joinRoom(room.code, gary);
    const third = makeUser(3, "brock", [makePokemon(33, "onix")]);
    expectArenaError(() => service.joinRoom(room.code, third), "room_full");
  });

  it("keeps one active room per trainer", () => {
    const { service } = setup();
    track(service);
    const ash = makeAsh();
    const room = service.createRoom(ash);

    expectArenaError(() => service.createRoom(ash), "already_in_room");
    expect(service.getCurrentRoom(1)?.code).toBe(room.code);
  });

  it("rejects picks that are not owned or are boxed", async () => {
    const { service } = setup();
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = service.createRoom(ash);

    await expectArenaErrorAsync(service.pickPokemon(room.code, ash, 999), "pokemon_not_owned");
    const boxed = makePokemon(12, "raichu", false);
    ash.pokemons.push(boxed);
    await expectArenaErrorAsync(service.pickPokemon(room.code, ash, 12), "pokemon_not_in_party");
    expect(gary.pokemons[0]?.id).toBe(22);
  });

  it("freezes raw names instead of the Markdown-escaped engine name", async () => {
    const { service, battleService } = setup();
    track(service);
    const ash = makeUser(1, "ash", [makePokemon(11, "pikachu")]);
    ash.pokemons[0]!.nickname = "Sparky";
    const gary = makeGary();
    const room = service.createRoom(ash);
    service.joinRoom(room.code, gary);

    battleService.resolveBattlePokemon = vi.fn(async (): Promise<BattlePokemonStats> => ({
      id: 11,
      name: "Pikachu\\_Escaped",
      nickname: "Sparky",
      types: ["electric"],
      primaryType: "electric",
      currentHp: 100,
      maxHp: 100,
      attack: 50,
      defense: 50,
      specialAttack: 50,
      specialDefense: 50,
      speed: 50,
      isDefending: false,
      isCharged: false,
      isShiny: false,
      timesCaught: 1,
    }));

    await service.pickPokemon(room.code, ash, 11);
    expect(room.participants[0]?.pokemon?.name).toBe("Sparky");
  });

  it("ignores a pick that resolves after the room already closed", async () => {
    const { service, battleService } = setup();
    track(service);
    const ash = makeAsh();
    const room = service.createRoom(ash);

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    battleService.resolveBattlePokemon = vi.fn(async (pokemon: PokemonEntity) => {
      await gate;
      return makeBattlePort().resolveBattlePokemon(pokemon);
    });

    const picking = service.pickPokemon(room.code, ash, 11);
    await service.leaveRoom(room.code, ash);
    release();

    await expectArenaErrorAsync(picking, "invalid_state");
  });

  it("automatically starts the battle as soon as both trainers have picked a Pokemon", async () => {
    const { service } = setup();
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = service.createRoom(ash);
    service.joinRoom(room.code, gary);

    await service.pickPokemon(room.code, ash, 11);
    expect(room.status).toBe("open");

    const started = await service.pickPokemon(room.code, gary, 22);
    expect(started.status).toBe("battle");
    expect(started.state?.trainerA.telegramId).toBe(1);
    expect(started.state?.trainerB.telegramId).toBe(2);
  });

  it("gives the first turn to the faster Pokemon regardless of the rng", async () => {
    const { service, battleService } = setup({ rng: () => 0.9 });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = service.createRoom(ash);
    service.joinRoom(room.code, gary);

    battleService.resolveBattlePokemon = vi.fn(async (pokemon: PokemonEntity) => {
      const base = await makeBattlePort().resolveBattlePokemon(pokemon);
      return { ...base, speed: pokemon.id === 11 ? 120 : 40 };
    });

    await service.pickPokemon(room.code, ash, 11);
    const started = await service.pickPokemon(room.code, gary, 22);

    expect(started.state?.currentTurnTrainerId).toBe(1);
  });

  it("breaks a speed tie with the injected rng", async () => {
    const low = setup({ rng: () => 0.1 });
    const high = setup({ rng: () => 0.9 });
    track(low.service);
    track(high.service);

    const lowRoom = await createDuel(low.service, makeAsh(), makeGary());
    const highRoom = await createDuel(high.service, makeAsh(), makeGary());

    expect(lowRoom.state?.currentTurnTrainerId).toBe(1);
    expect(highRoom.state?.currentTurnTrainerId).toBe(2);
  });
});

describe("ArenaService turns and absences", () => {
  const services: ArenaService[] = [];

  afterEach(() => {
    for (const service of services.splice(0)) service.destroy();
    vi.useRealTimers();
  });

  function track(service: ArenaService): ArenaService {
    services.push(service);
    return service;
  }

  it("resolves an action and rejects off-turn or invalid actions", async () => {
    const { service } = setup({ rng: () => 0.1 });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = await createDuel(service, ash, gary);

    await expectArenaErrorAsync(service.submitAction(room.code, gary, "attack"), "not_your_turn");
    await expectArenaErrorAsync(service.submitAction(room.code, ash, "dance"), "invalid_action");

    const { result } = await service.submitAction(room.code, ash, "attack");

    expect(result.attackerTrainerId).toBe(1);
    expect(room.state?.turnCount).toBe(2);
    expect(room.state?.currentTurnTrainerId).toBe(2);
    expect(room.log.at(-1)?.action).toBe("attack");
  });

  it("auto-defends on the first miss and ends the battle on the second", async () => {
    vi.useFakeTimers();
    const { service, battleService } = setup({ rng: () => 0.1 });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = await createDuel(service, ash, gary);

    await vi.advanceTimersByTimeAsync(90_000);

    expect(room.status).toBe("battle");
    expect(room.participants[0]?.consecutiveMisses).toBe(1);
    expect(room.state?.currentTurnTrainerId).toBe(2);
    expect(room.log.at(-1)?.message).toContain("did not answer in time");

    await service.submitAction(room.code, gary, "attack");
    expect(room.participants[1]?.consecutiveMisses).toBe(0);

    await vi.advanceTimersByTimeAsync(90_000);

    expect(room.status).toBe("finished");
    expect(room.finishReason).toBe("abandoned");
    expect(room.winnerTelegramId).toBe(2);
    expect(battleService.recordBattleOutcome).toHaveBeenCalledTimes(1);
    expect(battleService.recordBattleOutcome).toHaveBeenCalledWith(2, 1, 22);
    expect(service.getCurrentRoom(1)).toBeNull();
  });

  it("resets the absence counter when the trainer acts", async () => {
    vi.useFakeTimers();
    const { service } = setup({ rng: () => 0.1 });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = await createDuel(service, ash, gary);

    await vi.advanceTimersByTimeAsync(90_000);
    expect(room.participants[0]?.consecutiveMisses).toBe(1);

    await service.submitAction(room.code, gary, "attack");
    await service.submitAction(room.code, ash, "attack");

    expect(room.participants[0]?.consecutiveMisses).toBe(0);
    expect(room.status).toBe("battle");
  });

  it("does not fire a stale timer after the active trainer acts", async () => {
    vi.useFakeTimers();
    const { service } = setup({ rng: () => 0.1 });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = await createDuel(service, ash, gary);

    await vi.advanceTimersByTimeAsync(89_000);
    await service.submitAction(room.code, ash, "attack");
    const turnCount = room.state?.turnCount;

    await vi.advanceTimersByTimeAsync(2_000);

    expect(room.state?.turnCount).toBe(turnCount);
    expect(room.participants[0]?.consecutiveMisses).toBe(0);
  });

  it("declares no contest when both trainers are absent", async () => {
    vi.useFakeTimers();
    const { service, battleService } = setup({ rng: () => 0.1 });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = await createDuel(service, ash, gary);

    await vi.advanceTimersByTimeAsync(90_000);
    await vi.advanceTimersByTimeAsync(90_000);
    await vi.advanceTimersByTimeAsync(90_000);

    expect(room.status).toBe("finished");
    expect(room.finishReason).toBe("abandoned");
    expect(room.winnerTelegramId).toBeNull();
    expect(battleService.recordBattleOutcome).not.toHaveBeenCalled();
  });

  it("ends in a draw after the turn cap without touching the ranking", async () => {
    vi.useFakeTimers();
    const { service, battleService } = setup({
      rng: () => 0.1,
      stats: {
        maxHp: 50_000,
        attack: 1,
        defense: 10_000,
        specialAttack: 1,
        specialDefense: 10_000,
      },
    });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = await createDuel(service, ash, gary);

    for (let index = 0; index < ARENA_MAX_TURNS; index += 1) {
      const activeId = Number(room.state?.currentTurnTrainerId);
      const actor = activeId === 1 ? ash : gary;
      await service.submitAction(room.code, actor, "attack");
    }

    expect(room.status).toBe("finished");
    expect(room.finishReason).toBe("turn_limit");
    expect(room.winnerTelegramId).toBeNull();
    expect(battleService.recordBattleOutcome).not.toHaveBeenCalled();
  });

  it("records the ranking and invokes onFinished once on a knockout", async () => {
    const onFinished = vi.fn();
    const { service, battleService } = setup({
      rng: () => 0.1,
      stats: { maxHp: 1, attack: 999, defense: 1 },
      onFinished,
    });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = await createDuel(service, ash, gary);

    await service.submitAction(room.code, ash, "attack");

    expect(room.status).toBe("finished");
    expect(room.finishReason).toBe("knockout");
    expect(room.winnerTelegramId).toBe(1);
    expect(battleService.recordBattleOutcome).toHaveBeenCalledTimes(1);
    expect(battleService.recordBattleOutcome).toHaveBeenCalledWith(1, 2, 11);
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onFinished).toHaveBeenCalledWith(room);

    await expectArenaErrorAsync(service.submitAction(room.code, gary, "attack"), "invalid_state");
    expect(battleService.recordBattleOutcome).toHaveBeenCalledTimes(1);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("hands the win to the rival when a trainer leaves a running battle", async () => {
    const { service, battleService } = setup({ rng: () => 0.1 });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = await createDuel(service, ash, gary);

    await service.leaveRoom(room.code, gary);

    expect(room.status).toBe("finished");
    expect(room.finishReason).toBe("forfeit");
    expect(room.winnerTelegramId).toBe(1);
    expect(battleService.recordBattleOutcome).toHaveBeenCalledWith(1, 2, 11);
  });

  it("does not record a win when the ranking write fails", async () => {
    const logger = { error: vi.fn(), warn: vi.fn() };
    const { service, battleService } = setup({
      rng: () => 0.1,
      stats: { maxHp: 1, attack: 999, defense: 1 },
      logger,
    });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = await createDuel(service, ash, gary);

    battleService.recordBattleOutcome = vi.fn(async () => {
      throw new Error("db down");
    });

    await service.submitAction(room.code, ash, "attack");

    expect(room.status).toBe("finished");
    expect(room.rankingRecorded).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      "arena ranking update failed",
      expect.objectContaining({ code: room.code }),
    );
  });

  it("closes the room when the creator leaves the lobby", async () => {
    const { service } = setup();
    track(service);
    const ash = makeAsh();
    const room = service.createRoom(ash);

    const result = await service.leaveRoom(room.code, ash);

    expect(result).toBeNull();
    expect(service.getCurrentRoom(1)).toBeNull();
    expectArenaError(() => service.getRoomFor(room.code, 1), "room_not_found");
  });

  it("keeps the lobby open when the guest leaves", async () => {
    const { service } = setup();
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = service.createRoom(ash);
    service.joinRoom(room.code, gary);

    const result = await service.leaveRoom(room.code, gary);

    expect(result?.participants).toHaveLength(1);
    expect(service.getCurrentRoom(2)).toBeNull();
    expect(service.getCurrentRoom(1)?.code).toBe(room.code);
  });

  it("emits room and turn events to subscribers", async () => {
    const { service } = setup({ rng: () => 0.1 });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = service.createRoom(ash);
    const events: string[] = [];
    const unsubscribe = service.subscribe(room.code, (event) => events.push(event.type));

    service.joinRoom(room.code, gary);
    await service.pickPokemon(room.code, ash, 11);
    await service.pickPokemon(room.code, gary, 22);
    await service.submitAction(room.code, ash, "attack");
    await service.leaveRoom(room.code, gary);
    unsubscribe();

    expect(events).toEqual(["room", "room", "room", "turn", "finished"]);
  });

  it("purges expired lobbies and finished rooms", async () => {
    vi.useFakeTimers();
    const { service } = setup({ sweepIntervalMs: 60_000 });
    track(service);
    const ash = makeAsh();
    service.createRoom(ash);

    await vi.advanceTimersByTimeAsync(ARENA_LOBBY_TTL_MS + 60_000);
    expect(service.getCurrentRoom(1)).toBeNull();

    const gary = makeGary();
    const duelAsh = makeAsh();
    const duel = await createDuel(service, duelAsh, gary);
    await service.leaveRoom(duel.code, gary);

    await vi.advanceTimersByTimeAsync(ARENA_FINISHED_TTL_MS + 60_000);
    expectArenaError(() => service.getRoomFor(duel.code, 1), "room_not_found");
  });

  it("serializes ids as strings and never leaks the timer", async () => {
    const { service } = setup({ rng: () => 0.1 });
    track(service);
    const ash = makeAsh();
    const gary = makeGary();
    const room = await createDuel(service, ash, gary);
    await service.leaveRoom(room.code, gary);

    const dto = serializeRoom(room);

    expect(dto.creatorTelegramId).toBe("1");
    expect(dto.participants.map((participant) => participant.telegramId)).toEqual(["1", "2"]);
    expect(dto.battle?.trainerA.telegramId).toBe("1");
    expect(dto.result).toEqual({ winnerTelegramId: "1", reason: "forfeit" });
    expect(dto).not.toHaveProperty("turnTimer");
  });
});
