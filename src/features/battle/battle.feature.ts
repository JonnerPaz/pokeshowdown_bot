import { CommandGroup } from "@grammyjs/commands";
import { Composer, InlineKeyboard } from "grammy";

import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { AppContext } from "../../presentation/data/types.js";
import type { ArenaService } from "../arena/arena.service.js";
import { ArenaError, type ArenaRoom } from "../arena/arena.types.js";
import { isGroupChat } from "../common/chatHelper.js";
import { registerFeatureCommand } from "../common/commandHelper.js";
import { escapeMarkdown } from "../common/stringHelper.js";

export interface BattleFeatureDeps {
  userDataSource: UserDataSource;
  arena?: ArenaService | null | undefined;
  webAppUrl?: string | undefined;
}

export function formatArenaBattleResult(room: ArenaRoom): string | null {
  if (!room.state) return null;

  const { trainerA, trainerB } = room.state;
  if (room.winnerTelegramId !== null) {
    const winner =
      Number(trainerA.telegramId ?? trainerA.id) === room.winnerTelegramId ? trainerA : trainerB;
    const loser = winner === trainerA ? trainerB : trainerA;
    const winnerName = escapeMarkdown(winner.name);
    const winnerPokemon = escapeMarkdown(winner.pokemon.name);
    const loserName = escapeMarkdown(loser.name);
    const loserPokemon = escapeMarkdown(loser.pokemon.name);

    if (room.finishReason === "forfeit") {
      return `🏆 *${winnerName}* (${winnerPokemon}) defeated *${loserName}* (${loserPokemon}) by forfeit in Arena \`#${room.code}\`!`;
    }
    if (room.finishReason === "abandoned") {
      return `🏆 *${winnerName}* (${winnerPokemon}) won against *${loserName}* (${loserPokemon}) by abandonment in Arena \`#${room.code}\`!`;
    }
    return `🏆 *${winnerName}* (${winnerPokemon}) defeated *${loserName}* (${loserPokemon}) in Arena \`#${room.code}\`!`;
  }

  const nameA = escapeMarkdown(trainerA.name);
  const pokemonA = escapeMarkdown(trainerA.pokemon.name);
  const nameB = escapeMarkdown(trainerB.name);
  const pokemonB = escapeMarkdown(trainerB.pokemon.name);
  return `🤝 The Arena battle (\`#${room.code}\`) between *${nameA}* (${pokemonA}) and *${nameB}* (${pokemonB}) ended in a draw!`;
}

function buildArenaKeyboard(ctx: AppContext, webAppUrl: string, code: string): InlineKeyboard {
  if (isGroupChat(ctx)) {
    const deepLink = `https://t.me/${ctx.me.username}?startapp=${code}`;
    return new InlineKeyboard().url("⚔️ Join the battle", deepLink);
  }
  return new InlineKeyboard().webApp("⚔️ Open Arena", `${webAppUrl}?room=${code}`);
}

export function createBattleFeature(deps: BattleFeatureDeps): Composer<AppContext> {
  const feature = new Composer<AppContext>();
  const commandGroup = new CommandGroup<AppContext>();

  registerFeatureCommand(commandGroup, "BATTLE", async (ctx) => {
    if (!deps.arena || !deps.webAppUrl) {
      await ctx.reply("⚔️ The Battle Arena is not available right now.");
      return;
    }

    const fromId = ctx.from?.id;
    if (!fromId) return;

    const user = await deps.userDataSource.findUserByTelegramId(fromId);
    if (!user) {
      await ctx.reply("You are not registered! Use /register first.");
      return;
    }

    try {
      const chatId = isGroupChat(ctx) ? ctx.chat!.id : null;
      const room = deps.arena.createRoom(user, chatId);
      const trainerName = escapeMarkdown(user.username);
      const keyboard = buildArenaKeyboard(ctx, deps.webAppUrl, room.code);

      await ctx.reply(
        `⚔️ *${trainerName}* opened a Battle Arena room (\`#${room.code}\`)!\n\nTap below to join and pick your Pokémon:`,
        {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      if (error instanceof ArenaError) {
        if (error.code === "empty_party") {
          await ctx.reply(
            "Move at least one Pokémon to your active party with /box before battling!",
          );
          return;
        }
        if (error.code === "already_in_room") {
          const active = deps.arena.getCurrentRoom(fromId);
          if (active) {
            const keyboard = buildArenaKeyboard(ctx, deps.webAppUrl, active.code);
            await ctx.reply(
              `⚔️ You are already in an active Battle Arena room (\`#${active.code}\`). Finish or leave it first:`,
              {
                parse_mode: "Markdown",
                reply_markup: keyboard,
              },
            );
            return;
          }
        }
        await ctx.reply(error.message);
        return;
      }
      throw error;
    }
  });

  feature.use(commandGroup.middleware());
  return feature;
}
