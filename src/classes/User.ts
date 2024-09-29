import { PokemonRegistered } from '../types'

export class User {
  userName: string
  pokemonParty: PokemonRegistered[]
  tlgID: number

  constructor(user: string, starter: PokemonRegistered, tlgID: number) {
    this.userName = user
    this.pokemonParty = [starter]
    this.tlgID = tlgID
  }
}
