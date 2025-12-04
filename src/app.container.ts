import { Bot } from 'grammy'
import { ConversationService } from './services/conversations.service.js'
import { CommandRegistry } from './shared/classes/commandRegistry.js'
import { AppContext } from './shared/types.js'
import { LoginController } from './controllers/login.controller.js'
import { LogoutController } from './controllers/logout.controller.js'
import { commands } from '@grammyjs/commands'
import { conversations } from '@grammyjs/conversations'

export class AppContainer {
  private commandRegistry: CommandRegistry
  private conversationService: ConversationService

  public readonly bot: Bot<AppContext>
  public readonly loginController: LoginController<AppContext>
  public readonly logoutController: LogoutController<AppContext>

  constructor(apiKey: string) {
    this.bot = new Bot<AppContext>(apiKey)

    // Setup core services
    this.bot.use(commands())
    this.bot.use(conversations())

    this.conversationService = new ConversationService(this.bot)
    this.commandRegistry = new CommandRegistry(this.bot)

    // Setup controllers
    this.loginController = new LoginController(this.bot)
    this.logoutController = new LogoutController(this.bot)

    // Register commands into registry
    this.commandRegistry.register('login', this.loginController)
    this.commandRegistry.register('logout', this.logoutController)

    // Set registry into controllers
    this.loginController.setRegistry(this.commandRegistry)
    this.logoutController.setRegistry(this.commandRegistry)
  }

  async setup() {
    this.loginController.init()
    this.logoutController.init()
    // insert controllers into bot
    this.bot.use(this.loginController)
    this.bot.use(this.logoutController)

    // await this.logoutController.init()
    console.log(this.commandRegistry.getAllCommands())

    return this
  }
}
