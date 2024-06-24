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
import 'dotenv/config'
import { MAX_PKMN_PARTY } from './constants'
import mongo from './db/Mongo'

let counter = 0
let registerStarter: PokemonRegistered[] = []
let currentWildPokemon: PokemonRegistered | null
let botMessageId: number // saves messages from bot to handle it later

const API_KEY = process.env.API_KEY
if (!API_KEY) throw new Error('BOT_TOKEN is unset')

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
    const registeredMsg = `You are already registered. If you want to erase your data and start over, use /deleteaccount`
    const user = await mongo.findOneUser(ctx.from?.username as string)
    if (user) return ctx.reply(registeredMsg)

    const starters = await new PokeApi().generateRegisterPokemon()
    // Store starters globally
    registerStarter = starters
    const pokemonMedia = registerStarter.map((el) =>
      InputMediaBuilder.photo(el.sprite.frontDefault)
    )

    await ctx.reply(
      'To get registered, you first need to get your starter. Pick a pokemon from these ones'
    )

    // send selection of starters
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
  const choice = Number(ctx.callbackQuery.data.at(-1) as string)
  // creates new user
  const userName = ctx.from?.username as string
  const user = new User(userName, registerStarter[choice]) // Create User and stores it into DB
  await mongo.addUser(user)

  await ctx.deleteMessage()
  await ctx.reply(
    `@${ctx.from?.username} chose ${registerStarter[choice].name}! now you have been registered`
  )
  await ctx.reply(`You can check your pokemons using /pokemonsummary
Hope you have fun with this bot!
`)
})

bot.callbackQuery('cancel', async (ctx) => {
  ctx.deleteMessage()
  return ctx.reply('Process cancelled successfully')
})

/* bot.command('pokemongenerate', async (ctx) => {
  try {
    // generate pokemon
    const pokemon = await new PokeApi().generatePokemon()
    currentWildPokemon = pokemon

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
}) */

bot.callbackQuery('catch', async (ctx) => {
  try {
    const user = await mongo.findOneUser(ctx.from.username as string)
    const msg = `Error Procesing the request. The pokemon may be missing or you're not registered`
    if (!user || !currentWildPokemon) return ctx.reply(msg)

    const pokemonInParty =
      user.pokemonParty.find((el) => el.name === currentWildPokemon?.name) ??
      null

    // update pokemon counter from user if he has it
    if (currentWildPokemon && pokemonInParty) {
      const counter = PokeApi.updateCounter(pokemonInParty) as number
      await mongo.updatePokemonCount(user, [currentWildPokemon.name, counter])
      const msg = `You have catched a ${currentWildPokemon.name}. You've cached ${currentWildPokemon.name} ${pokemonInParty?.counter} times`
      await ctx.deleteMessage()
      await ctx.reply(msg)
      console.log(pokemonInParty?.counter)
      return
    }

    if (user.pokemonParty.length >= MAX_PKMN_PARTY) {
      botMessageId = ctx.msg?.message_id as number
      // inline_keyboard from user inputed pokemon
      const keyboard = (await Utils.customInlnKbdBtn(user, ctx).catch((res) => {
        console.error('customInlnKbdBtn gets fucked up: ' + res)
        return ctx.reply('Process cancelled. See logs in the console')
      })) as InlineKeyboard
      await ctx.reply(
        'You have reached the total maximum of pokemon allowed. Which pokemon would you like to let it go?',
        { reply_markup: keyboard }
      )
      return
    }

    await ctx.deleteMessage()

    // Add new pokemon
    await mongo.addPokemon(user, currentWildPokemon)
    await ctx.reply(
      `@${user.userName} has captured a ${currentWildPokemon.name}`
    )
  } catch (err) {
    console.error(err)
  }
})

bot.callbackQuery(/choice[012345]/, async (ctx) => {
  await ctx.deleteMessages([botMessageId]) // deletes the wild pokemon msg
  const user = (await mongo.findOneUser(ctx.from.username as string)) as User
  const [pokemonToDelete, choice] = ctx.callbackQuery.data.split(' ')
  const pokemonChosen = user.pokemonParty.find(
    (el) => el.name === pokemonToDelete
  ) as PokemonRegistered

  await ctx.deleteMessage() // deletes selection party msg

  await mongo.deletePokemon(user, pokemonChosen)
  await mongo.addPokemon(user, currentWildPokemon as PokemonRegistered)
  return await ctx.reply(`${currentWildPokemon?.name} was added to your party!`)
})

bot.command('evolve', async (ctx) => {
  try {
    const pokemonChoosed = ctx.msg.text.slice(7).trim()
    const user = await mongo.findOneUser(ctx.from?.username as string)
    const msg = `You're not registered. You need to register first using /register`
    if (!user) return await ctx.reply(msg)

    const userPokemon = user?.pokemonParty.find(
      (el) => el.name === pokemonChoosed
    ) as PokemonRegistered

    if (userPokemon && userPokemon.counter === 5) {
      const oldPokemon = user.pokemonParty.find(
        (el) => el.name === pokemonChoosed
      ) as PokemonRegistered
      const pokemonEvolved = await new PokeApi().evolvePokemon(userPokemon)
      await mongo.evolvePokemon(user, oldPokemon, pokemonEvolved)
    }
  } catch (error) {
    console.error(error)
  }
})

bot.command('pokemonsummary', async (ctx) => {
  const user = await mongo.findOneUser(ctx.from?.username as string)
  if (!user) return await ctx.reply('No user found')
  const userPokemonImages = user.pokemonParty.map((el) =>
    InputMediaBuilder.photo(el.sprite.frontDefault)
  )
  const pokemonName = user.pokemonParty.map((el) => el.name)
  await ctx.api.sendMediaGroup(ctx.chat.id, userPokemonImages)
  const msg = `@${ctx.from?.username}, These are the pokemon you have: ${pokemonName.join(', ')}`
  return await ctx.reply(msg)
})

bot.command('deleteaccount', async (ctx) => {
  try {
    const user = await mongo.findOneUser(ctx.msg.from?.username as string)
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

bot.callbackQuery('delete', async (ctx) => {
  // delete inline_keyboard
  ctx.deleteMessages([ctx.msg?.message_id as number])

  const user = await mongo.findOneUser(ctx.from.username as string)
  if (!user) return await ctx.reply('there is no user')

  // deletes user from all storages
  await mongo.deleteUser(user.userName)

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
  {
    command: 'pokemonsummary',
    description: 'get an info of all your pokemons',
  },
  {
    command: 'evolve',
    description: 'get an info of all your pokemons',
  },
])

// every 100 messages the pokemon generates
// This goes at bottom of the page so commands
// can be loaded before this. Load this early
// catches commands as part of this listener
// and makes them not work
bot.hears(/(?<!\/)\w/, async (ctx) => {
  try {
    counter++
    if (counter === 100) {
      const pokemon = await new PokeApi().generatePokemon()
      currentWildPokemon = pokemon

      // create message with pokemon
      const caption = `A wild ${pokemon.name} appeared. Tap "CATCH" to get it`
      const inlnKeyboard = new InlineKeyboard().text('CATCH', 'catch')
      await ctx.replyWithPhoto(PokeApi.showPokemonPhoto(pokemon), {
        reply_markup: inlnKeyboard,
        caption: caption,
      })

      counter = 0
    }
  } catch (e) {
    console.error(e)
  }
})

async function start() {
  await bot.start()
}
start()

bot.catch(async (err) => {
  const ctx = err.ctx
  console.error(`Error while handling update ${ctx.update.update_id}:`)
  const e = err.error
  if (e instanceof GrammyError) {
    await ctx.reply('there was an error: Error in request')
    console.error('Error in request:', e.description)
    bot.start()
  } else if (e instanceof HttpError) {
    await ctx.reply('There was an error: Could not contact Telegram')
    console.error('Could not contact Telegram:', e)
    bot.start()
  } else if (e instanceof BotError) {
    await ctx.reply('There was an error: ' + e.message)
    console.error('Error associate with BotError:', e)
    bot.start()
  } else {
    console.error('Unknown error:', e)
    bot.start()
  }
})
