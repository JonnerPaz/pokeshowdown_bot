import type {
  BattleActionType,
  BattlePokemonStats,
  BattleState,
  TurnActionResult,
} from "../../domain/battle/types.js";

export type ArenaRoomStatus = "open" | "battle" | "finished";

export type ArenaFinishReason = "knockout" | "forfeit" | "abandoned" | "turn_limit";

export interface ArenaParticipant {
  telegramId: number;
  userId: number | null;
  username: string;
  joinedAt: number;
  pokemonId: number | null;
  /** Stats resolved when the trainer picked, frozen for the whole battle. */
  pokemon: BattlePokemonStats | null;
  /** Consecutive own turns that expired without an action. */
  consecutiveMisses: number;
}

export type ArenaLogAction = BattleActionType | "timeout" | "system";

export interface ArenaLogEntry {
  revision: number;
  at: number;
  turn: number;
  telegramId: number | null;
  action: ArenaLogAction;
  message: string;
  damage: number;
  typeMultiplier: number;
  isCritical: boolean;
  targetFainted: boolean;
}

export interface ArenaRoom {
  code: string;
  status: ArenaRoomStatus;
  revision: number;
  createdAt: number;
  updatedAt: number;
  creatorTelegramId: number;
  participants: ArenaParticipant[];
  chatId: number | null;
  state: BattleState | null;
  turnDeadline: number | null;
  log: ArenaLogEntry[];
  finishReason: ArenaFinishReason | null;
  winnerTelegramId: number | null;
  rankingRecorded: boolean;
  starting: boolean;
  turnTimer: NodeJS.Timeout | null;
}

export type ArenaErrorCode =
  | "user_not_registered"
  | "empty_party"
  | "room_not_found"
  | "room_full"
  | "already_joined"
  | "already_in_room"
  | "not_participant"
  | "invalid_state"
  | "not_creator"
  | "not_ready"
  | "not_your_turn"
  | "invalid_action"
  | "pokemon_not_owned"
  | "pokemon_not_in_party";

export class ArenaError extends Error {
  public readonly code: ArenaErrorCode;
  public readonly status: number;

  constructor(code: ArenaErrorCode, status: number, message: string) {
    super(message);
    this.name = "ArenaError";
    this.code = code;
    this.status = status;
  }
}

export type ArenaEvent =
  | { type: "room"; room: ArenaRoom }
  | { type: "turn"; room: ArenaRoom; result: TurnActionResult }
  | { type: "finished"; room: ArenaRoom };

export type ArenaListener = (event: ArenaEvent) => void;
