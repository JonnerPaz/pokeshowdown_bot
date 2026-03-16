import { Command, CommandGroup, LanguageCodes } from "@grammyjs/commands";
import type { AppContext } from "../data/types.js";
import { Bot } from "grammy";
import { type CommandKeys, getCommandInfo } from "./commands.js";

export abstract class BaseCommandController<T extends AppContext> {
  protected bot: Bot<T>;
  public botCommands = new CommandGroup<T>();

  constructor(bot: Bot<T>) {
    this.bot = bot;
  }

  public middleware() {
    return this.botCommands.middleware();
  }

  protected async registerCommand(
    cmdName: CommandKeys,
    handler: (ctx: T) => Promise<void>,
  ): Promise<Command<T>> {
    const { command, description } = getCommandInfo(cmdName);
    const { command: commandSpa, description: descriptionSpa } = getCommandInfo(
      cmdName,
      LanguageCodes.Spanish,
    );
    return this.botCommands
      .command(command, description, handler)
      .addToScope({ type: "all_group_chats" })
      .localize(LanguageCodes.Spanish, commandSpa, descriptionSpa);
  }

  protected async displayError(e: Error, ctx: T, msg?: string) {
    console.error(e);
    return msg
      ? ctx.reply(msg)
      : ctx.reply("There was an error during request. Please report it");
  }
}
