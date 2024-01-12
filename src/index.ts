import { Bot } from 'grammy'
const API_KEY = '6836934004:AAHpDd_rCqfMwQOdzJWW6ljjoLDomELq5w4'

const bot = new Bot(API_KEY)

bot.command('start', res => res.reply('Tu mamá es Lesbiana'))
bot.on('message', res => {
  res.reply('Tu mamá sigue siendo Lesbiana')
  // console.log(res)
  console.log(res.msg)
})

bot.start()
