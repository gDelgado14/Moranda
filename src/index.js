
'use strict'

const slack = require('slack')
const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config')

let app = express()
let bot = require('./bot')

// array of channel objects
// Channel Object Type: https://api.slack.com/types/channel
let channels
slack.channels.list({token: config('SLACK_TOKEN')}, (err, data) => {
  if (err) {
    throw err
  } else {
    channels = data.channels
  }
  console.log('index.js - slack.channels.list')
  console.log(channels)
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
  console.log('index.js - slack.groups.list')
  console.log(groups)
})

// array of user objects
// User Object Type: https://api.slack.com/types/user
let users
slack.users.list({token: config('SLACK_TOKEN')}, (err, data) => {
  if (err) {
    throw err
  } else {
    users = data.members
  }
  console.log('index.js - slack.users.list')
  console.log(users)
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
  let regexp = /(@\w+)/gi

  // payload.text includes everything after /aside
  let teamMembers = payload.text.match(regexp)

  // remove @ mentions, lowecase everything, remove whitespace from both ends
  // and replace interior whitespace with a hyphen
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
      console.log(data)

      teamMembers.forEach(member => {
        slack.groups.invite({
          token: params.token,
          channel: data.group.id,
          user: member // use users.list api to get user info. then map 'member' to .id property in users.list object
        }, (err, data) => {
          if (err) {
            console.log(err)
            console.log(member)
          } else {
            console.log(`successfully added ${member} to ${data.group.name}`)
          }
        })
      })
    }
  }) // end create group
}) // end post

// start listening to the slack team associated to the token
bot.listen({token: config('GG_BOT_TOKEN')})

app.listen(3000, (err) => {
  if (err) throw err

  console.log(`\n🚀  Summer LIVES on PORT 3000 🚀`)
})
