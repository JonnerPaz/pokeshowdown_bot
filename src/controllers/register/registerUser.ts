import mongo from '../../db/Mongo'
import { User } from '../../classes/User'
import pokeApi from '../../classes/PokeApi'
import { ConversationCB, MainContext } from '../../types'

export default async function registerUser(
  conv: ConversationCB,
  ctx: MainContext
) {
  try {
    const newCtx = await conv.waitForCallbackQuery(/starter[012]/)
    await ctx.api.deleteMessage(
      newCtx.chat?.id as number,
      newCtx.msgId as number
    )
    const index = Number(newCtx.callbackQuery.data.at(-1) as string)
    const choice =
      newCtx.callbackQuery.message?.reply_markup?.inline_keyboard[0][index].text

    if (!choice) throw new Error('Choice is not defined at cb_registerPokemon')

    const userName = ctx.from?.username as string
    const starterPokemon = await pokeApi.generatePokemon(choice)

    // creates new user
    const user = new User(userName, starterPokemon, newCtx.from.id) // Create User and stores it into DB
    await mongo.addUser(user)

    await ctx.deleteMessage()
    await ctx.reply(
      `@${ctx.from?.username} chose ${starterPokemon.name}! now you have been registered`
    )
    await ctx.reply(`You can check your pokemons using /pokemonsummary
Hope you have fun with this bot!
`)
    return
  } catch (error) {
    await ctx.reply(
      "Your register wen't wrong. Try again or contact the author of this bot"
    )
    console.error(error)
  }
}