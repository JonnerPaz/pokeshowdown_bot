import type { AppContext, AppConversation } from "../data/types.js";
import { addConversation } from "./addConversation.decorator.js";
import type { BattleService } from "../../features/battle/battle.service.js";
import type { DBService } from "./db.service.js";
import { battleConversation } from "../../features/battle/battle.conversations.js";

export class BattleConversation {
  constructor(
    private readonly dbService: DBService,
    private readonly battleService: BattleService,
  ) {}

  @addConversation
  public async battle(conv: AppConversation, ctx: AppContext) {
    return await battleConversation(conv, ctx, {
      userDataSource: this.dbService.userDataSource,
      battleService: this.battleService,
    });
  }
}
