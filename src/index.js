
'use strict'

const Botkit = require('botkit')
const config = require('./config')
const port = config('PORT')
const botToken = config('GG_BOT_TOKEN')
const slackToken = config('SLACK_TOKEN')

let botID = null

let controller = Botkit.slackbot({
  debug: false
  // include "log: false" to disable logging
  // or a "logLevel" integer from 0 to 7 to adjust logging verbosity
})

// convert to botkit express app
// let app = express()
controller.setupWebserver(port)
let app = controller.webserver

// connect the bot to a stream of msgs
let bot = controller.spawn({
  token: botToken
}).startRTM()

console.log('logging bot obj: ')
console.log(bot)

controller.hears('hello', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'hello yourself')
})

app.post('/commands/aside', (req, res) => {
  let payload = req.body
  console.log('POST request to /commands/aside')
  console.log(payload)

  // ensure there's a payload and payload has an approved payload
  if (!payload || payload.token !== config('ASIDE_COMMAND_TOKEN')) {
    let err = '✋  Star—what? An invalid slash token was provided\n' +
              '   Is your Slack slash token correctly configured?'
    console.log(err)
    res.status(401).end(err)
    return
  }

  // search for @ mentions
  let regexp = /@\w+/gi

  // payload.text includes everything after /aside
  let teamMembers = payload.text.match(regexp)
  let channelTitle = payload.text.replace(regexp, '').toLowerCase().trim().replace(/\s+/gi, '-')

  // add @gg (bot) to teamMembers array as automatic
  // invitee to all /aside discussions
  teamMembers.push('@gg')

  console.log(teamMembers)

  // controller does not contain api obj
  // bot variable might have api obj
  controller.api.groups.create({
    token: slackToken,
    name: channelTitle
  }, (err, data) => {
    if (err) {
      console.log(err)
    } else {
      console.log('api.groups.create')
    }
  })
})
