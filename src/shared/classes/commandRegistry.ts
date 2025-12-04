import { Bot } from 'grammy'
import { AppContext, GlobalContext } from '../types'
import { BaseCommandController } from './BaseCommandController'

export class CommandRegistry {
  private controllers: Map<string, BaseCommandController<AppContext>> =
    new Map()

  constructor(public readonly bot: Bot<GlobalContext>) {}

  public register(name: string, controller: BaseCommandController<AppContext>) {
    this.controllers.set(name, controller)
  }

  public get<T extends BaseCommandController<AppContext>>(name: string): T {
    const controller = this.controllers.get(name)
    if (!controller) {
      throw new Error(`Controller ${name} not found in registry`)
    }

    return controller as T
  }

  public getAllCommands() {
    return Array.from(this.controllers.values())
  }
}
