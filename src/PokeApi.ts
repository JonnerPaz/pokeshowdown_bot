import { Pokemon, PokemonClient } from 'pokenode-ts'
import { PokemonBuilder } from './PokemonBuilder'
import { PokemonRegistered } from './types'

export class PokeApi {
  private api: PokemonClient
  private builder: PokemonBuilder
  constructor() {
    this.api = new PokemonClient()
    this.builder = new PokemonBuilder()
  }

  get getApi() {
    return this.api
  }

  get getBuilder() {
    return this.builder
  }

  async generatePokemon(): Promise<PokemonRegistered> {
    try {
      const randomizer = Math.floor(Math.random() * 809 + 1)
      const requestPokemon = <Pokemon>await this.api.getPokemonById(randomizer)
      const pokemon = this.buildPokemon(requestPokemon)
      return pokemon
    } catch (err) {
      throw err
    }
  }

  async generateRegisterPokemon() {
    // Creates a random ID array with 3 random numbers
    const startersListID = [
      1, 4, 7, 25, 133, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498,
      501, 650, 653, 656, 722, 725, 728,
    ]
    const randomizer = (arr: number[]) => {
      return arr.at(Math.floor(Math.random() * arr.length + 1)) ?? 1
    }
    const sortedListID: number[] = []
    for (let i = 0; i <= 2; i++) {
      sortedListID.push(randomizer(startersListID))
    }

    // Take the random arr and convert them to pokemons
    let pokemonStarter: PokemonRegistered[] = []
    await Promise.all([
      this.api.getPokemonById(sortedListID[0]),
      this.api.getPokemonById(sortedListID[1]),
      this.api.getPokemonById(sortedListID[2]),
    ])
      .then((values) => {
        pokemonStarter = [...values].map((el) => {
          return this.buildPokemon(el)
        })
      })
      .catch((err) => console.error(err))

    return pokemonStarter
  }

  private buildPokemon(pokemon: Pokemon): PokemonRegistered {
    return this.builder
      .setName(pokemon.name)
      .setId(pokemon.id)
      .setAbility(pokemon.abilities[0].ability.name)
      .setHeldItem(null)
      .setSprite({
        frontShiny: String(pokemon.sprites.front_shiny),
        frontDefaultAlt: String(pokemon.sprites.front_default),
        frontDefault: String(
          pokemon.sprites.other?.['official-artwork'].front_default
        ),
        backShiny: String(pokemon.sprites.back_shiny),
        backDefault: String(pokemon.sprites.back_default),
      })
      .build()
  }

  static showPokemonPhoto(
    pokemon: PokemonRegistered,
    position?: string
  ): string {
    // using return. No need to use "break"
    switch (position) {
      case 'front':
        return pokemon.sprite.frontDefault
      case 'back':
        return pokemon.sprite.backDefault
      case 'frontShiny':
        return pokemon.sprite.frontShiny
      case 'backShiny':
        return pokemon.sprite.backShiny
    }
    return pokemon.sprite.frontShiny
  }
}
