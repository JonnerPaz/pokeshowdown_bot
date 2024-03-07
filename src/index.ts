import { Bot, InlineKeyboard, InputFile, InputMediaBuilder } from 'grammy'
import { User } from './User'
import * as Utils from './utils'
import { on } from 'events'

// Here must be stored all accounts in the group that are registered by /register
export let userDB: User[] = []

const API_KEY = '6836934004:AAHpDd_rCqfMwQOdzJWW6ljjoLDomELq5w4'

const bot = new Bot(API_KEY)

bot.command('start', async (ctx) => {
  const msg = `Bienvenido a PokeBotShowdown. Este es un Bot creado para capturar, intercambiar y combatir como en las entregas originales de la saga pokemon`
  return await ctx.reply(msg)
})

bot.command('register', async (ctx) => {
  const condition = Utils.findUser(ctx, userDB)
  if (condition) {
    return await ctx.reply(
      `You are already registered. If you want to erase your data and start over, use /deleteaccount`
    )
  }

  // creates new user
  const userName = <string>ctx.from?.username
  const newUser = new User(userName)
  const starters = await newUser.generatePokemonStarter(ctx)
  const [firstPkmn, secondPkmn, thirdPkmn] = starters.map((el) =>
    InputMediaBuilder.photo(
      String(el.sprites.other?.['official-artwork'].front_default)
    )
  )
  await ctx.reply(
    'To get registered, you first need to get your starter. Pick a pokemon from these ones'
  )
  await ctx.api.sendMediaGroup(ctx.chat.id, [firstPkmn, secondPkmn, thirdPkmn])

  userDB.push(newUser)
  return await ctx.reply(`@${ctx.from?.username} have been registered`)
})

bot.command('pokemongenerate', async (ctx) => {
  try {
    const condition = userDB.some((el) => el.userName === ctx.from?.username)
    if (!condition)
      return ctx.reply(
        `You're not registered. You need to register first using /register`
      )

    // generate pokemon
    const user = Utils.findUser(ctx, userDB)
    const pokemon = await user.generatePokemon()

    // create message with pokemon
    const pokemonImage = <string>(
      pokemon?.sprites.other?.['official-artwork'].front_default
    )

    const inlnKeyboard = new InlineKeyboard()
      .text('YES', 'delete')
      .text('NO', 'nothing')
    ctx.replyWithPhoto(pokemonImage, {
      reply_markup: inlnKeyboard,
    })

    ctx.reply(`@${ctx.from?.username} encountered a wild ${pokemon?.name}`)
  } catch (err) {
    console.log(err)
  }
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

bot.command('help', async (ctx) => {
  await ctx.reply(`Here are some of the following commands that @${ctx.me.username} receives:
* /start - Starts de bot
* /register - register a user into the bot
* /deleteaccount - Delete your account from PokeBotShowdown
* /stop - Stops PokeBotShowdown - DO NOT USE IT`)
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

bot.command('stop', async (ctx) => {
  ctx.reply('this bot is stopping...')
  return await bot.stop()
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
])

bot.start()
