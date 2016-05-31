
'use strict'

const Botkit = require('botkit')
const config = require('./config')
const port = config('PORT')
const botToken = config('GG_BOT_TOKEN')
const slackToken = config('SLACK_TOKEN')
const asideToken = config('ASIDE_COMMAND_TOKEN')

let controller = Botkit.slackbot({
  debug: false
  // include "log: false" to disable logging
  // or a "logLevel" integer from 0 to 7 to adjust logging verbosity
})

// connect the bot to a stream of msgs
controller.spawn({
  token: botToken
}).startRTM()

// global access to express server available through controller.webserver
controller.setupWebserver(port, (err, webserver) => {
  if (err) {
    throw new Error(err)
  }

  // configure server for /Aside commands and all other outgoing webhooks
  // /Aside currently the only command sending outgoing webhooks
  // listen for POST requests at '/slack/receive'
  controller.createWebhookEndpoints(webserver, asideToken)
})

controller.on('slash_command', (bot, message) => {
  console.log('index.js - slash_command event - message obj:')
  console.log(message)
  console.log(' ')

  // reply to slash command
  // TODO: TOKEN error - bot authenticated as the
  // slash command rather than @gg
  bot.replyPublic(message, 'Hello everybody!')
  bot.replyPrivate(message, 'Only the person who used the slash command can see this')
})
