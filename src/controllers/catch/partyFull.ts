import { ConversationCB, MainContext, UserRegistered } from '../../types'
import displayMaxPokemonParty from './maxPokemonParty'
import replacePokemonInParty from './replacePokemonInParty'

export default async function partyFull(
  conv: ConversationCB,
  ctx: MainContext,
  user: UserRegistered,
  pokemonToAdd: string
) {
  const { msg, keyboard } = displayMaxPokemonParty(user, pokemonToAdd)
  const messageToDelete = await ctx.reply(msg, keyboard)
  ctx.session.messageToDelete = messageToDelete.message_id

  // makes wait the following lines until the correct user types the callbackQuery
  await conv.waitFrom(user.tlgID)
  const res = await conv.waitForCallbackQuery(/choice[012345]/)
  // if (res.callbackQuery.from.id === user.tlgID)
  return await replacePokemonInParty(res, user)
}
