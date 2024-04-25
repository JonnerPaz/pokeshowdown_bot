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
import { PokemonRegistered } from './types'

// Here must be stored all accounts in the group that are registered by /register
let userDB: User[] = []
let registerStarter: PokemonRegistered[] = []
let currentPokemon: PokemonRegistered | null

const API_KEY = '6836934004:AAHpDd_rCqfMwQOdzJWW6ljjoLDomELq5w4'

const bot = new Bot(API_KEY)

bot.command('start', async (ctx) => {
  const msg = `
Bienvenido a PokeBotShowdown. Este es un Bot creado para capturar, intercambiar y combatir como en las entregas originales de la saga pokemon
`
  return await ctx.reply(msg)
})

bot.command('register', async (ctx) => {
  const user = Utils.findUser(ctx, userDB)
  if (user) {
    return await ctx.reply(
      `You are already registered. If you want to erase your data and start over, use /deleteaccount`
    )
  }

  // generate Pokemon
  const starters = await new PokeApi().generateRegisterPokemon()
  registerStarter = starters // stores starters so can be used lately
  const [firstPkmn, secondPkmn, thirdPkmn] = registerStarter.map((el) =>
    InputMediaBuilder.photo(el.sprite.frontDefault)
  )
  await ctx.reply(
    'To get registered, you first need to get your starter. Pick a pokemon from these ones'
  )
  await ctx.api
    .sendMediaGroup(ctx.chat.id, [firstPkmn, secondPkmn, thirdPkmn])
    .then(async () => {
      const inlineKeyboard = new InlineKeyboard()
        .text(starters[0].name, 'starter0')
        .text(starters[1].name, 'starter1')
        .text(starters[2].name, 'starter2')
        .text('Cancel', 'cancel')
      await ctx.reply('Select the right choice for you:', {
        reply_markup: inlineKeyboard,
      })
    })
})

bot.callbackQuery(/starter[012]/, async (ctx) => {
  const choice = Number(ctx.match[0].slice(-1))

  // creates new user
  const userName = <string>ctx.from?.username
  const user = new User(userName, registerStarter[choice])
  userDB.push(user)
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
    const user = Utils.findUser(ctx, userDB)
    if (!user) {
      return ctx.reply(
        `You're not registered. You need to register first using /register`
      )
    }

    // generate pokemon
    const pokemon = await new PokeApi().generatePokemon()
    currentPokemon = pokemon

    // create message with pokemon
    const caption = `@${ctx.from?.username} encountered a wild ${pokemon?.name}`
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
    const user = Utils.findUser(ctx, userDB)

    if (user.data.pokemon.length >= 2) {
      // inline_keyboard from user inputed pokemon
      const isBagFull = await Utils.catchChecker(user, ctx)
      const setChange = await Promise.all([isBagFull])
        .then(async () => {
          return await ctx.deleteMessage()
        })
        .catch((res) => {
          console.error('promise not fulfilled at setChange: ' + res)
          return ctx.reply('Process cancelled. See logs in the console')
        })
    }

    await ctx.deleteMessage()
    if (Utils.isPokemonRegistered(currentPokemon)) {
      user.addPokemon(currentPokemon)
      await ctx.reply(`${user.userName} has captured a ${currentPokemon.name}`)
    } else {
      await ctx.reply('No pokemon. Null exception')
    }

    // set current pokemon empty again
    // currentPokemon = null
  } catch (err) {
    console.error(err)
  }
})

bot.callbackQuery(/choice[012345]/, async (ctx) => {
  const user = Utils.findUser(ctx, userDB)
  const choice = Number(ctx.match[0].at(-1)) // 0, 1, 2, 3, 4, 5

  await ctx.deleteMessage()
  if (Utils.isPokemonRegistered(currentPokemon)) {
    user.deletePokemon(choice)
    user.addPokemon(currentPokemon)
    return await ctx.reply('Process fulfilled')
  } else {
    await ctx.reply('No pokemon. Null exception')
  }
})

bot.command('pokemonsummary', async (ctx) => {
  // .sendMediaGroup(ctx.chat.id, [firstPkmn, secondPkmn, thirdPkmn])
  // .then(async (arr) => {
  const userPokemon = Utils.findUser(ctx, userDB)
  const userPokemonImages = userPokemon.getPokemonSummary.map((el) =>
    InputMediaBuilder.photo(el.sprite.frontDefault)
  )
  const pokemonName = userPokemon.data.pokemon.map((el) => el.name)
  await ctx.api.sendMediaGroup(ctx.chat.id, userPokemonImages)
  return await ctx.reply(
    `These are the pokemon you have: ${pokemonName.join(', ')}`
  )
})

bot.command('deleteaccount', async (ctx) => {
  try {
    // if not a user, return
    const logic = userDB.some(
      (el) => el.getUserData.userName === <string>ctx.from?.username
    )
    const msg = `You're not registered in @${ctx.me.username}. Use /register to use this bot`
    if (!logic) return await ctx.reply(msg)

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
  ctx.deleteMessages([<number>ctx.msg?.message_id])

  const findUser = <User>(
    userDB.find((el) => el.getUserData.userName === <string>ctx.from?.username)
  )
  userDB.splice(userDB.indexOf(findUser))

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
  { command: 'stop', description: 'Stops PokeBotShowdown' },
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
