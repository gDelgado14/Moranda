// https://api.slack.com/events
'use strict'

const slack = require('slack')
const config = require('./config')
const botToken = config('GG_BOT_TOKEN')

// TODO: Need a better naming convention
//  -- this is not a bot.
// this is the real-time / ws file
// 'bot' should be slackRTM
let bot = slack.rtm.client()

bot.started(payload => {
  // console.log('bot.js - payload from rtm.start:')
  // console.log(payload)
})

// returns {type: 'hello'} once ws connection established
bot.hello(message => {
  console.log('bot.js - Got a message: ', message)
})

// console.log('bot.js - bot.self: ')
// console.log(bot.self)

// listen for message events
/*bot.message(msg => {
  console.log('bot.js - bot.message - msg:')
  console.log(msg)
  console.log('bot.js - bot.message - msg.channel:')
  console.log(msg.channel)
  if (!msg.user || msg.user_profile.name !== 'gg') return

  slack.chat.postMessage({
    token: botToken,
    channel: msg.channel,
    username: 'gg',
    text: 'beep boop: I hear you loud and clear!'
  }, (err, data) => {
    if (err) throw err
  })
})*/


// whenever @gg joins a group add introductory msg to begin Aside UX
bot.group_joined(group => {

  console.log('bot.js - bot.group_joined - group:')
  console.log(group)

  // TODO: test whether the bot has entered the room
  // if bot not in room then .postMessage throws an error
  let ggID =

  slack.chat.postMessage({
    token: botToken,
    channel: group.channel.id,
    username: 'gg',
    text: `I just heard a group joined event!!`
  }, (err, data) => {
    if (err) throw new Error(err)
  })
})

module.exports = bot
