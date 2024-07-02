import { PokemonRegistered } from '../types'

export class User {
  userName: string
  pokemonParty: PokemonRegistered[]

  constructor(user: string, starter: PokemonRegistered) {
    this.userName = user
    this.pokemonParty = [starter]
  }
}
