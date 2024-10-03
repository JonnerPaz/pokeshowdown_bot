import { ConversationCB, MainContext, UserRegistered } from '../../types'
import maxPokemonParty from './maxPokemonParty'
import replacePokemonInParty from './replacePokemonInParty'

export default async function partyFull(
  conv: ConversationCB,
  ctx: MainContext,
  user: UserRegistered,
  pokemonToAdd: string
) {
  const { msg, keyboard } = maxPokemonParty(user, pokemonToAdd)
  const messageToDelete = await ctx.reply(msg, keyboard)
  ctx.session.messageToDelete = messageToDelete.message_id

  // makes wait the following lines until the correct user types the callbackQuery
  const userRes = await conv.waitFrom(ctx.from?.id as number)

  if (userRes.callbackQuery?.data === 'cancel') {
    await ctx.deleteMessages([messageToDelete.message_id])
    ctx.session.messageToDelete = 0
    return await ctx.reply('Process cancelled successfully')
  }
  // const res = await conv.waitForCallbackQuery(/choice[012345]/)
  // if (res.callbackQuery.from.id === user.tlgID)

  return await replacePokemonInParty(userRes, user)
}
