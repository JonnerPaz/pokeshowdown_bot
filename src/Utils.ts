import {
  InlineKeyboard,
  CommandContext,
  Context,
  CallbackQueryContext,
  InputMediaBuilder,
} from 'grammy'
import { User } from './User'
import { PokemonRegistered } from './types'

export const findUser = function (
  ctx: CommandContext<Context> | CallbackQueryContext<Context>,
  dataBase: User[]
): User {
  return <User>dataBase.find((el) => el.userName === ctx.from?.username)
}

/**
 * @param pokemonNames {string[] | string} must receive pokemon names
 */
export const createInlineKeyboard = (
  pokemonNames: PokemonRegistered[] | PokemonRegistered
): InlineKeyboard => {
  if (Array.isArray(pokemonNames)) {
    // creates a 2 dimensional arr full of strings, labeled as "value, data"
    const buttonRow = [...pokemonNames].map((el, i) => {
      return InlineKeyboard.text(el.name, 'choice' + String(i))
    })
    return InlineKeyboard.from([buttonRow])
  }

  const keyboard = new InlineKeyboard().text(pokemonNames.name, 'choice0')
  return keyboard
}

export const isPokemonRegistered = (
  pokemon: PokemonRegistered | null
): pokemon is PokemonRegistered => {
  console.log(pokemon)
  console.log((pokemon as PokemonRegistered).name !== null)
  return (pokemon as PokemonRegistered).name !== null
}

export const catchChecker = async (
  user: User,
  ctx: CallbackQueryContext<Context>
) => {
  const userPokemonPhotos = [...user.getPokemonSummary].map((pokemon) =>
    InputMediaBuilder.photo(pokemon.sprite.frontDefault)
  )
  if (user.data.pokemon.length >= 2) {
    const inlineKeyboard = createInlineKeyboard(user.data.pokemon).text(
      'cancel',
      'cancel' // exits this code and goes to cancel query
    )
    await ctx.api.sendMediaGroup(ctx.chat?.id as number, userPokemonPhotos)
    await ctx.reply(
      'You have reached the total maximum of pokemon allowed. Which pokemon would you like to let it go?',
      {
        reply_markup: inlineKeyboard,
      }
    )
  }
}
