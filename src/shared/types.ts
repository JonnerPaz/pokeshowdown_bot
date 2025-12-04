import { CommandsFlavor } from '@grammyjs/commands'
import { Context } from 'grammy'
import { ConversationFlavor } from '@grammyjs/conversations'

export type GlobalContext = Context

export type AppContext = CommandsFlavor<GlobalContext> &
  ConversationFlavor<GlobalContext>
