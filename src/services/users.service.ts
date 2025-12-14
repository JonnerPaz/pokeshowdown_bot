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
  private spriteRepository: Repository<Sprites>

  constructor() {
    this.dataSource = AppDataSource
    this.userRepository = this.dataSource.getRepository(Users)
    this.pokemonRepository = this.dataSource.getRepository(Pokemons)
    this.spriteRepository = this.dataSource.getRepository(Sprites)
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

      // insertions
      // first must be inserted the many side, and then the one side

      // set sprite properties
      const sprites = new Sprites()
      sprites.frontDefault = starter.sprites.frontDefault
      sprites.frontShiny = starter.sprites.frontShiny
      sprites.backDefault = starter.sprites.backDefault
      sprites.backShiny = starter.sprites.backShiny

      await this.spriteRepository.save(sprites)

      // set pokemon properties
      const pokemon = new Pokemons()
      pokemon.name = starter.name
      pokemon.types = starter.types
      pokemon.ability = starter.ability
      pokemon.timesCaught = 1
      // set sprite-pokemon relation
      pokemon.sprites = [sprites]
      await this.pokemonRepository.save(pokemon)

      // set user properties
      const newUser = new Users()
      newUser.username = userName
      newUser.pokemons = [pokemon]
      await this.userRepository.save(newUser)

      const savedUser = await this.userRepository.save(newUser)
      await queryRunner.commitTransaction()
      return savedUser
    } catch (error) {
      await queryRunner.rollbackTransaction()
      console.error('Error while adding user:', error)
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  public async addPokemonToUser(userName: string, pokemonDto: IPokemon) {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const user = await this.findOneUser(userName)

      const isPokemonRegistered = user.pokemons.find(
        (pokemon) => pokemon.name === pokemonDto.name
      )

      if (isPokemonRegistered) {
        isPokemonRegistered.timesCaught++
        await this.pokemonRepository.save(isPokemonRegistered)
        await queryRunner.commitTransaction()
        return
      }

      const sprites = new Sprites()
      sprites.frontDefault = pokemonDto.sprites.frontDefault
      sprites.frontShiny = pokemonDto.sprites.frontShiny
      sprites.backDefault = pokemonDto.sprites.backDefault
      sprites.backShiny = pokemonDto.sprites.backShiny
      await this.spriteRepository.save(sprites)

      // set pokemon properties
      const pokemon = new Pokemons()
      pokemon.name = pokemonDto.name
      pokemon.types = pokemonDto.types
      pokemon.ability = pokemonDto.ability
      pokemon.timesCaught = 1
      pokemon.sprites = [sprites]

      await this.pokemonRepository.save(pokemon)

      // update pokemon list of user
      user.pokemons.push(pokemon)
      await this.userRepository.save(user)
      await queryRunner.commitTransaction()
      return
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  public async findOneUser(username: string): Promise<Users> | null {
    try {
      const user = await this.userRepository.findOne({
        where: { username },
        relations: {
          pokemons: {
            sprites: true,
          },
        },
      })
      return user
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  public async deleteUser(username: string) {
    try {
      const user = await this.findOneUser(username)
      if (!user) {
        throw new Error('User not found')
      }
      await this.userRepository.delete({ username })
    } catch (err) {
      console.error(err)
      throw err
    }
  }
}
