import type { CommandsFlavor } from "@grammyjs/commands";
import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import { Context } from "grammy";

export type AppContext = CommandsFlavor<Context> & ConversationFlavor<Context>;
export type AppConversation = Conversation<AppContext, AppContext>;
