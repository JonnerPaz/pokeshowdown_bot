import { CommandContext, Context, InputMediaBuilder } from 'grammy'
import mongo from '../db/Mongo'

export default async function pokemonSummary(ctx: CommandContext<Context>) {
  try {
    const user = await mongo.findOneUser(ctx.from?.username as string)
    if (!user) return await ctx.reply('No user found')

    const userPokemonImages = user.pokemonParty.map((el) =>
      InputMediaBuilder.photo(el.sprite.frontDefault)
    )
    const pokemonName = user.pokemonParty.map((el) => el.name)
    await ctx.replyWithMediaGroup(userPokemonImages)
    const msg = `@${ctx.from?.username}, These are the pokemon you have: ${pokemonName.join(', ')}`
    return await ctx.reply(msg)
  } catch (err) {
    await ctx.reply(err as string)
    throw err
  }
}
