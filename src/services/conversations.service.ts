import { GlobalContext } from '../shared/types'
import { Bot } from 'grammy'

export class RegisterConversation {
  constructor(private bot: Bot<GlobalContext>) {}
}
