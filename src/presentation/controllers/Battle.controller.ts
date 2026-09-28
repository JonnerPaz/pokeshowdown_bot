import { BaseCommandController } from "./BaseCommandController.js";
import type { AppContext } from "../data/types.js";
import { Bot } from "grammy";

export class BattleController extends BaseCommandController<AppContext> {
  constructor(bot: Bot<AppContext>) {
    super(bot);
  }

  public async battle() {
    const handler = async (ctx: AppContext) => {
      try {
        return await ctx.conversation.enter("battle");
      } catch (error) {
        this.displayError(error as Error, ctx);
      }
    };

    return this.registerCommand("BATTLE", async (ctx: AppContext) => await handler(ctx));
  }
}
