import { Composer } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import { createConversation } from "@grammyjs/conversations";
import type { AppContext } from "../../presentation/data/types.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";
import {
  startConversation,
  registerConversation,
  deleteAccountConversation,
} from "./auth.conversations.js";
import { registerFeatureConversationCommand } from "../common/commandHelper.js";

export interface AuthFeatureDeps {
  userDataSource: UserDataSource;
  pokeApi: PokeApiService;
}

export function createAuthFeature(deps: AuthFeatureDeps): Composer<AppContext> {
  const feature = new Composer<AppContext>();
  const commandGroup = new CommandGroup<AppContext>();

  // Mount conversations
  feature.use(createConversation<AppContext, AppContext>(startConversation, "start"));
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => registerConversation(conv, ctx, deps),
      "register",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => deleteAccountConversation(conv, ctx, deps),
      "deleteAccount",
    ),
  );

  // Mount commands
  registerFeatureConversationCommand(commandGroup, "START", "start");
  registerFeatureConversationCommand(commandGroup, "REGISTER", "register");
  registerFeatureConversationCommand(commandGroup, "DELETE_ACCOUNT", "deleteAccount");

  feature.use(commandGroup.middleware());
  return feature;
}
