// https://api.slack.com/events
'use strict'

const slack = require('slack')
const config = require('./config')

let bot = slack.rtm.client()

bot.started((payload) => {
  // console.log('payload from rtm.start:')
  // console.log(payload)
  this.self = payload.self
})

bot.hello(message => {
  console.log(`Got a message: ${message}`)
})

console.log('bot.self: ')
console.log(bot.self)

// listen for messages
bot.message(msg => {
  console.log(msg)
  if (!msg.user) return

  slack.chat.postMessage({
    token: config('GG_BOT_TOKEN'),
    channel: msg.channel,
    username: 'gg',
    text: `beep boop: I hear you loud and clear!`
  }, (err, data) => {
    if (err) throw err
  })
})

module.exports = bot
