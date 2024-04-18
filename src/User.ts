import { PokeApi } from './PokeApi'
import { PokemonRegistered } from './types'

export class User {
  userName: string
  data: {
    userName: string
    pokemon: PokemonRegistered[]
  }
  pokeApi: PokeApi

  constructor(user: string, starter: PokemonRegistered) {
    this.userName = user

    // creates initial data of a given user
    this.data = {
      userName: this.userName,
      pokemon: [starter],
    }

    this.pokeApi = new PokeApi()
  }

  get getUserData() {
    return this.data
  }

  get getPokemonSummary() {
    return this.data.pokemon
  }

  addPokemon(pokemon: PokemonRegistered) {
    this.data.pokemon.push(pokemon)
  }

  stopGeneratePokemon() {}

  generatePokemonNow() {}

  catchPokemon() {}

  viewPokemon() {}

  tradePokemon() {}
}
