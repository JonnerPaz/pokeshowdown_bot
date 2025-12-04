import { Command, CommandGroup, LanguageCodes } from '@grammyjs/commands'
import { AppContext } from '../../shared/types.js'
import { Bot } from 'grammy'
import { CommandRegistry } from './commandRegistry.js'
import { CommandKeys, getCommandInfo } from '../commands.js'

export abstract class BaseCommandController<
  T extends AppContext,
> extends CommandGroup<T> {
  protected bot: Bot<T>
  protected registry: CommandRegistry
  protected _controllerMethods: Set<string>

  constructor(bot: Bot<T>) {
    super()
    this.bot = bot
  }

  public setRegistry(registry: CommandRegistry) {
    this.registry = registry
    return this
  }

  public async init() {
    try {
      if (!(this.constructor as any)._controllerMethods) {
        throw new Error(`Error: No methods found in ${this.constructor.name}`)
      }
      const methodNames: string[] = Array.from(
        (this.constructor as any)._controllerMethods
      )
      const methods = methodNames.map((key) => (this as any)[key]())
      this.add(methods)
      return
    } catch (err) {
      console.error(err)
    }
  }

  protected cmdHandler(
    cmdName: CommandKeys,
    handler: (ctx: T) => Promise<void>
  ): Command<T> {
    const { command, description } = getCommandInfo(cmdName)
    const { command: commandSpa, description: descriptionSpa } = getCommandInfo(
      cmdName,
      LanguageCodes.Spanish
    )
    return super
      .command(command, description, handler)
      .addToScope({ type: 'all_group_chats' })
      .localize(LanguageCodes.Spanish, commandSpa, descriptionSpa)
  }
}
