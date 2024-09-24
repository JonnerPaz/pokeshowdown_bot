import { PokeApi } from './classes/PokeApi'
import { PokemonRegistered } from './types'

let counter = 0
let currentWildPokemon: PokemonRegistered
export const pokeApi = new PokeApi()

/* bot.callbackQuery(/choice[012345]/, async (ctx) => {
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

bot.callbackQuery('delete', async (ctx) => {eve
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
}) */
