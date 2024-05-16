import {
  Bot,
  BotError,
  GrammyError,
  HttpError,
  InlineKeyboard,
  InputMediaBuilder,
} from 'grammy'
import { User } from './User'
import { PokeApi } from './PokeApi'
import * as Utils from './Utils'
import { PokemonRegistered, UserRegistered } from './types'
import 'dotenv/config'
import { MAX_PKMN_PARTY } from './constants'
import { Cache } from './Cache'

// Here must be stored all accounts in the group that are registered by /register
const cache = new Cache()
let registerStarter: PokemonRegistered[] = []
let currentPokemon: PokemonRegistered | null
let botMessageId: number // saves messages from bot to handle it later

const API_KEY = process.env.API_KEY as string

const bot = new Bot(API_KEY)

bot.command('start', async (ctx) => {
  const msg1 =
    'Bienvenido a PokeBotShowdown. Este es un Bot creado para capturar, '
  const msg2 =
    'intercambiar y combatir como en las entregas originales de la saga pokemon'
  return await ctx.reply(msg1.concat(msg2))
})

bot.command('register', async (ctx) => {
  try {
    const userCache = cache.findUser(ctx)
    // search DB for user
    if (!userCache) {
      const user = await User.findUserInDB(ctx.from?.username as string)
      if (user) {
        const msg = `You are already registered. If you want to erase your data and start over, use /deleteaccount`
        return await ctx.reply(msg)
      }
    }

    // generate Pokemon
    const starters = await new PokeApi().generateRegisterPokemon()
    registerStarter = starters
    const pokemonMedia = registerStarter.map((el) =>
      InputMediaBuilder.photo(el.sprite.frontDefault)
    )
    await ctx.reply(
      'To get registered, you first need to get your starter. Pick a pokemon from these ones'
    )
    await ctx.api.sendMediaGroup(ctx.chat.id, pokemonMedia).then(async () => {
      const inlineKeyboard = new InlineKeyboard()
        .text(starters[0].name, 'starter0')
        .text(starters[1].name, 'starter1')
        .text(starters[2].name, 'starter2')
        .text('Cancel', 'cancel')
      await ctx.reply('Select the right choice for you:', {
        reply_markup: inlineKeyboard,
      })
    })
  } catch (err) {
    console.error('error at register: ', err)
  }
})

bot.callbackQuery(/starter[012]/, async (ctx) => {
  const choice = Number(ctx.match[0].slice(-1))

  // creates new user
  const userName = ctx.from?.username as string
  const user = new User(userName, registerStarter[choice])
  cache.add(user)
  await ctx.deleteMessage()
  await ctx.reply(
    `@${ctx.from?.username} chose ${registerStarter[choice].name}! now you have been registered`
  )
  await ctx.reply(`You can check your pokemons using /pokemonsummary
Hope you have fun with this bot!
`)
  return
})

bot.callbackQuery('cancel', async (ctx) => {
  ctx.deleteMessage()
  return ctx.reply('Process cancelled successfully')
})

bot.command('pokemongenerate', async (ctx) => {
  try {
    // generate pokemon
    const pokemon = await new PokeApi().generatePokemon()
    currentPokemon = pokemon

    // create message with pokemon
    const caption = `A wild ${pokemon.name} appeared. Tap "CATCH" to get it`
    const inlnKeyboard = new InlineKeyboard().text('CATCH', 'catch')
    await ctx.replyWithPhoto(PokeApi.showPokemonPhoto(pokemon), {
      reply_markup: inlnKeyboard,
      caption: caption,
    })
  } catch (err) {
    console.error(err)
  }
})

bot.callbackQuery('catch', async (ctx) => {
  try {
    const user = cache.findUser(ctx)
    if (!user) {
      const msg = `You're not registered. You need to register first using /register`
      return ctx.reply(msg)
    }

    const party = user.pokemonParty
    const condition = party.some((el) => el.name === currentPokemon?.name)
    const pkmnFound = party.find((el) => el.name === currentPokemon?.name)

    if (currentPokemon && condition) {
      PokeApi.updateCounter(
        party.find(
          (el) => el.name === currentPokemon?.name
        ) as PokemonRegistered
      )
      ctx.deleteMessage()
      ctx.reply(
        `You have catched a ${currentPokemon.name}. Your counter has been updated to ${pkmnFound?.counter}`
      )
      return
    }

    if (party.length >= MAX_PKMN_PARTY) {
      if (ctx.msg?.message_id) {
        botMessageId = ctx.msg?.message_id
      }
      // inline_keyboard from user inputed pokemon
      const keyboard = (await Utils.customInlnKbdBtn(user, ctx).catch((res) => {
        console.error('promise not fulfilled at setChange: ' + res)
        return ctx.reply('Process cancelled. See logs in the console')
      })) as InlineKeyboard
      await ctx.reply(
        'You have reached the total maximum of pokemon allowed. Which pokemon would you like to let it go?',
        { reply_markup: keyboard }
      )
      return
    }
    await ctx.deleteMessage()
    if (Utils.isPokemonRegistered(currentPokemon)) {
      user.addPokemon(currentPokemon)
      const userName = user.userName
      await ctx.reply(`@${userName} has captured a ${currentPokemon.name}`)
    } else {
      await ctx.reply('No pokemon. Null exception')
    }
  } catch (err) {
    console.error(err)
  }
})

bot.callbackQuery(/choice[012345]/, async (ctx) => {
  await ctx.deleteMessages([botMessageId]) // deletes the wild pokemon msg
  const user = cache.findUser(ctx) as UserRegistered // Always gonna be a User
  const choice = Number(ctx.match[0].at(-1))
  await ctx.deleteMessage() // deletes selection party msg
  if (Utils.isPokemonRegistered(currentPokemon)) {
    user.deletePokemon(choice)
    user.addPokemon(currentPokemon)
    const deletedPokemon = user.pokemonParty[choice]
    return await ctx.reply(
      `${deletedPokemon.name} was deleted and ${currentPokemon.name} was added to your party!`
    )
  } else {
    await ctx.reply('No pokemon. Null exception')
  }
})

bot.command('pokemonsummary', async (ctx) => {
  const user = cache.findUser(ctx)
  if (!user) return
  const userPokemonImages = user.getPokemonSummary.map((el) =>
    InputMediaBuilder.photo(el.sprite.frontDefault)
  )
  const pokemonName = user.pokemonParty.map((el) => el.name)
  await ctx.api.sendMediaGroup(ctx.chat.id, userPokemonImages)
  const msg = `@${ctx.from?.username}, These are the pokemon you have: ${pokemonName.join(', ')}`
  return await ctx.reply(msg)
})

bot.command('deleteaccount', async (ctx) => {
  try {
    const user = await User.findUserInDB(ctx.msg.from?.username as string)
    const msg = `You're not registered in @${ctx.me.username}. Use /register to use this bot`
    if (!user) return await ctx.reply(msg)

    const inlnKeyboard = new InlineKeyboard()
      .text('YES', 'delete')
      .text('NO', 'nothing')
    await ctx.reply(
      `@${ctx.from?.username} type "yes" if you want to delete your account`
    )
    await ctx.reply('Delete your account (including all of your data)?', {
      reply_markup: inlnKeyboard,
    })
  } catch (err) {
    console.error(err)
  }
})

// responses to deleteaccount
bot.callbackQuery('delete', async (ctx) => {
  // delete inline_keyboard
  ctx.deleteMessages([ctx.msg?.message_id as number])

  const user = cache.findUser(ctx)
  cache.clearOneUser(ctx)

  const msg = 'Your account has now been erased. Sad to see you go!'
  await ctx.answerCallbackQuery(msg)
  await ctx.reply(msg)
})

bot.callbackQuery('nothing', async (ctx) => {
  await ctx.deleteMessage()
})

bot.command('help', async (ctx) => {
  await ctx.reply(`
Here are some of the following commands that @${ctx.me.username} receives:
* /start - Starts de bot
* /register - register a user into the bot
* /deleteaccount - Delete your account from PokeBotShowdown
* /pokemonsummary - Shows your pokemon party
`)
})

// commands can't have uppercase
bot.api.setMyCommands([
  { command: 'start', description: 'Starts the bot' },
  { command: 'register', description: 'register a user into the bot' },
  {
    command: 'deleteaccount',
    description: 'Delete your account from PokeBotShowdown',
  },
  { command: 'help', description: 'Show all commands' },
  {
    command: 'pokemongenerate',
    description: 'Start generating random pokemon',
  },
  {
    command: 'pokemonsummary',
    description: 'get an info of all your pokemons',
  },
])

bot.start()

bot.catch((err) => {
  const ctx = err.ctx
  console.error(`Error while handling update ${ctx.update.update_id}:`)
  const e = err.error
  if (e instanceof GrammyError) {
    console.error('Error in request:', e.description)
    bot.start()
  } else if (e instanceof HttpError) {
    console.error('Could not contact Telegram:', e)
    bot.start()
  } else if (e instanceof BotError) {
    console.error('Error associate with BotError:', e)
    bot.start()
  } else {
    console.error('Unknown error:', e)
    bot.start()
  }
})
