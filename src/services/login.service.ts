import { InlineKeyboard, InputMediaBuilder } from 'grammy'
import { Conversation } from '@grammyjs/conversations'
import { AppContext } from '../shared/types'
import { UsersService } from './users.service.js'
import { getService } from '../shared/decorators/injectable.decorator.js'
import { addConversation } from '../shared/decorators/addConversation.decorator.js'
import { PokeApiService } from './pokeapi.service.js'
import { InputMediaPhoto } from 'grammy/types'

export class LoginService {
  constructor(private readonly pokemonService: PokeApiService) {
    this.register = this.register.bind(this)
    this.deleteAccount = this.deleteAccount.bind(this)
    Object.entries(this).forEach(([key, value]) => {
      Object.defineProperty(value, 'name', {
        value: key,
        writable: false,
      })
    })
  }

  /**
   * Generates images of pokemon's starters and its keyboard options
   */
  public async getStarterKeyboard(): Promise<
    [InputMediaPhoto[], InlineKeyboard]
  > {
    // create starters
    const pokemons = await this.pokemonService.createStarterPokemon()
    const photos = pokemons.map((el) =>
      InputMediaBuilder.photo(el.sprites.frontDefault)
    )

    const keyboard = new InlineKeyboard()
      .text(pokemons[0].name, 'starter0')
      .text(pokemons[1].name, 'starter1')
      .text(pokemons[2].name, 'starter2')
      .text('Cancel', 'starterCancel')

    return [photos, keyboard]
  }

  @addConversation
  public async register(conv: Conversation, ctx: AppContext) {
    try {
      const userService = getService(UsersService) as UsersService
      const user = await conv.external((ctx) =>
        userService.findOneUser(ctx.from.username)
      )

      if (user) {
        await ctx.reply('You are already registered!')
        return
      }

      await ctx.reply('Welcome to ShowdownBot!. Please select your starter!')

      const pokeApiService = getService(PokeApiService) as PokeApiService

      const [photos, keyboard] = await conv.external(() =>
        this.getStarterKeyboard()
      )

      await ctx.api.sendMediaGroup(ctx.from.id, photos)
      await ctx.reply('Please select one of the following:', {
        reply_markup: keyboard,
      })

      const startedSelected = await conv
        .waitForCallbackQuery(/starter(?:0|1|2|Cancel)/)
        .andFrom(ctx.from)

      let pokemonName: string | null
      const selectedPokemon = keyboard.inline_keyboard.flat().find((_, idx) => {
        const selectedIdx = Number(startedSelected.callbackQuery.data.at(-1))
        return (
          Number(idx) === selectedIdx &&
          selectedIdx >= 0 &&
          selectedIdx <= keyboard.inline_keyboard.flat().length
        )
      })

      await startedSelected.deleteMessage()

      if (!selectedPokemon) {
        await ctx.reply('Registration cancelled!')
        return
      }

      pokemonName = selectedPokemon.text

      const starter = await pokeApiService.createPokemon(pokemonName)
      await conv.external(() => userService.addUser(ctx.from.username, starter))
      await ctx.reply('You are now registered!')
      // await userService.addUser({ ctx.from })
      // await ctx.reply('You are now registered!')
    } catch (error) {
      ctx.reply('There was an error during request. Please report it')
      throw error
    }
  }

  @addConversation
  public async deleteAccount(conv: Conversation, ctx: AppContext) {
    try {
      const userCtx = getService(UsersService) as UsersService
      const username = ctx.from?.username
      const isUserRegistered = await userCtx.findOneUser(username)

      if (!isUserRegistered) {
        await ctx.reply('You are not registered!')
        return
      }

      const keyboard = new InlineKeyboard()
        .text('Yes', 'delete-account')
        .text('No', 'delete-cancelled')

      const choice = await ctx.reply(
        'Are you sure you want to delete your account?',
        {
          reply_markup: keyboard,
        }
      )

      const data = await conv
        .waitForCallbackQuery(/delete-\w+/)
        .andFrom(ctx.from)

      if (data.callbackQuery.data === 'delete-cancelled') {
        const msg = 'Account was not deleted'
        await ctx.api.deleteMessage(choice.chat.id, choice.message_id)
        await ctx.reply(msg)
        return
      }

      await userCtx.deleteUser(username)

      const msg = 'Your account was deleted'
      await ctx.api.deleteMessage(choice.chat.id, choice.message_id)
      return await data.reply(msg)
    } catch (err) {
      throw err
    }
  }
}
