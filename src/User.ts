import { PokemonRegistered } from './types'

// TODO: Connect user class with a database
export class User {
  userName: string
  data: {
    userName: string
    pokemon: PokemonRegistered[]
  }

  constructor(user: string, starter: PokemonRegistered) {
    // creates initial data of a given user
    this.userName = user
    this.data = {
      userName: user,
      pokemon: [starter],
    }
  }

  get getPokemonSummary() {
    return this.data.pokemon
  }

  addPokemon(pokemon: PokemonRegistered) {
    this.data.pokemon.push(pokemon)
  }

  deletePokemon(pokemonIndex: number): void | string {
    const findPokemon = this.data.pokemon.at(pokemonIndex)
    if (findPokemon) {
      this.data.pokemon.splice(pokemonIndex, 1)
    } else {
      return 'Error in request at deletePokemon'
    }
  }

  catchPokemon(pokemon: PokemonRegistered, user?: User) {}

  viewPokemon() {}

  tradePokemon() {}
}
