import { IUser } from '@/shared/dto/IUser.dto'
import { Users } from '../entities/Users'
import { Repository } from 'typeorm'

export class UsersService {
  constructor(public userRepository: Repository<Users>) {}

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
      console.log(err)
    }
  }
}
