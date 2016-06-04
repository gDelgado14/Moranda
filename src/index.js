
'use strict'

const Botkit = require('botkit')
const config = require('./config')
const port = config('PORT')
const botToken = config('GG_BOT_TOKEN')
const userToken = config('SLACK_TOKEN') // token of auth'd user
const asideToken = config('ASIDE_COMMAND_TOKEN')

// controller is an instance of SlackBot
// slackBot inherits properties of CoreBot
let controller = Botkit.slackbot({
  debug: false
  // include "log: false" to disable logging
  // or a "logLevel" integer from 0 to 7 to adjust logging verbosity
})

// holds a representation of the current team
// TODO: user a data store (Firebase) to keep track of a team's asides
let teamData = null
let webAPI = null

// connect the bot to a stream of msgs
// spawn returns an instance of worker (Slackbot_worker.js)
// startRTM returns another instance of worker (Slackbot_worker.js)
let ggBot = controller.spawn({
  token: botToken
}).startRTM((e, ggBot, res) => {
  if (e) throw new Error(e)
  teamData = {
    teamInfo: res.team,
    self: res.self,
    channels: res.channels,
    groups: res.groups,
    ims: res.ims,
    users: res.users
  }
  webAPI = ggBot.api
})



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

// register slash command callback for /Aside
// if other slash commands are created, this callback
// must then filter to see which specific command was executed
controller.on('slash_command', (bot, message) => {
  // TODO: this command might require additional permisisons from the user
  //
  // ==== response_type - in_channel =====
  // bot.replyPublic(message, 'Hello everybody!')
  //
  // ==== response_type - ephemeral =====
  // bot.replyPrivate(message, 'Only the person who used the slash command can see this')
  //
  //
  // to send information by way of slash command use `bot`
  // to communicate using @gg use global ggBot

  // search for @ mentions and capture only the name mentioned
  let regexp = /@(\w+)/gi
  let match = regexp.exec(message.text)
  let teamMembers = []
  let groupTitle = message.text.replace(regexp, '').toLowerCase().trim()

  // while & for loop are O(n^2)
  // TODO: there should be a key-value map / hash table storing name - id pairs
  while (match) {
    // match[1] contains name without @

    // map character names to unique ids
    let i = 0
    for (i; i < teamData.users.length; i++) {
      if (teamData.users[i].name === match[1]) {
        teamMembers.push(teamData.users[i].id)
        break // stop looping once user is mapped to id
      }
    }

    // look for additional matches
    match = regexp.exec(message.text)
  }

  // if no actual users mentioned then notify /Aside caller that this is required
  if (!teamMembers.length) {
    throw new Error('/Aside requires @invitees')
  }

  // add gg id. this assumes teamdata is being assigned
  // a JSON response that comes from a RTM request made by gg
  // otherwise self will contain data of someone else
  teamMembers.push(teamData.self.id)

  // pass userToken - auth'd user creates group
  webAPI.groups.create({token: userToken, name: groupTitle}, (e, response) => {
    if (e) {
      bot.replyPrivate(message, e)
    }

    // add newly-created group to teamData
    teamData.groups.push(response.group)

    // add the mentioned members to the group
    teamMembers.forEach(member => {
      webAPI.groups.invite({token: userToken, channel: response.group.id, user: member}, (e) => {
        if (e)
          throw new Error(e)

        // once Moranda in channel, initiate dialogue
        if (member === teamData.self.id) {
          let groupPurpose = message.text.replace(regexp, '')
          // TODO: use propper formatting to get username hyperlinks
          // https://api.slack.com/docs/formatting
          let txt = `Welcome @${message.user_name + ', ' + message.text.match(regexp).join(', ')}!
@${message.user_name} created this Aside and set the purpose to:
> ${groupPurpose}
When you're done, I'll help summarize takeaways and offer to share them with a Channel (optional) before archiving the Sidebar for you.
Just @mention me in this sidebar and I'll take care of it: \`@gg done\``

          // use attachments if regular text formatting doesnt work
          /*
          let att = {
            attachments: [
              {
                pretext: txt,
                text:
              }
            ]
          }*/

          // Have Aside caller set purpose of the aside
          webAPI.groups.setPurpose({token: userToken, channel: response.group.id, purpose: groupPurpose}, e => {
            if (e)
              throw new Error(e)
          })

          // have Moranda say introductory statements
          webAPI.chat.postMessage({token: botToken, channel: response.group.id, text: txt, as_user: true}, e => {
            if (e)
              throw new Error(e)
          })
        }
      })
    })
  })

  // let Slack servers know that things went well
  // any string passed to .send() gets posted by slackbot
  bot.res.status(200).send()
})

console.log('suhhhhh dude');

// once ''@gg done' is mentioned, start summarization conversation
controller.hears(['done'], 'mention,direct_mention', (bot, message) => {
  console.log('YES YES YES')
  console.log(message)

  bot.reply(message, 'yes, you are done!')
})
