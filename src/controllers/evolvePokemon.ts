import { CommandContext, Context } from 'grammy'
import mongo from '../db/Mongo'
import pokeApi from '../classes/PokeApi'

export default async function evolvePokemon(ctx: CommandContext<Context>) {
  try {
    const user = await mongo.findOneUser(ctx.msg.from?.username as string)
    if (!user) return await ctx.reply('No User Found')

    const pokemonQuery = ctx.msg.text.split(' ').at(1)?.toLowerCase()
    if (!pokemonQuery)
      return await ctx.reply(
        'You need to type your pokemon after the command. Like this way: /evolve charmander'
      )

    const pokemon = user.pokemonParty.find((el) => el.name === pokemonQuery)
    if (!pokemon)
      return await ctx.reply(
        'Your choice does not match any of your pokemon or your pokemon cannot evolve yet. Type /pokemonsummary to access them'
      )

    const pokemonEvolved = await pokeApi.evolvePokemon(pokemon)

    // Cannot evolve anymore
    if (typeof pokemonEvolved === 'string')
      return await ctx.reply(pokemonEvolved)

    await mongo.deletePokemon(user, pokemon)
    await mongo.addPokemon(user, pokemonEvolved)
    await ctx.reply(
      `Your ${pokemon.name} has evolved to ${pokemonEvolved.name}!`
    )
  } catch (error) {
    throw error
  }
}
