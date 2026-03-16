import type { Bot } from "grammy";
import { BaseCommandController } from "./BaseCommandController.js";
import type { AppContext } from "../data/types.js";
import { getAllCommands } from "./commands.js";

export class SystemController extends BaseCommandController<AppContext> {
  constructor(bot: Bot<AppContext>) {
    super(bot);
  }

  public async help() {
    const handler = async (ctx: AppContext) => {
      try {
        let msg = `List of commands of @${ctx.me.username}:\n`;
        getAllCommands().forEach((command) => {
          msg += `/${command.command} - ${command.description}\n`;
        });
        await ctx.reply(msg + "\nFor more information, type /start");
      } catch (error) {
        super.displayError(error as Error, ctx);
      }
    };

    return this.registerCommand(
      "HELP",
      async (ctx: AppContext) => await handler(ctx),
    );
  }
}
