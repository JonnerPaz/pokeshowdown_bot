import { CallbackQueryContext, Context } from 'grammy'
import mongo from '../db/Mongo'
import { User } from '../classes/User'
import { pokeApi } from '../events'

export default async function cb_registerPokemon(
  ctx: CallbackQueryContext<Context>
) {
  try {
    console.log(ctx.entities())
    await ctx.deleteMessage()
    const choice = Number(ctx.callbackQuery.data.at(-1) as string)
    if (!choice) throw new Error('Choice is not defined at cb_registerPokemon')
    const userName = ctx.from?.username as string

    // creates new user
    const user = new User(userName, await pokeApi.generatePokemon()) // Create User and stores it into DB
    await mongo.addUser(user)

    await ctx.reply(
      `@${ctx.from?.username} chose ${undefined}! now you have been registered`
    )
    await ctx.reply(`You can check your pokemons using /pokemonsummary
Hope you have fun with this bot!
`)
  } catch (error) {
    await ctx.reply(
      "Your register wen't wrong. Try again or contact the author of this bot"
    )
    console.error(error)
  }
}
