import { EvolutionClient, Pokemon, PokemonClient } from 'pokenode-ts'
import { PokemonBuilder } from './PokemonBuilder'
import { PokemonRegistered } from './types'
import { TOTAL_OF_POKEMON } from './constants'

export class PokeApi {
  private api: PokemonClient
  private builder: PokemonBuilder

  constructor() {
    this.api = new PokemonClient()
    this.builder = new PokemonBuilder()
  }

  async generatePokemon(pokemon?: string | number): Promise<PokemonRegistered> {
    try {
      if (pokemon) {
        if (typeof pokemon === 'string') {
          const requestPokemon = await this.api.getPokemonByName(pokemon)
          return this.buildPokemon(requestPokemon)
        }
        const requestPokemon = await this.api.getPokemonById(pokemon)
        return this.buildPokemon(requestPokemon)
      }
      // TODO: Get back randomizer where it needs to be
      // this.randomizer()
      const requestPokemon = await this.api.getPokemonById(1)
      return this.buildPokemon(requestPokemon)
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
    const sortedSetID: Set<number> = new Set()
    while (sortedSetID.size <= 2) {
      sortedSetID.add(this.randomizer(startersListID))
    }
    const [p1, p2, p3]: number[] = [...sortedSetID]

    // TODO: remove numbers and add variables from above
    // Take the random arr and convert them to pokemons
    let pokemonStarter: PokemonRegistered[] = []
    await Promise.all([
      this.api.getPokemonById(1),
      this.api.getPokemonById(1),
      this.api.getPokemonById(1),
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
    return pokemon.sprite.frontDefault
  }

  static updateCounter(pokemon: PokemonRegistered | null) {
    if (!pokemon) return null
    return pokemon.counter++
  }

  async evolvePokemon(pokemon: PokemonRegistered) {
    const evolve = new EvolutionClient()
    let nextPokemon
    const logger = await evolve
      .getEvolutionChainById(pokemon.id)
      .then(async (el) => {
        const isPokemon = el.chain.evolves_to.at(0)?.species.name
        if (isPokemon) {
          const newPokemon = await this.generatePokemon(isPokemon)
          return newPokemon
        }
      })
    return logger
  }

  private randomizer(array?: number[]) {
    if (array) {
      return array.at(Math.floor(Math.random() * array.length + 1)) ?? 1
    }
    return Math.floor(Math.random() * TOTAL_OF_POKEMON + 1)
  }
}
