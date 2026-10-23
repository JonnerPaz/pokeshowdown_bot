import { randomInt } from "node:crypto";

import { BattleEngine } from "../../domain/battle/battleEngine.js";
import type {
  BattleActionType,
  BattlePokemonStats,
  TrainerBattleProfile,
  TurnActionResult,
} from "../../domain/battle/types.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import { ArenaRoomStore } from "./arena.store.js";
import {
  ArenaError,
  type ArenaEvent,
  type ArenaFinishReason,
  type ArenaListener,
  type ArenaLogAction,
  type ArenaParticipant,
  type ArenaRoom,
} from "./arena.types.js";

/** Total actions allowed before the battle is declared a draw (v1 uses 50). */
export const ARENA_MAX_TURNS = 99;
export const ARENA_DEFAULT_TURN_TIMEOUT_MS = 90_000;
export const ARENA_LOBBY_TTL_MS = 15 * 60_000;
export const ARENA_FINISHED_TTL_MS = 10 * 60_000;
export const ARENA_SWEEP_INTERVAL_MS = 60_000;

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const BATTLE_ACTIONS: readonly BattleActionType[] = ["attack", "special", "defend", "charge"];

export interface ArenaBattlePort {
  resolveBattlePokemon(pokemon: PokemonEntity): Promise<BattlePokemonStats>;
  recordBattleOutcome(
    winnerTelegramId: number | bigint,
    loserTelegramId: number | bigint,
    winningPokemonId?: number,
  ): Promise<unknown>;
}

export interface ArenaServiceOptions {
  battleService: ArenaBattlePort;
  /** Used only to break speed ties and roll damage. Injectable for tests. */
  rng?: (() => number) | undefined;
  now?: (() => number) | undefined;
  turnTimeoutMs?: number | undefined;
  /** Set to 0 to disable the background sweeper (tests). */
  sweepIntervalMs?: number | undefined;
  logger?: Pick<Console, "error" | "warn"> | undefined;
  /** Invoked once after a running battle transitions to finished. */
  onFinished?: ((room: ArenaRoom) => Promise<void> | void) | undefined;
}

export function isBattleAction(value: unknown): value is BattleActionType {
  return typeof value === "string" && (BATTLE_ACTIONS as readonly string[]).includes(value);
}

export class ArenaService {
  private readonly store = new ArenaRoomStore();
  private readonly listeners = new Map<string, Set<ArenaListener>>();
  private readonly battleService: ArenaBattlePort;
  private readonly rng: () => number;
  private readonly now: () => number;
  private readonly turnTimeoutMs: number;
  private readonly logger: Pick<Console, "error" | "warn">;
  private readonly onFinished?: ((room: ArenaRoom) => Promise<void> | void) | undefined;
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(options: ArenaServiceOptions) {
    this.battleService = options.battleService;
    this.rng = options.rng ?? Math.random;
    this.now = options.now ?? Date.now;
    this.turnTimeoutMs = options.turnTimeoutMs ?? ARENA_DEFAULT_TURN_TIMEOUT_MS;
    this.logger = options.logger ?? console;
    this.onFinished = options.onFinished;

    const sweepIntervalMs = options.sweepIntervalMs ?? ARENA_SWEEP_INTERVAL_MS;
    if (sweepIntervalMs > 0) {
      this.sweepTimer = setInterval(() => this.sweep(), sweepIntervalMs);
      this.sweepTimer.unref?.();
    }
  }

  // ---------------------------------------------------------------------------
  // Lobby
  // ---------------------------------------------------------------------------

  public createRoom(user: UserEntity, chatId: number | null = null): ArenaRoom {
    const telegramId = this.requireTelegramId(user);
    if (user.party.length === 0) {
      throw new ArenaError("empty_party", 409, "Move at least one Pokemon to your party");
    }
    if (this.store.getActiveRoom(telegramId)) {
      throw new ArenaError("already_in_room", 409, "You are already in an active room");
    }

    const now = this.now();
    const room: ArenaRoom = {
      code: this.allocateCode(),
      status: "open",
      revision: 1,
      createdAt: now,
      updatedAt: now,
      creatorTelegramId: telegramId,
      participants: [this.toParticipant(user, now)],
      chatId,
      state: null,
      turnDeadline: null,
      log: [],
      finishReason: null,
      winnerTelegramId: null,
      rankingRecorded: false,
      turnTimer: null,
    };

    this.store.create(room);
    this.store.markActive(telegramId, room.code);
    this.emit({ type: "room", room });
    return room;
  }

  public joinRoom(code: string, user: UserEntity): ArenaRoom {
    const room = this.findRoom(code);
    const telegramId = this.requireTelegramId(user);

    if (room.status !== "open") {
      throw new ArenaError("invalid_state", 409, "This room is no longer accepting trainers");
    }
    if (room.participants.some((participant) => participant.telegramId === telegramId)) {
      throw new ArenaError("already_joined", 409, "You are already in this room");
    }
    if (this.store.getActiveRoom(telegramId)) {
      throw new ArenaError("already_in_room", 409, "You are already in an active room");
    }
    if (room.participants.length >= 2) {
      throw new ArenaError("room_full", 409, "This room already has two trainers");
    }
    if (user.party.length === 0) {
      throw new ArenaError("empty_party", 409, "Move at least one Pokemon to your party");
    }

    room.participants.push(this.toParticipant(user, this.now()));
    this.store.markActive(telegramId, room.code);
    this.touch(room);
    this.emit({ type: "room", room });
    return room;
  }

  public async pickPokemon(code: string, user: UserEntity, pokemonId: number): Promise<ArenaRoom> {
    const room = this.findRoom(code);
    const participant = this.requireParticipant(room, this.requireTelegramId(user));

    if (room.status !== "open") {
      throw new ArenaError("invalid_state", 409, "The battle already started");
    }

    const pokemon = user.pokemons.find((candidate) => candidate.id === pokemonId);
    if (!pokemon) {
      throw new ArenaError("pokemon_not_owned", 403, "You do not own that Pokemon");
    }
    if (!pokemon.isInParty) {
      throw new ArenaError("pokemon_not_in_party", 409, "Move that Pokemon to your party first");
    }

    const stats = await this.battleService.resolveBattlePokemon(pokemon);
    // The pick awaits PokeAPI; the room may have started, closed or lost this
    // trainer while the request was in flight.
    if (
      room.status !== "open" ||
      !room.participants.includes(participant) ||
      this.store.get(room.code) !== room
    ) {
      throw new ArenaError("invalid_state", 409, "The room is no longer available");
    }

    participant.pokemonId = pokemonId;
    // resolveBattlePokemon escapes the name for Markdown; the web API wants it raw.
    participant.pokemon = { ...stats, name: pokemon.nickname ?? pokemon.name };
    this.touch(room);
    if (
      room.participants.length === 2 &&
      room.participants.every((candidate) => candidate.pokemon !== null)
    ) {
      this.beginBattle(room);
    }
    this.emit({ type: "room", room });
    return room;
  }

  public async leaveRoom(code: string, user: UserEntity): Promise<ArenaRoom | null> {
    const room = this.findRoom(code);
    const telegramId = this.requireTelegramId(user);
    const participant = this.requireParticipant(room, telegramId);

    if (room.status === "battle") {
      return this.forfeit(room, participant);
    }

    if (room.status !== "open") {
      throw new ArenaError("invalid_state", 409, "This room is already finished");
    }

    if (room.creatorTelegramId === telegramId) {
      this.closeLobby(room);
      return null;
    }

    room.participants = room.participants.filter(
      (candidate) => candidate.telegramId !== participant.telegramId,
    );
    this.store.release(telegramId, room.code);
    this.touch(room);
    this.emit({ type: "room", room });
    return room;
  }

  // ---------------------------------------------------------------------------
  // Battle
  // ---------------------------------------------------------------------------

  private beginBattle(room: ArenaRoom): void {
    const [first, second] = room.participants;
    if (!first || !second) return;

    room.state = BattleEngine.initBattle(
      room.code,
      this.toBattleProfile(first),
      this.toBattleProfile(second),
      this.rng,
    );
    room.status = "battle";
    this.appendSystemLog(
      room,
      `Battle started: ${first.username} (${first.pokemon?.name}) vs ${second.username} (${second.pokemon?.name}).`,
    );
    this.armTurnTimer(room);
  }

  public async submitAction(
    code: string,
    user: UserEntity,
    action: unknown,
  ): Promise<{ room: ArenaRoom; result: TurnActionResult }> {
    const room = this.findRoom(code);
    const participant = this.requireParticipant(room, this.requireTelegramId(user));

    if (room.status !== "battle" || !room.state) {
      throw new ArenaError("invalid_state", 409, "This room is not in battle");
    }
    if (!isBattleAction(action)) {
      throw new ArenaError(
        "invalid_action",
        400,
        "Action must be attack, special, defend or charge",
      );
    }
    if (Number(room.state.currentTurnTrainerId) !== participant.telegramId) {
      throw new ArenaError("not_your_turn", 403, "It is not your turn");
    }

    participant.consecutiveMisses = 0;
    const { state, result } = BattleEngine.executeTurn(room.state, action, this.rng);
    room.state = state;
    this.clearTurnTimer(room);
    room.turnDeadline = null;
    this.touch(room);
    this.appendResultLog(room, result, result.action);
    this.emit({ type: "turn", room, result });
    await this.afterTurn(room);
    return { room, result };
  }

  private async forfeit(room: ArenaRoom, participant: ArenaParticipant): Promise<ArenaRoom> {
    const opponent = this.opponentOf(room, participant.telegramId);
    await this.finishBattle(room, "forfeit", opponent?.telegramId ?? null, true);
    return room;
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  public getRoomFor(code: string, telegramId: number): ArenaRoom {
    const room = this.findRoom(code);
    this.requireParticipant(room, telegramId);
    return room;
  }

  public getCurrentRoom(telegramId: number): ArenaRoom | null {
    const room = this.store.getActiveRoom(telegramId);
    if (!room || room.status === "finished") return null;
    return room;
  }

  public subscribe(code: string, listener: ArenaListener): () => void {
    const normalized = code.trim().toUpperCase();
    const listeners = this.listeners.get(normalized) ?? new Set<ArenaListener>();
    listeners.add(listener);
    this.listeners.set(normalized, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(normalized);
      }
    };
  }

  public destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    for (const room of this.store.values()) {
      this.clearTurnTimer(room);
    }
    this.listeners.clear();
    this.store.clear();
  }

  // ---------------------------------------------------------------------------
  // Turn resolution
  // ---------------------------------------------------------------------------

  private async afterTurn(room: ArenaRoom): Promise<void> {
    if (!room.state) return;

    if (room.state.isFinished) {
      const winnerId = Number(room.state.winnerTrainerId);
      await this.finishBattle(room, "knockout", Number.isFinite(winnerId) ? winnerId : null, true);
      return;
    }

    if (room.state.turnCount > ARENA_MAX_TURNS) {
      await this.finishBattle(room, "turn_limit", null, false);
      return;
    }

    this.armTurnTimer(room);
  }

  private async handleTurnTimeout(code: string, deadline: number): Promise<void> {
    const room = this.store.get(code);
    if (!room || room.status !== "battle" || room.turnDeadline !== deadline) return;

    const active = this.activeParticipant(room);
    if (!active) return;

    active.consecutiveMisses += 1;
    room.updatedAt = this.now();

    if (active.consecutiveMisses >= 2) {
      const opponent = this.opponentOf(room, active.telegramId);
      const opponentPresent = (opponent?.consecutiveMisses ?? 0) === 0;
      const winner = opponentPresent ? opponent : null;

      this.touch(room);
      this.appendSystemLog(
        room,
        winner
          ? `${active.username} missed two turns in a row. ${winner.username} wins by abandonment.`
          : `${active.username} missed two turns in a row and so did their rival. No contest.`,
      );
      await this.finishBattle(room, "abandoned", winner?.telegramId ?? null, winner !== null);
      return;
    }

    if (!room.state) return;
    const { state, result } = BattleEngine.executeTurn(room.state, "defend", this.rng);
    room.state = state;
    this.clearTurnTimer(room);
    room.turnDeadline = null;
    this.touch(room);
    this.appendTimeoutLog(room, active);
    this.emit({ type: "turn", room, result });
    await this.afterTurn(room);
  }

  private async finishBattle(
    room: ArenaRoom,
    reason: ArenaFinishReason,
    winnerTelegramId: number | null,
    ranked: boolean,
  ): Promise<void> {
    // Flip the status before any await so the room stops accepting actions while
    // the ranking write is in flight.
    this.transitionToFinished(room, reason, winnerTelegramId);

    if (ranked && winnerTelegramId !== null) {
      const winner = room.participants.find(
        (participant) => participant.telegramId === winnerTelegramId,
      );
      const loser = room.participants.find(
        (participant) => participant.telegramId !== winnerTelegramId,
      );

      if (winner && loser) {
        try {
          await this.battleService.recordBattleOutcome(
            winner.telegramId,
            loser.telegramId,
            winner.pokemonId ?? undefined,
          );
          room.rankingRecorded = true;
        } catch (error) {
          // Never lose the battle because Prisma is down; the result is still final.
          this.logger.error("arena ranking update failed", { error, code: room.code });
        }
      }
    }

    this.emit({ type: "finished", room });

    if (this.onFinished) {
      try {
        await this.onFinished(room);
      } catch (error) {
        this.logger.error("arena onFinished hook failed", { error, code: room.code });
      }
    }
  }

  private transitionToFinished(
    room: ArenaRoom,
    reason: ArenaFinishReason,
    winnerTelegramId: number | null,
  ): void {
    this.clearTurnTimer(room);
    room.status = "finished";
    room.finishReason = reason;
    room.winnerTelegramId = winnerTelegramId;
    room.turnDeadline = null;
    this.touch(room);

    for (const participant of room.participants) {
      this.store.release(participant.telegramId, room.code);
    }
  }

  private closeLobby(room: ArenaRoom): void {
    this.transitionToFinished(room, "abandoned", null);
    this.emit({ type: "finished", room });
    this.store.delete(room.code);
  }

  // ---------------------------------------------------------------------------
  // Timers and cleanup
  // ---------------------------------------------------------------------------

  private armTurnTimer(room: ArenaRoom): void {
    this.clearTurnTimer(room);
    const deadline = this.now() + this.turnTimeoutMs;
    room.turnDeadline = deadline;

    const timer = setTimeout(() => {
      void this.handleTurnTimeout(room.code, deadline).catch((error: unknown) => {
        this.logger.error("arena turn timeout failed", { error, code: room.code });
      });
    }, this.turnTimeoutMs);

    timer.unref?.();
    room.turnTimer = timer;
  }

  private clearTurnTimer(room: ArenaRoom): void {
    if (room.turnTimer) {
      clearTimeout(room.turnTimer);
      room.turnTimer = null;
    }
  }

  private sweep(): void {
    const now = this.now();

    for (const room of this.store.values()) {
      if (room.status === "finished") {
        if (now - room.updatedAt >= ARENA_FINISHED_TTL_MS) {
          this.store.delete(room.code);
        }
        continue;
      }

      if (room.status === "open" && now - room.updatedAt >= ARENA_LOBBY_TTL_MS) {
        this.closeLobby(room);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private requireTelegramId(user: UserEntity): number {
    if (user.telegramId === null) {
      throw new ArenaError("user_not_registered", 409, "Trainer is not registered");
    }
    return Number(user.telegramId);
  }

  private findRoom(rawCode: string): ArenaRoom {
    const code = rawCode.trim().toUpperCase();
    const room = this.store.get(code);
    if (!room) {
      throw new ArenaError("room_not_found", 404, "Room not found");
    }
    return room;
  }

  private requireParticipant(room: ArenaRoom, telegramId: number): ArenaParticipant {
    const participant = room.participants.find((entry) => entry.telegramId === telegramId);
    if (!participant) {
      throw new ArenaError("not_participant", 403, "You are not part of this room");
    }
    return participant;
  }

  private opponentOf(room: ArenaRoom, telegramId: number): ArenaParticipant | null {
    return room.participants.find((entry) => entry.telegramId !== telegramId) ?? null;
  }

  private activeParticipant(room: ArenaRoom): ArenaParticipant | null {
    if (!room.state) return null;
    const telegramId = Number(room.state.currentTurnTrainerId);
    return room.participants.find((entry) => entry.telegramId === telegramId) ?? null;
  }

  private toParticipant(user: UserEntity, now: number): ArenaParticipant {
    return {
      telegramId: this.requireTelegramId(user),
      userId: user.id,
      username: user.username,
      joinedAt: now,
      pokemonId: null,
      pokemon: null,
      consecutiveMisses: 0,
    };
  }

  private toBattleProfile(participant: ArenaParticipant): TrainerBattleProfile {
    if (!participant.pokemon) {
      throw new ArenaError("not_ready", 409, "Trainer has no battle Pokemon");
    }
    return {
      id: participant.telegramId,
      telegramId: participant.telegramId,
      name: participant.username,
      pokemon: { ...participant.pokemon },
    };
  }

  private allocateCode(): string {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      let code = "";
      for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
        code += ROOM_ALPHABET.charAt(randomInt(ROOM_ALPHABET.length));
      }
      if (!this.store.get(code)) return code;
    }
    throw new Error("Could not allocate a unique room code");
  }

  private touch(room: ArenaRoom): void {
    room.revision += 1;
    room.updatedAt = this.now();
  }

  private appendSystemLog(room: ArenaRoom, message: string): void {
    room.log.push({
      revision: room.revision,
      at: this.now(),
      turn: room.state?.turnCount ?? 0,
      telegramId: null,
      action: "system",
      message,
      damage: 0,
      typeMultiplier: 1,
      isCritical: false,
      targetFainted: false,
    });
  }

  private appendTimeoutLog(room: ArenaRoom, participant: ArenaParticipant): void {
    room.log.push({
      revision: room.revision,
      at: this.now(),
      turn: room.state?.turnCount ?? 0,
      telegramId: participant.telegramId,
      action: "timeout",
      message: `${participant.username} did not answer in time and defended.`,
      damage: 0,
      typeMultiplier: 1,
      isCritical: false,
      targetFainted: false,
    });
  }

  private appendResultLog(room: ArenaRoom, result: TurnActionResult, action: ArenaLogAction): void {
    room.log.push({
      revision: room.revision,
      at: this.now(),
      turn: room.state?.turnCount ?? 0,
      telegramId: Number(result.attackerTrainerId),
      action,
      message: this.describeResult(result),
      damage: result.damageDealt,
      typeMultiplier: result.typeMultiplier,
      isCritical: result.isCritical,
      targetFainted: result.targetFainted,
    });
  }

  private describeResult(result: TurnActionResult): string {
    if (result.action === "defend") {
      return `${result.attackerName} adopted a defensive stance.`;
    }
    if (result.action === "charge") {
      return `${result.attackerName} gathered energy.`;
    }

    const effects: string[] = [];
    if (result.isCritical) effects.push("critical hit");
    if (result.typeMultiplier === 0) effects.push("no effect");
    else if (result.typeMultiplier > 1) effects.push("super effective");
    else if (result.typeMultiplier < 1) effects.push("not very effective");

    const suffix = effects.length > 0 ? ` (${effects.join(", ")})` : "";
    const move = result.action === "special" ? "a special attack" : "a physical strike";
    return `${result.attackerName} used ${move} for ${result.damageDealt} damage${suffix}.`;
  }

  private emit(event: ArenaEvent): void {
    const listeners = this.listeners.get(event.room.code);
    if (!listeners) return;

    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch (error) {
        this.logger.error("arena listener failed", { error, code: event.room.code });
      }
    }
  }
}
