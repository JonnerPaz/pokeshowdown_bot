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
    .localize(LanguageCodes.Spanish, commandSpa, descriptionSpa);
}

export function registerFeatureConversationCommand<T extends AppContext>(
  group: CommandGroup<T>,
  cmdName: CommandKeys,
  conversationName: string,
): Command<T> {
  return registerFeatureCommand(group, cmdName, async (ctx: T) => {
    try {
      await exitActiveConversations(ctx, conversationName);
      await ctx.conversation.enter(conversationName);
    } catch (error) {
      await displayCommandError(error as Error, ctx);
    }
  });
}

/**
 * Clears stale state before entering a conversation again.
 *
 * Conversation state is keyed per chat, so in a private chat every active flow
 * belongs to the same trainer and clearing everything is safe. In a group the
 * same key is shared by all trainers, hence exiting everything would abort other
 * trainers' ongoing trades or battles: only the conversation being restarted is
 * exited.
 */
async function exitActiveConversations<T extends AppContext>(
  ctx: T,
  conversationName: string,
): Promise<void> {
  if (ctx.chat?.type === "private") {
    await ctx.conversation.exitAll();
    return;
  }

  await ctx.conversation.exit(conversationName);
}
