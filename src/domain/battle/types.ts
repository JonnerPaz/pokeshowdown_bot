export type PokemonType =
  | "normal"
  | "fire"
  | "water"
  | "grass"
  | "electric"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "steel"
  | "dark"
  | "fairy";

export type BattleActionType = "attack" | "special" | "defend" | "charge";

export interface BattlePokemonStats {
  id?: number | null | undefined;
  name: string;
  nickname?: string | undefined;
  types: string[];
  primaryType: string;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  isDefending: boolean;
  isCharged: boolean;
  isShiny: boolean;
  timesCaught: number;
  spriteUrl?: string | undefined;
}

export interface TurnActionResult {
  attackerTrainerId: string | number;
  attackerName: string;
  action: BattleActionType;
  damageDealt: number;
  typeMultiplier: number;
  isCritical: boolean;
  logMessage: string;
  targetFainted: boolean;
}

export interface TrainerBattleProfile {
  id: string | number;
  telegramId?: number | bigint | undefined;
  name: string;
  pokemon: BattlePokemonStats;
}

export interface BattleState {
  battleId: string;
  trainerA: TrainerBattleProfile;
  trainerB: TrainerBattleProfile;
  turnCount: number;
  currentTurnTrainerId: string | number;
  isFinished: boolean;
  winnerTrainerId?: string | number | undefined;
  lastTurnLog?: string | undefined;
}
