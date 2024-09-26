import { CommandContext, Context } from 'grammy'
import mongo from '../db/Mongo'
import pokeApi from '../classes/PokeApi'
import { EVOLVE_COUNTER } from '../constants'

export default async function evolvePokemon(ctx: CommandContext<Context>) {
  try {
    const user = await mongo.findOneUser(ctx.msg.from?.username as string)
    if (!user) throw Error('No user found!')

    const pokemonQuery = ctx.msg.text.split(' ').at(1)?.toLowerCase()
    const pokemon = user.pokemonParty.find((el) => el.name === pokemonQuery)
    console.log(pokemonQuery)

    if (!pokemon || pokemon.counter < EVOLVE_COUNTER)
      throw Error(
        'Your choice does not match any of your pokemon or your pokemon cannot evolve yet. Type /pokemonsummary to access them'
      )

    const pokemonEvolved = await pokeApi.evolvePokemon(pokemon)
    await mongo.deletePokemon(user, pokemon)
    await mongo.addPokemon(user, pokemonEvolved)
    await ctx.reply(
      `Your ${pokemon.name} has evolved to ${pokemonEvolved.name}! (counter reset...)`
    )
  } catch (error) {
    await ctx.reply(
      'Your choice does not match any of your pokemon. Type /pokemonsummary to access them'
    )
    throw error
  }
}
