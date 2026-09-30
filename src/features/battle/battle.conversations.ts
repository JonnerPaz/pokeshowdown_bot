import { randomUUID } from "node:crypto";
import { BattleEngine } from "../../domain/battle/battleEngine.js";
import type { BattleActionType } from "../../domain/battle/types.js";
import { CONVERSATION_TIMEOUT_MS } from "../../domain/data/constants.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { AppContext, AppConversation } from "../../presentation/data/types.js";
import type { BattleService } from "./battle.service.js";
import {
  createBattleInviteKeyboard,
  createPokemonPickKeyboard,
  createBattleActionKeyboard,
  renderBattlefield,
} from "./battle.keyboards.js";

export interface BattleConversationDeps {
  userDataSource: UserDataSource;
  battleService: BattleService;
}

export async function battleConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: BattleConversationDeps,
) {
  const challengerTelegramId = ctx.from?.id;
  if (!challengerTelegramId) return;

  const challengerUser = await conv.external(() =>
    deps.userDataSource.findUserByTelegramId(challengerTelegramId),
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

  const acceptKeyboard = createBattleInviteKeyboard(battleId);
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

    const foundUser = await conv.external(() =>
      deps.userDataSource.findUserByTelegramId(clickerId),
    );

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

  const challengerParty = (challengerUser.pokemons ?? []).filter((p) => p.isInParty !== false);
  const challengerCandidates =
    challengerParty.length > 0 ? challengerParty : challengerUser.pokemons;
  const challengerKb = createPokemonPickKeyboard(battleId, "A", challengerCandidates);
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
    challengerCandidates.find(
      (p, idx) => (p.id ? String(p.id) : String(idx)) === chosenPokemonIdA,
    ) ?? challengerCandidates[0]!;

  await ctx.api.deleteMessage(pickMsgA.chat.id, pickMsgA.message_id).catch(() => {});

  // Opponent Pokemon Selection
  const opponentName = opponentUser.username;
  const opponentParty = (opponentUser.pokemons ?? []).filter((p) => p.isInParty !== false);
  const opponentCandidates = opponentParty.length > 0 ? opponentParty : opponentUser.pokemons;
  const opponentKb = createPokemonPickKeyboard(battleId, "B", opponentCandidates);
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
    opponentCandidates.find((p, idx) => (p.id ? String(p.id) : String(idx)) === chosenPokemonIdB) ??
    opponentCandidates[0]!;

  await ctx.api.deleteMessage(pickMsgB.chat.id, pickMsgB.message_id).catch(() => {});

  // Resolve Battle Pokemon Stats
  const [battlePokemonA, battlePokemonB] = await conv.external(() =>
    Promise.all([
      deps.battleService.resolveBattlePokemon(pokemonA),
      deps.battleService.resolveBattlePokemon(pokemonB),
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

  const initialActive =
    battleState.currentTurnTrainerId === battleState.trainerA.id
      ? battleState.trainerA
      : battleState.trainerB;

  const battleMsg = await ctx.reply(renderBattlefield(battleState), {
    reply_markup: createBattleActionKeyboard(battleId, initialActive.pokemon),
    parse_mode: "Markdown",
  });

  const MAX_BATTLE_TURNS = 50;
  while (!battleState.isFinished && battleState.turnCount <= MAX_BATTLE_TURNS) {
    const activeTrainer =
      battleState.currentTurnTrainerId === battleState.trainerA.id
        ? battleState.trainerA
        : battleState.trainerB;

    const actionCtx = await conv
      .waitForCallbackQuery(new RegExp(`^battle:${battleId}:act:(attack|special|defend|charge)$`), {
        maxMilliseconds: CONVERSATION_TIMEOUT_MS,
      })
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
      const loser =
        battleState.winnerTrainerId === battleState.trainerA.id
          ? battleState.trainerB
          : battleState.trainerA;

      await conv.external(() =>
        deps.battleService.recordBattleOutcome(
          winner.telegramId!,
          loser.telegramId!,
          winner.pokemon.id ?? undefined,
        ),
      );

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
          reply_markup: createBattleActionKeyboard(battleId, nextActive.pokemon),
          parse_mode: "Markdown",
        },
      )
      .catch(() => {});
  }
}
