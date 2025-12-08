import { Bot } from 'grammy'
import { CommandRegistry } from './shared/classes/commandRegistry.js'
import { AppContext } from './shared/types.js'
import { LoginController } from './controllers/login.controller.js'
import { LogoutController } from './controllers/logout.controller.js'
import { commands } from '@grammyjs/commands'
import { conversations, createConversation } from '@grammyjs/conversations'
import { RegisterConvService } from './services/registerConversation.service.js'
import { registerService } from './shared/decorators/injectable.decorator.js'
import { UsersService } from './services/users.service.js'

export class AppContainer {
  private commandRegistry: CommandRegistry
  private conversationService: RegisterConvService

  public readonly bot: Bot<AppContext>
  public readonly loginController: LoginController<AppContext>
  public readonly logoutController: LogoutController<AppContext>

  constructor(apiKey: string) {
    this.bot = new Bot<AppContext>(apiKey)
    // create and register services
    registerService(UsersService, new UsersService())

    // Setup core services
    this.bot.use(commands())
    this.bot.use(conversations())

    this.conversationService = new RegisterConvService()
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
    this.bot.use(createConversation(this.conversationService.register))

    await this.loginController.init()
    await this.logoutController.init()
    // insert controllers into bot
    this.bot.use(this.loginController)
    this.bot.use(this.logoutController)

    return this
  }
}
