import { Users } from '../entities/Users.js'
import { DataSource, Repository } from 'typeorm'
import { AppDataSource } from '../data-source.js'
import { Pokemons } from '../entities/Pokemons.js'
import { Sprites } from '../entities/Sprites.js'
import { IPokemon } from '../shared/dto/IPokemon.dto.js'

export class UsersService {
  private dataSource: DataSource
  private userRepository: Repository<Users>
  private pokemonRepository: Repository<Pokemons>
  private spritesRepository: Repository<Sprites>

  constructor() {
    this.dataSource = AppDataSource
    this.userRepository = this.dataSource.getRepository(Users)
    this.pokemonRepository = this.dataSource.getRepository(Pokemons)
    this.spritesRepository = this.dataSource.getRepository(Sprites)
  }

  public async addUser(userName: string, starter: IPokemon) {
    const queryRunner = this.dataSource.createQueryRunner()

    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const user = await this.findOneUser(userName)

      if (user) {
        throw new Error('User already exists')
      }

      const newUser = new Users()
      // set user properties
      newUser.username = userName

      // set sprite properties
      const sprites = new Sprites()
      sprites.frontDefault = starter.sprites.frontDefault
      sprites.frontShiny = starter.sprites.frontShiny
      sprites.backDefault = starter.sprites.backDefault
      sprites.backShiny = starter.sprites.backShiny

      // set pokemon properties
      const pokemon = new Pokemons()
      pokemon.name = starter.name
      pokemon.types = starter.types
      pokemon.ability = starter.ability
      pokemon.timesCaught = 1
      pokemon.user = newUser

      // set relations
      sprites.pokemon = pokemon

      const pokemonArr = [pokemon]
      const spritesArr = [sprites]

      newUser.pokemons = pokemonArr
      pokemon.sprites = spritesArr

      const savedUser = await this.userRepository.save(newUser)
      await queryRunner.commitTransaction()
      return savedUser
    } catch (error) {
      await queryRunner.rollbackTransaction()
      console.error('Error while adding user:', error)
      throw error
    }
  }

  public async findOneUser(username: string): Promise<Users> | null {
    try {
      const user = await this.userRepository.findOne({
        where: { username },
      })
      return user
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  public async deleteUser(username: string) {
    try {
      const user = await this.userRepository.delete({ username })
      return user
    } catch (err) {
      console.error(err)
      throw err
    }
  }
}
