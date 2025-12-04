import { GlobalContext } from '@/shared/types'
import { Bot } from 'grammy'

export class ConversationService {
  constructor(private bot: Bot<GlobalContext>) {}
}
