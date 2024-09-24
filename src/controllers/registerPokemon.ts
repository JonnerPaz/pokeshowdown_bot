import {
  CommandContext,
  InlineKeyboard,
  Context,
  InputMediaBuilder,
} from 'grammy'
import mongo from '../db/Mongo'
import { pokeApi } from '../index'

export default async function registerPokemon(ctx: CommandContext<Context>) {
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

    // create starters
    const pokemons = await pokeApi.generateRegisterPokemon()
    const media = pokemons.map((el) =>
      InputMediaBuilder.photo(el.sprite.frontDefault)
    )
    const options = new InlineKeyboard()
      .text(pokemons[0].name, 'starter0')
      .text(pokemons[1].name, 'starter1')
      .text(pokemons[2].name, 'starter2')
      .text('Cancel', 'cancel')

    await ctx.replyWithMediaGroup(media)
    await ctx.reply('Select the right choice for you', {
      reply_markup: options,
    })
  } catch (err) {
    await ctx.reply(
      'Error at register. Check logs or contact the author of this bot'
    )
    console.error('error at register: ', err)
  }
}
