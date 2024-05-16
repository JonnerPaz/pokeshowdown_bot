import { PokemonRegistered, UserRegistered } from './types'
import mongo from './Mongo'

// TODO: Connect user class with a database
export class User {
  userName: string
  pokemonParty: PokemonRegistered[]

  constructor(user: string, starter: PokemonRegistered) {
    this.userName = user
    this.pokemonParty = [starter]

    // Adds User into mongodb
    mongo.addUser(this)
  }

  get getPokemonSummary() {
    return this.pokemonParty
  }

  addPokemon(pokemon: PokemonRegistered) {
    this.pokemonParty.push(pokemon)
  }

  deletePokemon(pokemonIndex: number): void | string {
    const findPokemon = this.pokemonParty.at(pokemonIndex)
    if (findPokemon) {
      this.pokemonParty.splice(pokemonIndex, 1)
    } else {
      return 'Error in request at deletePokemon'
    }
  }

  catchPokemon(pokemon: PokemonRegistered, user?: User) {}

  viewPokemon() {}

  tradePokemon() {}

  /**
   * @param user {string} Receives User's userName property
   */
  static async findUserInDB(user: string): Promise<UserRegistered | null> {
    const query = await mongo.findOneUser(user)
    console.log('User.findUser', query)
    if (query instanceof User) {
      return query
    }
    return null
  }
}
