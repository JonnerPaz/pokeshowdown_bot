import { UserRegistered } from './types'
import { CommandContext, Context, CallbackQueryContext } from 'grammy'

export class Cache {
  private userList: UserRegistered[] = []

  clear(user: UserRegistered) {
    this.userList.length = 0
    this
  }

  add(user: UserRegistered) {
    this.userList.push(user)
    return this
  }

  findUser(
    ctx: CommandContext<Context> | CallbackQueryContext<Context>
  ): UserRegistered | null {
    const query = this.getUserList.find(
      (el) => el.userName === ctx.from?.username
    )
    if (!query) return null
    return query
  }

  get getUserList() {
    return this.userList
  }
}
