import { CallbackQueryContext, Context } from 'grammy'
import mongo from '../db/Mongo'
import { pokeApi } from '../events'
import { MAX_PKMN_PARTY } from '../constants'
import customInlnKbdBtn from '../utils/customInlnKbdBtn'
import uSendPrivate from '../utils/uSendPrivate'
import pokemonGenerate from './pokemonGenerate'
import { isPokemonRegistered } from '../utils/isPokemonRegistered'
import { PokemonRegistered } from '../types'

export default async function cb_catch(ctx: CallbackQueryContext<Context>) {
  try {
    const user = await mongo.findOneUser(ctx.from.username as string)
    await ctx.deleteMessage()

    if (!user)
      throw new Error(
        `Error Procesing the request. The pokemon may be missing or you're not registered`
      )

    const pokemon = ctx.callbackQuery.message?.caption
      ?.split(' ')
      .at(2) as string

    const pokemonInParty =
      user.pokemonParty.find((el) => el.name === pokemon) ?? null

    // update pokemon counter if user already catched that pokemon
    if (pokemonInParty) {
      const counter = pokeApi.updateCounter(pokemonInParty)
      await mongo.updatePokemonCount(user, [pokemon, counter])
      await ctx.reply(
        `You have catched a ${pokemon}. You've cached ${pokemon} ${pokemonInParty?.counter} times`
      )
      return
    }

    if (user.pokemonParty.length >= MAX_PKMN_PARTY) {
      // inline_keyboard from user inputed pokemon
      const keyboard = await customInlnKbdBtn(user, ctx)
      uSendPrivate(
        ctx,
        `You can't catch ${pokemon} as you have reached the total maximum of pokemon allowed. ` +
          'Which pokemon would you like to let it go?',
        keyboard
      )
      return
    }

    // Add new pokemon
    const choice = (await pokemonGenerate(pokemon)) as PokemonRegistered
    await mongo.addPokemon(user, choice)
    await ctx.reply(`@${user.userName} has captured a ${choice.name}`)
  } catch (err) {
    await ctx.reply(err as string)
    console.error(err)
  }
}
