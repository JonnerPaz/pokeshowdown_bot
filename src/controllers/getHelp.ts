import { CommandContext, Context } from 'grammy'

export default async function getHelp(ctx: CommandContext<Context>) {
  return await ctx.reply(`
Here are some of the following commands that @${ctx.me.username} receives:
* /start - Starts de bot
* /register - register a user into the bot
* /deleteaccount - Delete your account from PokeBotShowdown
* /pokemonsummary - Shows your pokemon party
`)
}
