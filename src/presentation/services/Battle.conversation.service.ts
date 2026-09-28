import { randomUUID } from "node:crypto";
import { InlineKeyboard } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import { CONVERSATION_TIMEOUT_MS } from "../../domain/data/constants.js";
import { BattleEngine } from "../../domain/battle/battleEngine.js";
import type {
  BattleActionType,
  BattlePokemonStats,
  BattleState,
} from "../../domain/battle/types.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import type { AppContext } from "../data/types.js";
import { addConversation } from "./addConversation.decorator.js";
import type { BattleService } from "./battle.service.js";
import type { DBService } from "./db.service.js";

export class BattleConversation {
  constructor(
    private readonly dbService: DBService,
    private readonly battleService: BattleService,
  ) {}

  @addConversation
  public async battle(conv: Conversation<AppContext>, ctx: AppContext) {
    const challengerTelegramId = ctx.from?.id;
    if (!challengerTelegramId) return;

    const challengerUser = await conv.external(() =>
      this.dbService.findUserByTelegramId(challengerTelegramId),
    );

    if (!challengerUser) {
      await ctx.reply("You are not registered! Use /register first.");
      return;
    }

    if (challengerUser.pokemons.length === 0) {
      await ctx.reply("You don't have any pokemon yet! Catch one with /generate_pokemon.");
      return;
    }

    const battleId = await conv.external(() => randomUUID().slice(0, 8));
    const challengerName = challengerUser.username;

    const acceptKeyboard = new InlineKeyboard().text(
      "⚔️ Accept Challenge / ¡Aceptar Desafío!",
      `battle:${battleId}:accept`,
    );

    const inviteMsg = await ctx.reply(
      `⚔️ **${challengerName}** has issued a Pokémon battle challenge!\n\nWho dares to accept the challenge?`,
      { reply_markup: acceptKeyboard, parse_mode: "Markdown" },
    );

    let opponentUser: UserEntity | null = null;
    let opponentTelegramId: number | bigint = 0n;

    while (!opponentUser) {
      const acceptCtx = await conv.waitForCallbackQuery(`battle:${battleId}:accept`, {
        maxMilliseconds: CONVERSATION_TIMEOUT_MS,
      });

      const clickerId = acceptCtx.callbackQuery.from.id;
      if (BigInt(clickerId) === BigInt(challengerTelegramId)) {
        await acceptCtx.answerCallbackQuery({
          text: "You cannot battle against yourself!",
          show_alert: true,
        });
        continue;
      }

      const foundUser = await conv.external(() => this.dbService.findUserByTelegramId(clickerId));

      if (!foundUser) {
        await acceptCtx.answerCallbackQuery({
          text: "You are not registered! Register with /register to battle.",
          show_alert: true,
        });
        continue;
      }

      if (foundUser.pokemons.length === 0) {
        await acceptCtx.answerCallbackQuery({
          text: "You don't have any pokemon to battle with!",
          show_alert: true,
        });
        continue;
      }

      await acceptCtx.answerCallbackQuery({ text: "Challenge accepted!" });
      opponentUser = foundUser;
      opponentTelegramId = BigInt(clickerId);
    }

    await ctx.api.deleteMessage(inviteMsg.chat.id, inviteMsg.message_id).catch(() => {});

    // Challenger Pokemon Selection
    const challengerKb = new InlineKeyboard();
    challengerUser.pokemons.forEach((p, idx) => {
      const displayName = `${p.nickname ? `${p.nickname} (${p.name})` : p.name}${p.isShiny ? " ✨" : ""}`;
      challengerKb.text(displayName, `battle:${battleId}:pick:A:${p.id ?? idx}`);
      challengerKb.row();
    });

    const pickMsgA = await ctx.reply(`🔴 **${challengerName}**, choose your battle Pokémon:`, {
      reply_markup: challengerKb,
      parse_mode: "Markdown",
    });

    const pickCtxA = await conv
      .waitForCallbackQuery(new RegExp(`^battle:${battleId}:pick:A:(.+)$`), {
        maxMilliseconds: CONVERSATION_TIMEOUT_MS,
      })
      .andFrom(ctx.from!);

    await pickCtxA.answerCallbackQuery();
    const chosenPokemonIdA = pickCtxA.match[1];
    const pokemonA =
      challengerUser.pokemons.find(
        (p, idx) => (p.id ? String(p.id) : String(idx)) === chosenPokemonIdA,
      ) ?? challengerUser.pokemons[0]!;

    await ctx.api.deleteMessage(pickMsgA.chat.id, pickMsgA.message_id).catch(() => {});

    // Opponent Pokemon Selection
    const opponentName = opponentUser.username;
    const opponentKb = new InlineKeyboard();
    opponentUser.pokemons.forEach((p, idx) => {
      const displayName = `${p.nickname ? `${p.nickname} (${p.name})` : p.name}${p.isShiny ? " ✨" : ""}`;
      opponentKb.text(displayName, `battle:${battleId}:pick:B:${p.id ?? idx}`);
      opponentKb.row();
    });

    const pickMsgB = await ctx.reply(`🔵 **${opponentName}**, choose your battle Pokémon:`, {
      reply_markup: opponentKb,
      parse_mode: "Markdown",
    });

    const pickCtxB = await conv
      .waitForCallbackQuery(new RegExp(`^battle:${battleId}:pick:B:(.+)$`), {
        maxMilliseconds: CONVERSATION_TIMEOUT_MS,
      })
      .andFrom(Number(opponentTelegramId));

    await pickCtxB.answerCallbackQuery();
    const chosenPokemonIdB = pickCtxB.match[1];
    const pokemonB =
      opponentUser.pokemons.find(
        (p, idx) => (p.id ? String(p.id) : String(idx)) === chosenPokemonIdB,
      ) ?? opponentUser.pokemons[0]!;

    await ctx.api.deleteMessage(pickMsgB.chat.id, pickMsgB.message_id).catch(() => {});

    // Resolve Battle Pokemon Stats
    const [battlePokemonA, battlePokemonB] = await conv.external(() =>
      Promise.all([
        this.battleService.resolveBattlePokemon(pokemonA),
        this.battleService.resolveBattlePokemon(pokemonB),
      ]),
    );

    let battleState = await conv.external(() =>
      BattleEngine.initBattle(
        battleId,
        {
          id: "trainerA",
          telegramId: challengerTelegramId,
          name: challengerName,
          pokemon: battlePokemonA,
        },
        {
          id: "trainerB",
          telegramId: opponentTelegramId,
          name: opponentName,
          pokemon: battlePokemonB,
        },
      ),
    );

    const renderBattlefield = (state: BattleState, combatLog?: string) => {
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
        const winner =
          state.winnerTrainerId === state.trainerA.id ? state.trainerA : state.trainerB;
        const winnerPokemon = winner.pokemon;
        text += `\n🏆 **VICTORY!**\n🎉 **${winner.name}** and **${winnerPokemon.name}** won the battle!\n⭐ **${winnerPokemon.name}** gained +1 combat experience!`;
      } else {
        const activeTrainer =
          state.currentTurnTrainerId === state.trainerA.id ? state.trainerA : state.trainerB;
        text += `\n👉 Turn ${state.turnCount}: It's **${activeTrainer.name}**'s turn!`;
      }

      return text;
    };

    const makeActionKeyboard = (actionPokemon: BattlePokemonStats) => {
      const kb = new InlineKeyboard();
      kb.text("⚔️ Strike", `battle:${battleId}:act:attack`)
        .text(`✨ ${actionPokemon.primaryType.toUpperCase()}`, `battle:${battleId}:act:special`)
        .row()
        .text("🛡️ Defend", `battle:${battleId}:act:defend`)
        .text("⚡ Charge", `battle:${battleId}:act:charge`);
      return kb;
    };

    const initialActive =
      battleState.currentTurnTrainerId === battleState.trainerA.id
        ? battleState.trainerA
        : battleState.trainerB;

    const battleMsg = await ctx.reply(renderBattlefield(battleState), {
      reply_markup: makeActionKeyboard(initialActive.pokemon),
      parse_mode: "Markdown",
    });

    const MAX_BATTLE_TURNS = 50;
    while (!battleState.isFinished && battleState.turnCount <= MAX_BATTLE_TURNS) {
      const activeTrainer =
        battleState.currentTurnTrainerId === battleState.trainerA.id
          ? battleState.trainerA
          : battleState.trainerB;

      const actionCtx = await conv
        .waitForCallbackQuery(
          new RegExp(`^battle:${battleId}:act:(attack|special|defend|charge)$`),
          {
            maxMilliseconds: CONVERSATION_TIMEOUT_MS,
          },
        )
        .andFrom(Number(activeTrainer.telegramId));

      await actionCtx.answerCallbackQuery();
      const action = actionCtx.match[1] as BattleActionType;

      const { state: nextState, result } = await conv.external(() =>
        BattleEngine.executeTurn(battleState, action),
      );
      battleState = nextState;

      if (battleState.isFinished) {
        const winner =
          battleState.winnerTrainerId === battleState.trainerA.id
            ? battleState.trainerA
            : battleState.trainerB;

        if (winner.pokemon.id) {
          await conv.external(() =>
            this.battleService.awardVictory(winner.telegramId!, winner.pokemon.id!),
          );
        }

        await ctx.api
          .editMessageText(
            battleMsg.chat.id,
            battleMsg.message_id,
            renderBattlefield(battleState, result.logMessage),
            { parse_mode: "Markdown" },
          )
          .catch(() => {});
        break;
      }

      const nextActive =
        battleState.currentTurnTrainerId === battleState.trainerA.id
          ? battleState.trainerA
          : battleState.trainerB;

      await ctx.api
        .editMessageText(
          battleMsg.chat.id,
          battleMsg.message_id,
          renderBattlefield(battleState, result.logMessage),
          {
            reply_markup: makeActionKeyboard(nextActive.pokemon),
            parse_mode: "Markdown",
          },
        )
        .catch(() => {});
    }
  }
}
