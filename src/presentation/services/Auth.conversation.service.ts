import type { AppContext } from "../data/types.js";
import { addConversation } from "./addConversation.decorator.js";
import { DBService } from "./db.service.js";
import { Conversation } from "@grammyjs/conversations";
import {
  startConversation,
  registerConversation,
  deleteAccountConversation,
} from "../../features/auth/auth.conversations.js";

export class AuthConversation {
  constructor(private readonly dbService: DBService) {}

  @addConversation
  public async start(conv: Conversation<AppContext>, ctx: AppContext) {
    return await startConversation(conv, ctx);
  }

  @addConversation
  public async register(conv: Conversation<AppContext>, ctx: AppContext) {
    return await registerConversation(conv, ctx, {
      userDataSource: this.dbService.userDataSource,
      pokeApi: this.dbService.pokemonService,
    });
  }

  @addConversation
  public async deleteAccount(conv: Conversation<AppContext>, ctx: AppContext) {
    return await deleteAccountConversation(conv, ctx, {
      userDataSource: this.dbService.userDataSource,
      pokeApi: this.dbService.pokemonService,
    });
  }
}
