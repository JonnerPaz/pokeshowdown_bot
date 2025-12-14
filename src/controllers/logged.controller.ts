import { BaseCommandController } from '../shared/classes/BaseCommandController.js'
import { AppContext } from '../shared/types.js'
import { Command } from '@grammyjs/commands'
import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { Bot } from 'grammy'

export class LoggedController<
  T extends AppContext,
> extends BaseCommandController<T> {
  constructor(public bot: Bot<T>) {
    super(bot)
  }

  @addCommand
  public async logout(): Promise<Command<T>> {
    const handler = async (ctx: T) => {
      try {
        const loginController = this.registry.get('login')
        if (!loginController) {
          throw new Error('Login controller not set')
        }
        await ctx.setMyCommands(loginController)
        await ctx.reply('Bye')
      } catch (error) {
        console.error(error)
        ctx.reply('There was an error during request. Please report it')
      }
    }

    return await this.cmdHandler('LOGOUT', handler)
  }

  @addCommand
  public async deleteAccount() {
    const handler = async (ctx: T) => {
      try {
        return await ctx.conversation.enter('deleteAccount')
      } catch (error) {
        console.log(error)
        await ctx.reply('There was an error during request. Please report it')
      }
    }

    return await this.cmdHandler(
      'DELETE_ACCOUNT',
      async (ctx: T) => await handler(ctx)
    )
  }

  @addCommand
  public async pokemons() {
    const handler = async (ctx: T) => {
      try {
        return await ctx.conversation.enter('pokemons')
      } catch (error) {
        console.log(error)
        await ctx.reply('There was an error during request. Please report it')
      }
    }

    return await this.cmdHandler(
      'MY_POKEMONS',
      async (ctx: T) => await handler(ctx)
    )
  }

  @addCommand
  public async generatePokemon() {
    const handler = async (ctx: T) => {
      try {
        return await ctx.conversation.enter('generatePokemon')
      } catch (error) {
        console.log(error)
        await ctx.reply('There was an error during request. Please report it')
      }
    }
    return await this.cmdHandler(
      'POKEMON_GENERATE',
      async (ctx: T) => await handler(ctx)
    )
  }
}
