import { PokeApi } from './PokeApi'
import { Pokemon } from 'pokenode-ts'

export interface RegisteredUser {
  userName: string
  data: {
    userName: string
    pokemon: object[]
  }
}

export class User {
  userName: string
  private data: {
    userName: string
    pokemon: Pokemon[]
  }
  pokeApi: PokeApi

  constructor(user: string, starter: Pokemon) {
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

  addPokemon(pokemon: Pokemon) {
    this.data.pokemon.push(pokemon)
  }

  stopGeneratePokemon() {}

  generatePokemonNow() {}

  catchPokemon() {}

  viewPokemon() {}

  tradePokemon() {}
}
