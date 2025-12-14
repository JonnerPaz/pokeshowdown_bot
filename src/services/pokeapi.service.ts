import { Pokemons } from '@/entities/Pokemons.js'
import { PokemonBuilder } from '../shared/classes/PokemonBuilder.js'
import { TOTAL_OF_POKEMON } from '../shared/constants.js'
import { IPokemon } from '../shared/dto/IPokemon.dto'
import { EvolutionClient, Pokemon, PokemonClient } from 'pokenode-ts'

export class PokeApiService {
  private api: PokemonClient
  private builder: PokemonBuilder
  private evolution: EvolutionClient
  private currentPokemon: IPokemon

  constructor() {
    this.api = new PokemonClient()
    this.builder = new PokemonBuilder()
    this.evolution = new EvolutionClient()
  }

  private randomizer<T>(array?: T[]) {
    if (Array.isArray(array)) {
      // gets a random number from an array
      return array.at(Math.floor(Math.random() * array.length))
    }
    return Math.floor(Math.random() * TOTAL_OF_POKEMON + 1)
  }

  public async createStarterPokemon() {
    // Creates a random ID array with 3 random numbers
    const starterList = [
      'bulbasaur',
      'charmander',
      'squirtle',
      'chikorita',
      'cyndaquil',
      'totodile',
      'treecko',
      'torchic',
      'mudkip',
      'turtwig',
      'chimchar',
      'piplup',
      'snivy',
      'tepig',
      'oshawott',
      'chespin',
      'fennekin',
      'froakie',
      'rowlet',
      'litten',
      'popplio',
    ]
    const uniqueNames = new Set<string>()
    const SELECTION_SIZE = 3
    while (uniqueNames.size < SELECTION_SIZE) {
      const pokemonName = this.randomizer(starterList)
      if (typeof pokemonName === 'string' && !uniqueNames.has(pokemonName)) {
        uniqueNames.add(pokemonName)
      }
    }

    const [p1, p2, p3] = [...uniqueNames].map((name) =>
      this.createPokemon(name)
    )
    const pokemons = await Promise.all([p1, p2, p3])
    return pokemons
  }

  private buildPokemon(pokemon: Pokemon): IPokemon {
    return this.builder
      .setName(pokemon.name)
      .setTypes(pokemon.types.map((type) => type.type.name))
      .setId(pokemon.id)
      .setAbility(pokemon.abilities[0].ability.name)
      .setHeldItem(null)
      .setSprite({
        frontShiny: String(pokemon.sprites.front_shiny),
        frontDefault: String(
          pokemon.sprites.other?.['official-artwork'].front_default
        ),
        backShiny: String(pokemon.sprites.back_shiny),
        backDefault: String(pokemon.sprites.back_default),
      })
      .build()
  }

  public set setCurrentPokemon(pokemon: IPokemon) {
    this.currentPokemon = pokemon
  }

  public get getCurrentPokemon() {
    return this.currentPokemon
  }

  /**
   * @description Generates a random pokemon
   */
  public async createPokemon(pokemon?: string | number) {
    try {
      if (pokemon && typeof pokemon === 'string') {
        const requestPokemon = await this.api.getPokemonByName(pokemon)
        return this.buildPokemon(requestPokemon)
      }

      if (pokemon && typeof pokemon === 'number') {
        const requestPokemon = await this.api.getPokemonById(pokemon)
        return this.buildPokemon(requestPokemon)
      }

      // get a random pokemon
      const requestPokemon = await this.api.getPokemonById(this.randomizer())
      return this.buildPokemon(requestPokemon)
    } catch (err) {
      throw err
    }
  }

  public showPokemonPhoto(pokemon: IPokemon, position?: string): string {
    // using return. No need to use "break"
    switch (position) {
      case 'front':
        return pokemon.sprites.frontDefault
      case 'back':
        return pokemon.sprites.backDefault
      case 'frontShiny':
        return pokemon.sprites.frontShiny
      case 'backShiny':
        return pokemon.sprites.backShiny
    }
    return pokemon.sprites.frontDefault
  }

  public async evolvePokemon(pokemon: Pokemons): Promise<IPokemon | string> {
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
        return await this.createPokemon(evolutionChain.secondForm)
      } else if (pokemon.name === evolutionChain.secondForm) {
        return await this.createPokemon(evolutionChain.thirdForm)
      } else {
        return 'This pokemon is as its maximum form'
      }
    } catch (error) {
      throw error
    }
  }
}
