import { UserRegistered, grammyContext } from './types'

export class Cache {
  private userList: UserRegistered[] = []

  private clear(user: UserRegistered) {
    return (this.userList.length = 0)
  }

  clearOneUser(user: grammyContext) {
    const query = this.findUser(user)
    if (!query) throw Error('No User found in cache')
    const index = this.getUserList.indexOf(query)
    return this.getUserList.splice(index)
  }

  add(user: UserRegistered) {
    this.userList.push(user)
  }

  findUser(ctx: grammyContext): UserRegistered | null {
    const userName = ctx.from?.username as string
    const query = this.getUserList.find((el) => el.userName === userName)
    if (!query) return null
    return query
  }

  get getUserList() {
    return this.userList
  }
}
