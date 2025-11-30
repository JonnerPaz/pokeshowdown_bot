import { InputMediaBuilder } from 'grammy'
import { User } from '../classes/User'
import mongo from '../db/Mongo'

export default async function uGetPokemonSprites(byUser: User) {
  const user = await mongo.findOneUser(byUser.userName)
  return user?.pokemonParty.map((pokemon) =>
    InputMediaBuilder.photo(pokemon.sprite.frontDefault)
  )
}
