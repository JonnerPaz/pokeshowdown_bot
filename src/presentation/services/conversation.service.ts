import { InlineKeyboard, InputMediaBuilder } from "grammy";
import { Conversation } from "@grammyjs/conversations";
import type { AppContext } from "../data/types.js";
import type { InputMediaPhoto } from "grammy/types";
import { EVOLVE_CAP } from "../../domain/data/constants.js";
import type { Context } from "grammy";
import { addConversation } from "./addConversation.decorator.js";
import { UserEntity } from "../../domain/entities/users.entity.js";
import type { DBService } from "./db.service.js";

export class ConversationService<T extends AppContext> {
  public botConversations = new Map<string, Conversation<AppContext>>();

  constructor(private readonly dbService: DBService) {}
}
