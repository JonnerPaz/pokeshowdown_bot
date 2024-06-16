import { PokemonRegistered, UserRegistered } from './types'

export class User {
  userName: string
  pokemonParty: PokemonRegistered[]

  constructor(user: string, starter: PokemonRegistered) {
    this.userName = user
    this.pokemonParty = [starter]
  }

  deletePokemon(pokemonIndex: number): void | string {
    const findPokemon = this.pokemonParty.at(pokemonIndex)
    if (findPokemon) {
      this.pokemonParty.splice(pokemonIndex, 1)
    } else {
      return 'Error in request at deletePokemon'
    }
  }
}
