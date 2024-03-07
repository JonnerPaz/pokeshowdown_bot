import { Pokemon, PokemonClient } from 'pokenode-ts'

export class PokeApi {
  protected api: PokemonClient

  constructor() {
    this.api = new PokemonClient()
  }

  get getApi() {
    return this.api
  }

  async generatePokemon() {
    try {
      const randomizer = Math.floor(Math.random() * 809 + 1)
      const pokemon = <Pokemon>await this.api.getPokemonById(randomizer)
      return pokemon
    } catch (err) {
      console.error(err)
    }
  }

  async generatePokemonStarter() {
    // Creates a random ID array with 3 random numbers
    const startersListID = [
      1, 4, 7, 25, 133, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498,
      501, 650, 653, 656, 722, 725, 728,
    ]
    const randomizer = (arr: number[]) =>
      arr.at(Math.floor(Math.random() * arr.length + 1)) ?? 1
    const sortedListID: number[] = []
    for (let i = 0; i <= 2; i++) {
      sortedListID.push(randomizer(startersListID))
    }

    // Take the random arr and convert them to pokemons
    let pokemonStarter: Pokemon[] = []
    await Promise.all([
      this.api.getPokemonById(sortedListID[0]),
      this.api.getPokemonById(sortedListID[1]),
      this.api.getPokemonById(sortedListID[2]),
    ])
      .then((values) => {
        pokemonStarter = [...values]
      })
      .catch((err) => console.error(err))

    return pokemonStarter
  }
}
