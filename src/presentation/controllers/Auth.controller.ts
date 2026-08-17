import { BaseCommandController } from "./BaseCommandController.js";
import type { AppContext } from "../data/types.js";
import { Bot } from "grammy";

export class AuthController extends BaseCommandController<AppContext> {
  constructor(bot: Bot<AppContext>) {
    super(bot);
  }

  public async start() {
    const handler = async (ctx: AppContext) => {
      try {
        return await ctx.conversation.enter("start");
      } catch (error) {
        super.displayError(error as Error, ctx);
      }
    };

    return this.registerCommand("START", async (ctx: AppContext) => await handler(ctx));
  }

  public async register() {
    const handler = async (ctx: AppContext) => {
      try {
        await ctx.conversation.enter("register");
      } catch (error) {
        super.displayError(error as Error, ctx);
      }
    };

    return this.registerCommand("REGISTER", async (ctx: AppContext) => await handler(ctx));
  }

  public async deleteAccount() {
    const handler = async (ctx: AppContext) => {
      try {
        await ctx.conversation.enter("deleteAccount");
      } catch (error) {
        super.displayError(error as Error, ctx);
      }
    };

    return this.registerCommand("DELETE_ACCOUNT", async (ctx: AppContext) => await handler(ctx));
  }
}
