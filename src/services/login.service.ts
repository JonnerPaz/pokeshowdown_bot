import { InlineKeyboard, InputMediaBuilder } from 'grammy'
import { Conversation } from '@grammyjs/conversations'
import { AppContext } from '../shared/types'
import { UsersService } from './users.service.js'
import { conversation } from '../shared/decorators/conversation.decorator.js'
import { PokeApiService } from './pokeapi.service.js'
import { InputMediaPhoto } from 'grammy/types'
import { EVOLVE_CAP } from '../shared/constants.js'

export class LoginService {
  constructor(
    // services
    private readonly userService: UsersService,
    private readonly pokemonService: PokeApiService
  ) {
    this.register = this.register.bind(this)
    this.deleteAccount = this.deleteAccount.bind(this)
    this.pokemons = this.pokemons.bind(this)
    this.generatePokemon = this.generatePokemon.bind(this)
    this.evolvePokemon = this.evolvePokemon.bind(this)
    Object.entries(this).forEach(([key, value]) => {
      Object.defineProperty(value, 'name', {
        value: key,
        writable: false,
      })
    })
  }

  /**
   * @description - Generates images of pokemon's starters and its keyboard options
   */
  private async getStarterKeyboard(): Promise<
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

  private async generateWildPokemon(): Promise<
    [InputMediaPhoto, InlineKeyboard]
  > {
    const pokemon = await this.pokemonService.createPokemon('mudkip')
    this.pokemonService.setCurrentPokemon = pokemon
    const keyboard = new InlineKeyboard().text('Catch', 'catch')
    return [InputMediaBuilder.photo(pokemon.sprites.frontDefault), keyboard]
  }

  @conversation
  public async register(conv: Conversation, ctx: AppContext) {
    try {
      const user = await conv.external((ctx) =>
        this.userService.findOneUser(ctx.from.username)
      )

      if (user) {
        await ctx.reply('You are already registered!')
        return
      }

      await ctx.reply('Welcome to ShowdownBot!. Please select your starter!')
      const [photos, keyboard] = await conv.external(() =>
        this.getStarterKeyboard()
      )

      await ctx.api.sendMediaGroup(ctx.chat.id, photos)
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
          +idx === selectedIdx &&
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

      const starter = await this.pokemonService.createPokemon(pokemonName)
      await conv.external(() =>
        this.userService.addUser(ctx.from.username, starter)
      )
      await ctx.reply('You are now registered!')
    } catch (error) {
      ctx.reply('There was an error during request. Please report it')
      throw error
    }
  }

  @conversation
  public async pokemons(conv: Conversation, ctx: AppContext) {
    try {
      const user = await conv.external((ctx) =>
        this.userService.findOneUser(ctx.from.username)
      )

      if (!user) {
        await ctx.reply('You are not registered!')
        return
      }

      const pokemonPhotos = user.pokemons.map((el) =>
        InputMediaBuilder.photo(el.sprites.at(0).frontDefault)
      )
      await ctx.reply('Your pokemons are:')
      await ctx.api.sendMediaGroup(ctx.chat.id, pokemonPhotos)
      return
    } catch (err) {
      ctx.reply('There was an error during request. Please report it')
      throw err
    }
  }

  @conversation
  public async deleteAccount(conv: Conversation, ctx: AppContext) {
    try {
      const username = ctx.from?.username
      const isUserRegistered = await this.userService.findOneUser(username)

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

      await conv.external(() => this.userService.deleteUser(username))

      const msg = 'Your account was deleted'
      await ctx.api.deleteMessage(choice.chat.id, choice.message_id)
      return await data.reply(msg)
    } catch (err) {
      await ctx.reply('There was an error during request. Please report it')
      throw err
    }
  }

  @conversation
  public async generatePokemon(conv: Conversation, ctx: AppContext) {
    try {
      const [pokemonPhoto, keyboard] = await conv.external(() =>
        this.generateWildPokemon()
      )

      await ctx.api.sendMediaGroup(ctx.chat.id, [pokemonPhoto])
      await ctx.reply(
        'A wild pokemon has appeared! Touch the buttom to catch it!',
        { reply_markup: keyboard }
      )

      const choice = await conv.waitForCallbackQuery('catch', {
        otherwise: async () => await ctx.deleteMessage(),
      })

      const user = await conv.external((_) =>
        this.userService.findOneUser(choice.callbackQuery.from.username)
      )

      await ctx.api.deleteMessage(
        choice.chat.id,
        choice.callbackQuery.message.message_id
      )

      if (user.pokemons.length === 6) {
        await ctx.reply('Your pokemon bag is full!')
        return
      }

      await conv.external(() =>
        this.userService.addPokemonToUser(
          choice.callbackQuery.from.username,
          this.pokemonService.getCurrentPokemon
        )
      )

      const currentPokemon = user.pokemons.find(
        (el) => el.name === this.pokemonService.getCurrentPokemon.name
      )
      return await ctx.reply(
        `@${user.username} has caught a ${currentPokemon.name}. He has caught ${currentPokemon.name} ${currentPokemon.timesCaught} time${currentPokemon.timesCaught === 1 ? '' : 's'}`
      )
    } catch (err) {
      await ctx.reply('There was an error during request. Please report it')
      throw err
    }
  }

  @conversation
  public async evolvePokemon(conv: Conversation, ctx: AppContext) {
    try {
      const user = await conv.external((ctx) =>
        this.userService.findOneUser(ctx.from.username)
      )

      if (!user) {
        await ctx.reply('You are not registered!')
        return
      }

      const pokemonPhotos = user.pokemons.map((el) =>
        InputMediaBuilder.photo(el.sprites.at(0).frontDefault)
      )
      const pokemonNames = user.pokemons.map((el) => el.name)

      await ctx.api.sendMediaGroup(ctx.chat.id, pokemonPhotos)
      await ctx.reply(
        `Which pokemon do you want to evolve? send a message with the name of the pokemon you want to evolve. Your pokemons: ${pokemonNames.join(', ')}`
      )

      const choice = await conv.waitFrom(ctx.from.id).andFor(':text')
      const pokemon = user.pokemons.find(
        (el) => el.name.toLowerCase() === choice.message.text.toLowerCase()
      )

      if (!pokemon || pokemon.timesCaught < EVOLVE_CAP) {
        await ctx.reply(
          "Unsuccessful evolution. Wether you haven't caught that pokemon or you haven't caught it enough times, you can't evolve it now."
        )
        return
      }

      const evolvedPokemon = await this.pokemonService.evolvePokemon(pokemon)

      // Can't evolve anymore
      if (typeof evolvedPokemon === 'string') {
        await ctx.reply(evolvedPokemon)
        return
      }

      await this.userService.evolvePokemon(
        choice.from.username,
        pokemon.name,
        evolvedPokemon
      )

      await ctx.reply(`Your ${pokemon.name} evolved to ${evolvedPokemon.name}`)
      return
    } catch (err) {
      await ctx.reply('There was an error during request. Please report it')
      throw err
    }
  }
}
