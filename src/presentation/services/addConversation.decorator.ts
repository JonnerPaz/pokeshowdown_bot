import type { ConversationBuilder } from "@grammyjs/conversations";
import type { AppContext } from "../data/types.js";

export const botConversations = new Map<string, ConversationBuilder<AppContext, AppContext>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- decorator plumbing needs dynamic method types
export function addConversation(method: any, context: ClassMethodDecoratorContext) {
  if (context.kind !== "method") {
    throw new Error("addConversation decorator can only be used on methods");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- decorator plumbing needs dynamic method types
  context.addInitializer(function (this: any) {
    const conversationName = context.name.toString();
    botConversations.set(conversationName, method.bind(this));
  });
}
