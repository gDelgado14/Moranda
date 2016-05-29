
'use strict'

const slack = require('slack')
const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config')
const port = config('PORT')
const botToken = config('GG_BOT_TOKEN')

let botID = null
let app = express()

// removed because bot.js pasted into this file
// let bot = require('./bot')

// array of channel objects
// Channel Object Type: https://api.slack.com/types/channel
let channels
slack.channels.list({token: config('SLACK_TOKEN')}, (err, data) => {
  if (err) {
    throw err
  } else {
    channels = data.channels
  }
  // console.log('index.js - slack.channels.list')
  // console.log(channels)
})

// array of group objects
// Group Object Type: https://api.slack.com/types/group
let groups
slack.groups.list({token: config('SLACK_TOKEN')}, (err, data) => {
  if (err) {
    throw err
  } else {
    groups = data.groups
  }
  // console.log('index.js - slack.groups.list')
  // console.log(groups)
})

// array of user objects
// User Object Type: https://api.slack.com/types/user
let users
slack.users.list({token: config('SLACK_TOKEN')}, (err, data) => {
  if (err) {
    throw err
  } else {
    // users is an array of users in slack team
    // contains the name and id of each user
    users = data.members.map(member => {
      // save bot ID as global variable
      if (member.name === 'gg') {
        botID = member.id
      }

      return {
        name: member.name,
        id: member.id
      }
    })
  }
  // console.log('index.js - slack.users.list')
  // console.log(users)
})

// parse JSON
app.use(bodyParser.json())

// parse URLencoded bodies
app.use(bodyParser.urlencoded({ extended: true }))

// expose slash command to [SOME_SUBDOMAIN_NAME]
// https://ngrok.com/docs#subdomain
//
// https://medium.com/slack-developer-blog/slash-commands-style-guide-4e91272aa43a#.wquwq4wn7
app.post('/commands/aside', (req, res) => {
  let payload = req.body

  // console.log(payload)

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

  // add @gg (bot) to teamMembers array as automatic
  // invitee to all /aside discussions
  teamMembers.push('@gg')

  // remove @ mentions, lowecase everything, remove whitespace from both ends
  // and replace interior whitespace with a hyphen
  //
  // TODO: consider removing Articles from channel title:
  //        i.e. Prepping for the big launch --> prepping-big-launch
  //        but maintain description with Articles for channel topic
  let channelTitle = payload.text.replace(regexp, '').toLowerCase().trim().replace(/\s+/gi, '-')

  let params = {
    token: config('SLACK_TOKEN'),
    name: channelTitle
  }

  // Channel names can only contain
  // - lowercase letters
  // - numbers
  // - hyphens
  // - underscores
  // must be 21 characters or less
  //
  // TODO:
  //   - currently if params.name > 21 chars, all subsequen chars are removed from channel name
  //      i.e. 'yet-another-randome-channel' --> 'yet-another-randome-c'
  //   - test token assigns token owner as creator of group / channel
  //      ensure once in production that channel creater is whoever invoked this method
  slack.groups.create(params, (err, data) => {
    if (err) {
      console.log(err)
    } else {
      // set content headers
      res.set('content-type', 'application/json')

      // set status code of 200 OK and send content as JSON
      res.status(200).json('it\'s all good')
      // console.log(data)

      teamMembers.forEach(member => {
        let index = 0
        let userId = null

        // map @member to its unique ID
        // .slice(1) to return string without @
        for (index; index < users.length; index++) {
          if (users[index].name === member.slice(1)) {
            userId = users[index].id
            break
          }
        }

        if (!userId) throw new Error('userID cannot be null')

        slack.groups.invite({
          token: params.token,
          channel: data.group.id,
          user: userId
        }, (err, data) => {
          if (err) {
            console.log('index.js - slack.groups.invite error - member: ', member)
            throw new Error(err)
          } else {
            console.log(`successfully added ${member} to ${data.group.name}`)
          }
        })
      })
    }
  }) // end create group
}) // end post request

// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////

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
bot.message(msg => {
  console.log('bot.js - bot.message event fired!')
  /* console.log(msg)
  console.log('bot.js - bot.message - msg.channel:')
  console.log(msg.channel)*/
  if (!msg.user || msg.user_profile.name !== 'gg') return

  /*
  slack.chat.postMessage({
    token: botToken,
    channel: msg.channel,
    username: 'gg',
    text: 'beep boop: I hear you loud and clear!'
  }, (err, data) => {
    if (err) throw err
  })*/
})

// whenever @gg joins a group add introductory msg to begin Aside UX
bot.group_joined(group => {
  console.log('bot.js - bot.group_joined - group:')
  console.log(group)

  // TODO: get invitee names eventually
  let invitees = ' '

  const welcomeMsg = `Welcome${invitees}!
  Gio created this Aside to chat about __something__here__
  When you're done, I'll help summarize takeaways and offer to share them with a Channel (optional) before archiving the Sidebar for you.

  Just @mention me in this Sidebar and I'll take care of it @gg done`

  slack.chat.postMessage({
    token: botToken,
    channel: group.channel.id,
    username: 'gg',
    text: welcomeMsg
  }, (err, data) => {
    if (err) {
      throw new Error(err)
    } else {

    }
  })
})

// start listening to the slack team associated to the token
// this method instantiates the bot and its associated events
// if a particular event does not apply directly to a bot then
// actions of other users will also invoke events for the bot
// if, for example, someone other than the bot joins a group,
// the group_joined event wont be invoked
bot.listen({token: config('GG_BOT_TOKEN')})

app.listen(port, err => {
  if (err) throw err

  console.log(`\n🚀  Summer LIVES on PORT ${port} 🚀`)
})
