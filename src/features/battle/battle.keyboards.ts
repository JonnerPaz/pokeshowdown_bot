import { InlineKeyboard } from "grammy";
import { BattleEngine } from "../../domain/battle/battleEngine.js";
import type { BattlePokemonStats, BattleState } from "../../domain/battle/types.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";

export function createBattleInviteKeyboard(battleId: string): InlineKeyboard {
  return new InlineKeyboard().text(
    "⚔️ Accept Challenge / ¡Aceptar Desafío!",
    `battle:${battleId}:accept`,
  );
}

export function createPokemonPickKeyboard(
  battleId: string,
  side: "A" | "B",
  pokemons: PokemonEntity[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  pokemons.forEach((p, idx) => {
    const displayName = `${p.nickname ? `${p.nickname} (${p.name})` : p.name}${p.isShiny ? " ✨" : ""}`;
    kb.text(displayName, `battle:${battleId}:pick:${side}:${p.id ?? idx}`);
    kb.row();
  });
  return kb;
}

export function createBattleActionKeyboard(
  battleId: string,
  actionPokemon: BattlePokemonStats,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.text("⚔️ Strike", `battle:${battleId}:act:attack`)
    .text(`✨ ${actionPokemon.primaryType.toUpperCase()}`, `battle:${battleId}:act:special`)
    .row()
    .text("🛡️ Defend", `battle:${battleId}:act:defend`)
    .text("⚡ Charge", `battle:${battleId}:act:charge`);
  return kb;
}

export function renderBattlefield(state: BattleState, combatLog?: string): string {
  const pA = state.trainerA.pokemon;
  const pB = state.trainerB.pokemon;
  const hpBarA = BattleEngine.renderHpBar(pA.currentHp, pA.maxHp);
  const hpBarB = BattleEngine.renderHpBar(pB.currentHp, pB.maxHp);

  const statusA = pA.isDefending ? " [🛡️ Defending]" : pA.isCharged ? " [⚡ Charged]" : "";
  const statusB = pB.isDefending ? " [🛡️ Defending]" : pB.isCharged ? " [⚡ Charged]" : "";

  let text = `🏟️ **POKEMON SHOWDOWN BATTLE**\n\n`;
  text += `🔴 **${state.trainerA.name}**: ${pA.name}${pA.isShiny ? " ✨" : ""}\n`;
  text += `${hpBarA} ${pA.currentHp}/${pA.maxHp} HP${statusA}\n\n`;
  text += `🔵 **${state.trainerB.name}**: ${pB.name}${pB.isShiny ? " ✨" : ""}\n`;
  text += `${hpBarB} ${pB.currentHp}/${pB.maxHp} HP${statusB}\n`;

  if (combatLog) {
    text += `\n━━━━━━━━━━━━━━━━━━━━\n${combatLog}\n━━━━━━━━━━━━━━━━━━━━\n`;
  }

  if (state.isFinished) {
    const winner = state.winnerTrainerId === state.trainerA.id ? state.trainerA : state.trainerB;
    const winnerPokemon = winner.pokemon;
    text += `\n🏆 **VICTORY!**\n🎉 **${winner.name}** and **${winnerPokemon.name}** won the battle!\n⭐ **${winnerPokemon.name}** gained +1 combat experience!`;
  } else {
    const activeTrainer =
      state.currentTurnTrainerId === state.trainerA.id ? state.trainerA : state.trainerB;
    text += `\n👉 Turn ${state.turnCount}: It's **${activeTrainer.name}**'s turn!`;
  }

  return text;
}
