import { Command, CommandGroup, LanguageCodes } from "@grammyjs/commands";
import type { AppContext } from "../../presentation/data/types.js";
import { type CommandKeys, getCommandInfo } from "../../presentation/controllers/commands.js";
import { displayCommandError } from "./errorHandler.js";

export function registerFeatureCommand<T extends AppContext>(
  group: CommandGroup<T>,
  cmdName: CommandKeys,
  handler: (ctx: T) => Promise<void>,
): Command<T> {
  const { command, description } = getCommandInfo(cmdName);
  const { command: commandSpa, description: descriptionSpa } = getCommandInfo(
    cmdName,
    LanguageCodes.Spanish,
  );
  return group
    .command(command, description, handler)
    .addToScope({ type: "all_group_chats" })
    .localize(LanguageCodes.Spanish, commandSpa, descriptionSpa);
}

export function registerFeatureConversationCommand<T extends AppContext>(
  group: CommandGroup<T>,
  cmdName: CommandKeys,
  conversationName: string,
): Command<T> {
  return registerFeatureCommand(group, cmdName, async (ctx: T) => {
    try {
      await ctx.conversation.enter(conversationName);
    } catch (error) {
      await displayCommandError(error as Error, ctx);
    }
  });
}
