import { CommandsFlavor } from "@grammyjs/commands";
import { Context } from "grammy";

export type GlobalContext = Context;

export type CommandsGroupContext = CommandsFlavor<GlobalContext>;
