import { Composer } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import type { AppContext } from "../../presentation/data/types.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import { registerFeatureCommand } from "../common/commandHelper.js";
import { formatBagMessage, processDailyClaim } from "./inventory.service.js";

export interface InventoryFeatureDeps {
  userDataSource: UserDataSource;
}

export function createInventoryFeature(deps: InventoryFeatureDeps): Composer<AppContext> {
  const feature = new Composer<AppContext>();
  const commandGroup = new CommandGroup<AppContext>();

  registerFeatureCommand(commandGroup, "BAG", async (ctx) => {
    if (!ctx.from) return;
    const user = await deps.userDataSource.findUserByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply("You are not registered! Use /register to get started.");
      return;
    }

    const message = formatBagMessage(user);
    await ctx.reply(message, { parse_mode: "Markdown" });
  });

  registerFeatureCommand(commandGroup, "DAILY", async (ctx) => {
    if (!ctx.from) return;
    const user = await deps.userDataSource.findUserByTelegramId(ctx.from.id);
    if (!user) {
      await ctx.reply("You are not registered! Use /register to get started.");
      return;
    }

    const result = processDailyClaim(user);
    if (!result.claimed) {
      await ctx.reply(
        `⏳ You've already claimed your daily bonus today! Next claim available in ${result.formattedRemaining}.`,
      );
      return;
    }

    await deps.userDataSource.updateUser(user, result.updatedFields);

    const { rewards, newStreak } = result;
    const bonusLines: string[] = [];
    if (rewards.ultraballs > 0) {
      bonusLines.push(`+${rewards.ultraballs} 🟡 Ultra Ball(s) (Streak Bonus!)`);
    }
    if (rewards.masterballs > 0) {
      bonusLines.push(`+${rewards.masterballs} 🟣 Master Ball! (Milestone Reward!)`);
    }

    const bonusText = bonusLines.length > 0 ? `\n${bonusLines.join("\n")}` : "";

    await ctx.reply(
      `🎁 *Daily Reward Claimed!*\n` +
        `🔥 *Current Streak: ${newStreak} day(s)*\n\n` +
        `*Received:*\n` +
        `+${rewards.pokeballs} 🔴 Pokéballs\n` +
        `+${rewards.greatballs} 🔵 Great Balls${bonusText}\n\n` +
        `Come back tomorrow to keep your streak going!`,
      { parse_mode: "Markdown" },
    );
  });

  feature.use(commandGroup.middleware());
  return feature;
}
