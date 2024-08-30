import { InlineKeyboard, InputMediaBuilder } from 'grammy'
import { User } from '../classes/User'
import createInlineKeyboard from '../utils/createInlineKeyboard'
import { grammyContext } from '../types'

/**
 *
 * Creates a custom keyboard to use in telegram
 *
 * @param user - a User instance
 * @param ctx - the exact ctx obj received from any grammy command
 */
export default async function customInlnKbdBtn(
  user: User,
  ctx: grammyContext
): Promise<InlineKeyboard> {
  const userPokemonPhotos = user.pokemonParty.map((pokemon) =>
    InputMediaBuilder.photo(pokemon.sprite.frontDefault)
  )
  const inlineKeyboard = createInlineKeyboard(null, user.pokemonParty).text(
    'cancel',
    'cancel' // exits this code and goes to cancel query
  )
  await ctx.api.sendMediaGroup(ctx.chat?.id!, userPokemonPhotos)
  return inlineKeyboard
}
