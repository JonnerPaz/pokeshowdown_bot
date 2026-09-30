import { getTypeEffectiveness } from "./typeEffectiveness.js";
import type {
  BattleActionType,
  BattleState,
  TrainerBattleProfile,
  TurnActionResult,
} from "./types.js";

export class BattleEngine {
  /**
   * Initializes a new BattleState between two trainers.
   * Faster Pokemon gets the first turn; if tied, Trainer A goes first.
   */
  public static initBattle(
    battleId: string,
    trainerA: TrainerBattleProfile,
    trainerB: TrainerBattleProfile,
  ): BattleState {
    const firstTurnTrainerId =
      trainerB.pokemon.speed > trainerA.pokemon.speed ? trainerB.id : trainerA.id;

    return {
      battleId,
      trainerA: {
        ...trainerA,
        pokemon: { ...trainerA.pokemon, currentHp: trainerA.pokemon.maxHp },
      },
      trainerB: {
        ...trainerB,
        pokemon: { ...trainerB.pokemon, currentHp: trainerB.pokemon.maxHp },
      },
      turnCount: 1,
      currentTurnTrainerId: firstTurnTrainerId,
      isFinished: false,
    };
  }

  /**
   * Executes a turn action for the currently active trainer.
   */
  public static executeTurn(
    state: BattleState,
    action: BattleActionType,
    rng: () => number = Math.random,
  ): { state: BattleState; result: TurnActionResult } {
    if (state.isFinished) {
      throw new Error("Battle is already finished");
    }

    const isTrainerATurn = state.currentTurnTrainerId === state.trainerA.id;
    const activeTrainer = isTrainerATurn ? state.trainerA : state.trainerB;
    const defenderTrainer = isTrainerATurn ? state.trainerB : state.trainerA;

    const attacker = activeTrainer.pokemon;
    const defender = defenderTrainer.pokemon;

    let damage = 0;
    let typeMultiplier = 1;
    let isCritical = false;
    let logMessage: string;

    // Clear defender's previous defend state at the start of attacker's action resolution
    // (defend protects against the NEXT attack)
    if (action === "defend") {
      attacker.isDefending = true;
      logMessage = `🛡️ *${attacker.name}* adopted a defensive stance! Damage taken next turn will be halved.`;
    } else if (action === "charge") {
      attacker.isCharged = true;
      logMessage = `⚡ *${attacker.name}* gathered energy! Its next attack will land a devastating critical hit!`;
    } else {
      // Offensive action: "attack" or "special"
      const power = action === "special" ? 65 : 40;
      const attackStat = action === "special" ? attacker.specialAttack : attacker.attack;
      const defenseStat = action === "special" ? defender.specialDefense : defender.defense;
      const moveType = action === "special" ? attacker.primaryType : "normal";

      // Calculate type effectiveness
      typeMultiplier = action === "special" ? getTypeEffectiveness(moveType, defender.types) : 1.0;

      // STAB (Same-Type Attack Bonus)
      const hasStab = action === "special" && attacker.types.includes(moveType);
      const stabMultiplier = hasStab ? 1.5 : 1.0;

      // Critical hit: 100% if charged, otherwise ~10% chance
      isCritical = attacker.isCharged || rng() < 0.1;
      const critMultiplier = isCritical ? 1.5 : 1.0;
      attacker.isCharged = false;

      // Random variance between 0.85 and 1.0
      const variance = 0.85 + rng() * 0.15;

      if (typeMultiplier === 0) {
        damage = 0;
        logMessage = `👻 It had no effect on *${defender.name}*! (0x damage)`;
      } else {
        const level = Math.min(100, 20 + attacker.timesCaught * 5);
        const baseDamage =
          ((((2 * level) / 5 + 2) * power * (attackStat / Math.max(1, defenseStat))) / 50 + 2) *
          stabMultiplier *
          typeMultiplier *
          critMultiplier *
          variance;

        let finalDamage = Math.max(1, Math.floor(baseDamage));
        if (defender.isDefending) {
          finalDamage = Math.max(1, Math.floor(finalDamage * 0.5));
          defender.isDefending = false; // Defense shield consumed
        }

        damage = finalDamage;
        defender.currentHp = Math.max(0, defender.currentHp - damage);

        // Build combat log
        const moveName =
          action === "special" ? `[${moveType.toUpperCase()}] Special` : "Physical Strike";
        const critText = isCritical ? " 💥 A critical hit!" : "";
        let effectText = "";
        if (typeMultiplier >= 2) effectText = " 🔥 It's super effective!";
        else if (typeMultiplier > 0 && typeMultiplier < 1)
          effectText = " 🛡️ It's not very effective...";

        logMessage = `⚔️ *${attacker.name}* used *${moveName}* dealing *${damage}* dmg!${critText}${effectText}`;
      }
    }

    const targetFainted = defender.currentHp <= 0;
    const isFinished = targetFainted;
    const winnerTrainerId = targetFainted ? activeTrainer.id : undefined;

    const result: TurnActionResult = {
      attackerTrainerId: activeTrainer.id,
      attackerName: activeTrainer.name,
      action,
      damageDealt: damage,
      typeMultiplier,
      isCritical,
      logMessage,
      targetFainted,
    };

    const nextTurnTrainerId = isFinished ? state.currentTurnTrainerId : defenderTrainer.id;

    const updatedState: BattleState = {
      ...state,
      trainerA: isTrainerATurn
        ? { ...activeTrainer, pokemon: { ...attacker } }
        : { ...defenderTrainer, pokemon: { ...defender } },
      trainerB: isTrainerATurn
        ? { ...defenderTrainer, pokemon: { ...defender } }
        : { ...activeTrainer, pokemon: { ...attacker } },
      turnCount: state.turnCount + 1,
      currentTurnTrainerId: nextTurnTrainerId,
      isFinished,
      winnerTrainerId,
      lastTurnLog: logMessage,
    };

    return { state: updatedState, result };
  }

  /**
   * Renders a 5-block graphical HP bar representation.
   * Example: 🟩🟩🟩🟨⬜
   */
  public static renderHpBar(currentHp: number, maxHp: number, totalBlocks = 5): string {
    if (maxHp <= 0) return "⬜".repeat(totalBlocks);
    const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
    const filledBlocks = Math.round(ratio * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;

    const blockEmoji = ratio > 0.5 ? "🟩" : ratio > 0.2 ? "🟨" : "🟥";
    return blockEmoji.repeat(filledBlocks) + "⬜".repeat(emptyBlocks);
  }
}
