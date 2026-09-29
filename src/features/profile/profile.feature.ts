import { Composer } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import type { AppContext } from "../../presentation/data/types.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import { registerFeatureCommand } from "../common/commandHelper.js";
import {
  findPokemonForBuddy,
  formatLeaderboard,
  formatProfileCard,
  getBuddyPokemon,
} from "./profile.service.js";

export interface ProfileFeatureDeps {
  userDataSource: UserDataSource;
}

export function createProfileFeature(deps: ProfileFeatureDeps): Composer<AppContext> {
  const feature = new Composer<AppContext>();
  const commandGroup = new CommandGroup<AppContext>();

  registerFeatureCommand(commandGroup, "PROFILE", async (ctx) => {
    if (!ctx.from) return;
    const user = await deps.userDataSource.findUserByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply("You are not registered! Use /register to get started.");
      return;
    }

    const card = formatProfileCard(user);
    if (card.spriteUrl) {
      await ctx.api
        .sendPhoto(ctx.chat!.id, card.spriteUrl, {
          caption: card.text,
          parse_mode: "Markdown",
        })
        .catch(async () => {
          await ctx.reply(card.text, { parse_mode: "Markdown" });
        });
    } else {
      await ctx.reply(card.text, { parse_mode: "Markdown" });
    }
  });

  registerFeatureCommand(commandGroup, "LEADERBOARD", async (ctx) => {
    const topUsers = await deps.userDataSource.getLeaderboard(10);
    const text = formatLeaderboard(topUsers, ctx.from?.id);
    await ctx.reply(text, { parse_mode: "Markdown" });
  });

  registerFeatureCommand(commandGroup, "BUDDY", async (ctx) => {
    if (!ctx.from) return;
    const user = await deps.userDataSource.findUserByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply("You are not registered! Use /register to get started.");
      return;
    }

    const rawText = ctx.message?.text ?? "";
    const parts = rawText.trim().split(/\s+/);
    const query = parts.slice(1).join(" ");

    if (!query) {
      const currentBuddy = getBuddyPokemon(user);
      const buddyInfo = currentBuddy
        ? `${currentBuddy.nickname ? `${currentBuddy.nickname} (${currentBuddy.name})` : currentBuddy.name}`
        : "None";
      await ctx.reply(
        `⭐ *Your current buddy:* ${buddyInfo}\n\nTo set or change your buddy, use:\n\`/buddy <pokemon_name>\``,
        { parse_mode: "Markdown" },
      );
      return;
    }

    const result = findPokemonForBuddy(user, query);
    if ("error" in result) {
      await ctx.reply(result.error);
      return;
    }

    await deps.userDataSource.updateUser(user, {
      buddyPokemonId: result.found.id,
    });

    const displayName = result.found.nickname
      ? `${result.found.nickname} (${result.found.name})`
      : result.found.name;
    const shinyStr = result.found.isShiny ? " ✨" : "";

    await ctx.reply(`⭐ Great choice! You set *${displayName}*${shinyStr} as your buddy Pokémon!`, {
      parse_mode: "Markdown",
    });
  });

  feature.use(commandGroup.middleware());
  return feature;
}
