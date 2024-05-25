import { PokemonRegistered } from './types'

// TODO: Connect user class with a database
export class User {
  userName: string
  pokemonParty: PokemonRegistered[]

  constructor(user: string, starter: PokemonRegistered) {
    this.userName = user
    this.pokemonParty = [starter]
  }

  get getPokemonSummary() {
    return this.pokemonParty
  }

  addPokemon(pokemon: PokemonRegistered) {
    return this.pokemonParty.push(pokemon)
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
