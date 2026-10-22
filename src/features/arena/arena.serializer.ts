import type {
  BattlePokemonStats,
  BattleState,
  TrainerBattleProfile,
} from "../../domain/battle/types.js";
import type {
  ArenaFinishReason,
  ArenaLogAction,
  ArenaLogEntry,
  ArenaParticipant,
  ArenaRoom,
  ArenaRoomStatus,
} from "./arena.types.js";

export interface ArenaParticipantDto {
  telegramId: string;
  username: string;
  joinedAt: string;
  pokemonId: number | null;
  hasPicked: boolean;
  consecutiveMisses: number;
}

export interface ArenaBattleTrainerDto {
  telegramId: string;
  name: string;
  pokemon: BattlePokemonStats;
}

export interface ArenaBattleDto {
  battleId: string;
  turnCount: number;
  isFinished: boolean;
  winnerTelegramId: string | null;
  trainerA: ArenaBattleTrainerDto;
  trainerB: ArenaBattleTrainerDto;
}

export interface ArenaTurnDto {
  currentTelegramId: string;
  deadline: string | null;
}

export interface ArenaLogDto {
  revision: number;
  at: string;
  turn: number;
  telegramId: string | null;
  action: ArenaLogAction;
  message: string;
  damage: number;
  typeMultiplier: number;
  isCritical: boolean;
  targetFainted: boolean;
}

export interface ArenaResultDto {
  winnerTelegramId: string | null;
  reason: ArenaFinishReason;
}

export interface ArenaRoomDto {
  code: string;
  status: ArenaRoomStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
  creatorTelegramId: string;
  participants: ArenaParticipantDto[];
  chatId: string | null;
  battle: ArenaBattleDto | null;
  turn: ArenaTurnDto | null;
  log: ArenaLogDto[];
  result: ArenaResultDto | null;
}

export function serializeRoom(room: ArenaRoom): ArenaRoomDto {
  return {
    code: room.code,
    status: room.status,
    revision: room.revision,
    createdAt: new Date(room.createdAt).toISOString(),
    updatedAt: new Date(room.updatedAt).toISOString(),
    creatorTelegramId: String(room.creatorTelegramId),
    participants: room.participants.map(serializeParticipant),
    chatId: room.chatId === null ? null : String(room.chatId),
    battle: room.state ? serializeBattle(room.state) : null,
    turn:
      room.status === "battle" && room.state
        ? {
            currentTelegramId: String(room.state.currentTurnTrainerId),
            deadline: room.turnDeadline === null ? null : new Date(room.turnDeadline).toISOString(),
          }
        : null,
    log: room.log.map(serializeLogEntry),
    result:
      room.status === "finished" && room.finishReason
        ? {
            winnerTelegramId: room.winnerTelegramId === null ? null : String(room.winnerTelegramId),
            reason: room.finishReason,
          }
        : null,
  };
}

function serializeParticipant(participant: ArenaParticipant): ArenaParticipantDto {
  return {
    telegramId: String(participant.telegramId),
    username: participant.username,
    joinedAt: new Date(participant.joinedAt).toISOString(),
    pokemonId: participant.pokemonId,
    hasPicked: participant.pokemon !== null,
    consecutiveMisses: participant.consecutiveMisses,
  };
}

function serializeTrainer(trainer: TrainerBattleProfile): ArenaBattleTrainerDto {
  return {
    telegramId: String(trainer.telegramId ?? trainer.id),
    name: trainer.name,
    pokemon: {
      ...trainer.pokemon,
      types: [...trainer.pokemon.types],
    },
  };
}

export function serializeBattle(state: BattleState): ArenaBattleDto {
  return {
    battleId: state.battleId,
    turnCount: state.turnCount,
    isFinished: state.isFinished,
    winnerTelegramId:
      state.winnerTrainerId === undefined || state.winnerTrainerId === null
        ? null
        : String(state.winnerTrainerId),
    trainerA: serializeTrainer(state.trainerA),
    trainerB: serializeTrainer(state.trainerB),
  };
}

function serializeLogEntry(entry: ArenaLogEntry): ArenaLogDto {
  return {
    revision: entry.revision,
    at: new Date(entry.at).toISOString(),
    turn: entry.turn,
    telegramId: entry.telegramId === null ? null : String(entry.telegramId),
    action: entry.action,
    message: entry.message,
    damage: entry.damage,
    typeMultiplier: entry.typeMultiplier,
    isCritical: entry.isCritical,
    targetFainted: entry.targetFainted,
  };
}
