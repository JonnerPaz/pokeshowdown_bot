import { Bot } from 'grammy'
import { commands } from '@grammyjs/commands'
import { conversations, createConversation } from '@grammyjs/conversations'
import { CommandRegistry } from './shared/classes/commandRegistry.js'
import { AppContext } from './shared/types.js'
import { LoginController } from './controllers/login.controller.js'
import { LoggedController } from './controllers/logged.controller.js'
import { ConversationService } from './services/conversation.service.js'
import {
  getService,
  registerService,
} from './shared/decorators/injectable.decorator.js'
import { UsersService } from './services/users.service.js'
import { PokeApiService } from './services/pokeapi.service.js'

export class AppContainer {
  private commandRegistry: CommandRegistry
  private conversationService: ConversationService

  public readonly bot: Bot<AppContext>
  public readonly loginController: LoginController<AppContext>
  public readonly loggedController: LoggedController<AppContext>

  constructor(apiKey: string) {
    this.bot = new Bot<AppContext>(apiKey)
    // create and register services
    registerService(UsersService, new UsersService())
    registerService(PokeApiService, new PokeApiService())

    // Setup core services
    this.bot.use(commands())
    this.bot.use(conversations())

    this.conversationService = new ConversationService(
      getService(UsersService),
      getService(PokeApiService)
    )
    this.commandRegistry = new CommandRegistry(this.bot)

    // Setup controllers
    this.loginController = new LoginController(this.bot)
    this.loggedController = new LoggedController(this.bot)

    // Register commands into registry
    this.commandRegistry.register('login', this.loginController)
    this.commandRegistry.register('logout', this.loggedController)

    // Set registry into controllers
    this.loginController.setRegistry(this.commandRegistry)
    this.loggedController.setRegistry(this.commandRegistry)
  }

  async setup() {
    // Setup conversations handlers
    this.bot.use(createConversation(this.conversationService.register))
    this.bot.use(createConversation(this.conversationService.deleteAccount))
    this.bot.use(createConversation(this.conversationService.pokemons))
    this.bot.use(createConversation(this.conversationService.generatePokemon))
    this.bot.use(createConversation(this.conversationService.evolvePokemon))
    this.bot.use(createConversation(this.conversationService.trade))

    // Init controllers
    await this.loginController.init()
    await this.loggedController.init()

    // insert controllers into bot
    this.bot.use(this.loginController)
    this.bot.use(this.loggedController)

    return this
  }
}
