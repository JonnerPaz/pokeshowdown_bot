import { BaseCommandController } from "./BaseCommandController.js";
import type { AppContext } from "../data/types.js";
import { Bot } from "grammy";

export class BattleController extends BaseCommandController<AppContext> {
  constructor(bot: Bot<AppContext>) {
    super(bot);
  }

  public async battle() {
    return this.registerConversationCommand("BATTLE", "battle");
  }
}
