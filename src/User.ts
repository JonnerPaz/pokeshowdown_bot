import { CommandContext, Context } from 'grammy'
import { PokemonClient, Pokemon } from 'pokenode-ts'

export interface RegisteredUser {
  userName: string
  data: {
    userName: string
    pokemon: object[]
  }
}

export class User implements RegisteredUser {
  userName: string
  data: {
    userName: string
    pokemon: object[]
  }
  pokeApi: PokemonClient

  constructor(user: string) {
    this.userName = user

    // creates initial data of a given user
    this.data = {
      userName: this.userName,
      pokemon: [{}],
    }

    this.pokeApi = new PokemonClient()
  }

  get getUserData() {
    return this.data
  }

  get getPokemonSummary() {
    return
  }

  async generatePokemon() {
    try {
      const randomizer = Math.floor(Math.random() * 809 + 1)
      const pokemon = await this.pokeApi.getPokemonById(randomizer)
      console.log(pokemon)
      return pokemon
    } catch (err) {
      console.error(err)
    }
  }

  async generatePokemonStarter(ctx: CommandContext<Context>) {
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
    const pokemonPromises = await Promise.all([
      this.pokeApi.getPokemonById(sortedListID[0]),
      this.pokeApi.getPokemonById(sortedListID[1]),
      this.pokeApi.getPokemonById(sortedListID[2]),
    ])
      .then((values) => {
        pokemonStarter = [...values]
      })
      .catch((err) => console.error(err))

    return pokemonStarter
  }

  stopGeneratePokemon() {}

  generatePokemonNow() {}

  catchPokemon() {}

  viewPokemon() {}

  tradePokemon() {}
}
