import { BaseCommandController } from "./BaseCommandController.js";
import type { AppContext } from "../data/types.js";
import { Bot } from "grammy";

export class AuthController extends BaseCommandController<AppContext> {
  constructor(bot: Bot<AppContext>) {
    super(bot);
  }

  public async start() {
    return this.registerConversationCommand("START", "start");
  }

  public async register() {
    return this.registerConversationCommand("REGISTER", "register");
  }

  public async deleteAccount() {
    return this.registerConversationCommand("DELETE_ACCOUNT", "deleteAccount");
  }
}
