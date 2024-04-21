import { PokemonRegistered } from './types'

export class User {
  userName: string
  data: {
    userName: string
    pokemon: PokemonRegistered[]
  }

  constructor(user: string, starter: PokemonRegistered) {
    this.userName = user

    // creates initial data of a given user
    this.data = {
      userName: this.userName,
      pokemon: [starter],
    }
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

  deletePokemon(pokemonId: number): void | string {
    const findPokemon = this.data.pokemon.find((el) => el.id === pokemonId)
    if (findPokemon) {
      this.data.pokemon.splice(pokemonId)
    } else {
      return 'Process canceled.'
    }
  }

  catchPokemon() {}

  viewPokemon() {}

  tradePokemon() {}
}
