import { IUser } from '../shared/dto/IUser.dto'
import { Users } from '../entities/Users.js'
import { DataSource, Repository } from 'typeorm'
import { AppDataSource } from '../data-source.js'

export class UsersService {
  private dataSource: DataSource
  public userRepository: Repository<Users>

  constructor() {
    this.dataSource = AppDataSource
    this.userRepository = this.dataSource.getRepository(Users)
  }

  public async addUser(userDto: IUser) {
    try {
      const user = await this.findOneUser(userDto.username)

      if (user) {
        throw new Error('User already exists')
      }

      const { username } = userDto
      const newUser = this.userRepository.create({
        username,
      })

      this.userRepository.save(newUser)

      return newUser
    } catch (error) {
      console.error(error)
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
