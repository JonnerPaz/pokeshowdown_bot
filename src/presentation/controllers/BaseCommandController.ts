import { Command, CommandGroup, LanguageCodes } from "@grammyjs/commands";
import type { AppContext } from "../data/types.js";
import { Bot } from "grammy";
import { type CommandKeys, getCommandInfo } from "./commands.js";

export abstract class BaseCommandController<
  T extends AppContext,
> extends CommandGroup<T> {
  protected bot: Bot<T>;

  constructor(bot: Bot<T>) {
    super();
    this.bot = bot;
  }

  protected async useCommand(
    cmdName: CommandKeys,
    handler: (ctx: T) => Promise<void>,
  ): Promise<Command<T>> {
    const { command, description } = getCommandInfo(cmdName);
    const { command: commandSpa, description: descriptionSpa } = getCommandInfo(
      cmdName,
      LanguageCodes.Spanish,
    );
    return super
      .command(command, description, handler)
      .addToScope({ type: "all_group_chats" })
      .localize(LanguageCodes.Spanish, commandSpa, descriptionSpa);
  }
}
