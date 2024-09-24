import bot from './index'
import { InlineKeyboard, InputMediaBuilder } from 'grammy'
import { User } from './classes/User'
import { PokeApi } from './classes/PokeApi'
import { PokemonRegistered } from './types'
import { EVOLVE_COUNTER, MAX_PKMN_PARTY } from './constants'
import mongo from './db/Mongo'
import customInlnKbdBtn from './utils/customInlnKbdBtn'
import uSendPrivate from './utils/uSendPrivate'
import registerPokemon from './controllers/registerPokemon'
import cb_registerPokemon from './controllers/cb_registerPokemon'

let counter = 0
let currentWildPokemon: PokemonRegistered
export const pokeApi = new PokeApi()

// bot.command('start', async (ctx) => {
//   const msg =
//     'Bienvenido a PokeBotShowdown. Este es un Bot creado para capturar, ' +
//     'intercambiar y combatir como en las entregas originales de la saga pokemon'
//   return await ctx.reply(msg)
// })

bot.callbackQuery('cancel', async (ctx) => {
  ctx.deleteMessage()
  return ctx.reply('Process cancelled successfully')
})

bot.command('pokemongenerate', async (ctx) => {
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
})

bot.callbackQuery('catch', async (ctx) => {
  try {
    await ctx.deleteMessage()
    const user = await mongo.findOneUser(ctx.from.username as string)
    const msg = `Error Procesing the request. The pokemon may be missing or you're not registered`
    if (!user || !currentWildPokemon) return ctx.reply(msg)

    const pokemonInParty =
      user.pokemonParty.find((el) => el.name === currentWildPokemon?.name) ??
      null

    // update pokemon counter from user if he has it
    if (pokemonInParty) {
      const counter = PokeApi.updateCounter(pokemonInParty) as number
      await mongo.updatePokemonCount(user, [currentWildPokemon.name, counter])
      const msg = `You have catched a ${currentWildPokemon.name}. You've cached ${currentWildPokemon.name} ${pokemonInParty?.counter} times`
      await ctx.reply(msg)
      return
    }

    if (user.pokemonParty.length >= MAX_PKMN_PARTY) {
      // inline_keyboard from user inputed pokemon
      const keyboard = await customInlnKbdBtn(user, ctx)
      uSendPrivate(
        ctx,
        `You can't catch ${currentWildPokemon.name} as you have reached the total maximum of pokemon allowed. ` +
          'Which pokemon would you like to let it go?',
        keyboard
      )
      return
    }

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
  const user = (await mongo.findOneUser(ctx.from.username as string)) as User

  const pokemonToDelete = ctx.callbackQuery.data.split('_').at(0)
  const pokemonChosen = user.pokemonParty.find(
    (el) => el.name === pokemonToDelete
  ) as PokemonRegistered

  await ctx.deleteMessage() // deletes selection party msg

  await mongo.deletePokemon(user, pokemonChosen)
  await mongo.addPokemon(user, currentWildPokemon)
  return await ctx.reply(`${currentWildPokemon?.name} was added to your party!`)
})

bot.command('evolve', async (ctx) => {
  try {
    const user = await mongo.findOneUser(ctx.from?.username as string)
    if (!user)
      return await ctx.reply(
        `You're not registered. You need to register first using /register`
      )

    const pokemonChoosed = ctx.msg.text.slice(7).trim()
    const userPokemon = user?.pokemonParty.find(
      (el) => el.name === pokemonChoosed
    ) as PokemonRegistered

    if (!userPokemon) return await ctx.reply('There is no pokemon')
    if (userPokemon.counter !== EVOLVE_COUNTER) {
      return await ctx.reply(
        `You need to catch ${EVOLVE_COUNTER - userPokemon.counter} ${userPokemon.name} ` +
          'more to be able to evolve it'
      )
    }
    const pokemonEvolved = await new PokeApi().evolvePokemon(userPokemon)
    await mongo.evolvePokemon(user, userPokemon, pokemonEvolved)
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
  await ctx.replyWithMediaGroup(userPokemonImages)
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
    if (counter === 1) {
      const pokemon = await new PokeApi().generatePokemon('cyndaquil')
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

export default async function Load() {
  return await bot.start()
}
