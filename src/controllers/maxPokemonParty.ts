import { User } from '../classes/User'
import createInlineKeyboard from '../utils/createInlineKeyboard'

export default function maxPokemonParty(user: User, pokemon: string) {
  // inline_keyboard from user inputed pokemon
  const keyboard = createInlineKeyboard(null, user.pokemonParty).text(
    'cancel',
    'cancel'
  )
  const response = {
    msg:
      `You can't catch ${pokemon} as you have reached the total maximum of pokemon allowed. ` +
      'Which pokemon would you like to let it go?' +
      ' If you want to check your pokemon before select one, please use /pokemonsummary',
    keyboard: { reply_markup: keyboard },
  }
  return response
}
