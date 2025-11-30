import { EvolutionClient, Pokemon, PokemonClient } from 'pokenode-ts'
import { PokemonBuilder } from '../classes/PokemonBuilder'
import { PokemonRegistered } from '../types'
import { TOTAL_OF_POKEMON } from '../constants'
import { InlineKeyboard, InputMediaBuilder } from 'grammy'
import { InputMediaPhoto } from 'grammy/types'

export class PokeApi {
  private api: PokemonClient
  private builder: PokemonBuilder
  private evolution: EvolutionClient

  constructor() {
    this.api = new PokemonClient()
    this.builder = new PokemonBuilder()
    this.evolution = new EvolutionClient()
  }

  private randomizer(array?: number[]) {
    if (array) {
      return array.at(Math.floor(Math.random() * array.length + 1)) ?? 1
    }
    return Math.floor(Math.random() * TOTAL_OF_POKEMON + 1)
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

  private async generateRegisterPokemon() {
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

    let pokemonStarter: PokemonRegistered[] = []
    await Promise.all([
      this.api.getPokemonById(p1),
      this.api.getPokemonById(p2),
      this.api.getPokemonById(p3),
    ])
      .then((values) => {
        pokemonStarter = [...values].map((el) => {
          return this.buildPokemon(el)
        })
      })
      .catch((err) => console.error(err))

    return pokemonStarter
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
      const requestPokemon = await this.api.getPokemonById(this.randomizer())
      return this.buildPokemon(requestPokemon)
    } catch (err) {
      throw err
    }
  }

  /**
   * Generates images of pokemon's starters and its keyboard options
   */
  async generateStarters(): Promise<[InputMediaPhoto[], InlineKeyboard]> {
    // create starters
    const pokemons = await pokeApi.generateRegisterPokemon()
    const media = pokemons.map((el) =>
      InputMediaBuilder.photo(el.sprite.frontDefault)
    )
    const kbdOptions = new InlineKeyboard()
      .text(pokemons[0].name, 'starter0')
      .text(pokemons[1].name, 'starter1')
      .text(pokemons[2].name, 'starter2')
      .text('Cancel', 'cancel')

    return [media, kbdOptions]
  }

  showPokemonPhoto(pokemon: PokemonRegistered, position?: string): string {
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

  updateCounter(pokemon: PokemonRegistered) {
    return pokemon.counter++
  }

  async evolvePokemon(
    pokemon: PokemonRegistered
  ): Promise<PokemonRegistered | string> {
    try {
      // input pokemon
      const pokemonToEvolve = await this.api.getPokemonSpeciesByName(
        pokemon.name
      )
      // retrieves id used for evolution chain
      const evoQuery = Number(
        pokemonToEvolve.evolution_chain.url.split('/').at(-2)
      )

      // evolution chain
      const evolution = await this.evolution.getEvolutionChainById(evoQuery)
      const evolutionChain = {
        firstForm: evolution.chain.species.name,
        secondForm: evolution.chain.evolves_to.at(0)?.species.name,
        thirdForm: evolution.chain.evolves_to.at(0)?.evolves_to.at(0)?.species
          .name,
      }

      // evolution resolver
      if (pokemon.name === evolutionChain.firstForm) {
        return await this.generatePokemon(evolutionChain.secondForm)
      } else if (pokemon.name === evolutionChain.secondForm) {
        return await this.generatePokemon(evolutionChain.thirdForm)
      } else {
        return 'This pokemon is as its maximum form'
      }
    } catch (error) {
      throw error
    }
  }
}

const pokeApi = new PokeApi()

export default pokeApi
