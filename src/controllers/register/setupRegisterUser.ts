import mongo from '../../db/Mongo'
import pokeApi from '../../classes/PokeApi'
import { MainContext } from '../../types'

export default async function setupRegisterUser(ctx: MainContext) {
  try {
    const user = await mongo.findOneUser(ctx.from?.username as string)
    if (user) {
      return await ctx.reply(
        'You are already registered. ' +
          'If you want to erase your data and start over, use /deleteaccount'
      )
    }

    await ctx.reply(
      'To get registered, you first need to get your starter. Pick a pokemon from these ones:...'
    )

    const [media, options] = await pokeApi.generateStarters()
    await ctx.replyWithMediaGroup(media)
    await ctx.reply('Select the right choice for you', {
      reply_markup: options,
    })

    return await ctx.conversation.enter('cb_registerPokemon')
  } catch (err) {
    await ctx.reply(
      'Error at register. Check logs or contact the author of this bot'
    )
    console.error('error at register: ', err)
  }
}
