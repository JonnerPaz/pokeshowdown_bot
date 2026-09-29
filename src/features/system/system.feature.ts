import { Composer } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import type { AppContext } from "../../presentation/data/types.js";
import { getAllCommands } from "../../presentation/controllers/commands.js";
import { registerFeatureCommand } from "../common/commandHelper.js";
import { displayCommandError } from "../common/errorHandler.js";

export function createSystemFeature(): Composer<AppContext> {
  const feature = new Composer<AppContext>();
  const commandGroup = new CommandGroup<AppContext>();

  registerFeatureCommand(commandGroup, "HELP", async (ctx: AppContext) => {
    try {
      let msg = `List of commands of @${ctx.me.username}:\n`;

      const engCommands = getAllCommands();
      const spaCommmands = getAllCommands("es");

      msg += "English Commands:\n";
      engCommands.forEach((command) => {
        msg += `/${command.command} - ${command.description}\n`;
      });

      msg += "\nSpanish Commands:\n";
      spaCommmands.forEach((command) => {
        msg += `/${command.command} - ${command.description}\n`;
      });
      await ctx.reply(msg + "\nFor more information, type /start");
    } catch (error) {
      await displayCommandError(error as Error, ctx);
    }
  });

  feature.use(commandGroup.middleware());
  return feature;
}
