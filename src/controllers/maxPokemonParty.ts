import { CallbackQueryContext, Context } from 'grammy'
import { User } from '../classes/User'
import uSendPrivate from '../utils/uSendPrivate'
import customInlnKbdBtn from '../utils/customInlnKbdBtn'

export default async function maxPokemonParty(
  ctx: CallbackQueryContext<Context>,
  user: User,
  pokemon: string
) {
  // inline_keyboard from user inputed pokemon
  const keyboard = await customInlnKbdBtn(user, ctx)
  await uSendPrivate(
    ctx,
    `You can't catch ${pokemon} as you have reached the total maximum of pokemon allowed. ` +
      'Which pokemon would you like to let it go?',
    keyboard
  )
  return
}
