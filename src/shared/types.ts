import type { CommandsFlavor } from "@grammyjs/commands";
import type { ConversationFlavor } from "@grammyjs/conversations";
import { Context } from "grammy";

export type AppContext = CommandsFlavor<Context> & ConversationFlavor<Context>;
