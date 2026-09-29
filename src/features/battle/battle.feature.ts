import { Composer } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import { createConversation } from "@grammyjs/conversations";
import type { AppContext } from "../../presentation/data/types.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { BattleService } from "./battle.service.js";
import { battleConversation } from "./battle.conversations.js";
import { registerFeatureConversationCommand } from "../common/commandHelper.js";

export interface BattleFeatureDeps {
  userDataSource: UserDataSource;
  battleService: BattleService;
}

export function createBattleFeature(deps: BattleFeatureDeps): Composer<AppContext> {
  const feature = new Composer<AppContext>();
  const commandGroup = new CommandGroup<AppContext>();

  // Mount conversations
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => battleConversation(conv, ctx, deps),
      "battle",
    ),
  );

  // Mount commands
  registerFeatureConversationCommand(commandGroup, "BATTLE", "battle");

  feature.use(commandGroup.middleware());
  return feature;
}
