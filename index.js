/**
 *
 *	deploy with git push heroku botkit:master
 *
 * TODO:
 *  - remove SLACK_TOKEN and GG_BOT_TOKEN from .env
 *  - have a bug reporter set up on firebase
 * 	- replace test token with user tokens
 * 	- have @gg respond to empty mentions (i.e. '@gg') within groups and channels that @gg is in
 * 	- have @gg respond to DMs (use 'ambient' msg type)
 * 	- user friendly error messages - don't just throw uncaught errors
 * 		- Error: /Aside requires @invitees
 * 	- timestamp each Aside and remind users that they're still open
 * 	- close asides automatically for people ??
 * 	- have a /feedback aside
 * 	- have a help command
 * 	- set up 'message' event handlers to maintain updated state with slack
 * 		- type: message  --> subtype: channel_purpose
 * 	- teamData should be an object with handlers bound to it that keep it in sync with slack data
 * 	- keep a handle on the bot's id. maybe teamData.self.id does this?
 */

'use strict'

const Botkit = require('./botkit')
const config = require('./config')
const firebase = require('firebase')
const port = config('PORT')
const botToken = config('GG_BOT_TOKEN')
const userToken = config('SLACK_TOKEN') // token of auth'd user
const clientId = config('CLIENT_ID')
const clientSecret = config('CLIENT_SECRET')
const slashToken = config('SLASH_COMMAND_TOKEN') // Each application can have only one slash command token, even if they have multiple commands associated with an app

// controller is an instance of SlackBot
// slackBot inherits properties of CoreBot
let controller = Botkit.slackbot().configureSlackApp({
  clientId: clientId,
  clientSecret: clientSecret,
  scopes: 'commands,bot'
})

// Initialize the app with a service account, granting admin privileges
// https://firebase.google.com/docs/database/server/start
firebase.initializeApp({
  databaseURL: 'https://project-3576296690235739912.firebaseio.com/',
  serviceAccount: './dbaccount.json'
})

// As an admin, the app has access to read and write all data, regardless of Security Rules
// use firebase database service
let db = firebase.database();
let asideRef = db.ref('asides');
let asideData = null

asideRef.on('value', snapshot => {
  asideData = snapshot.val()
})

// holds a representation of the current team
let teamData = null

// shorthand for ggBot.api
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
// __dirname + '/public' is location of landing page
controller.setupWebserver(port, __dirname + '/public', (err, webserver) => {
  if (err) {
    throw new Error(err)
  }

  // configure server for /Aside commands and all other outgoing webhooks
  // /Aside currently the only command sending outgoing webhooks
  // listen for POST requests at '/slack/receive'
  // Each application can have only one slash command token, even if they have multiple commands associated with an app
  controller.createWebhookEndpoints(webserver, slashToken)

  // uses __dirname + '/public'
  controller.createHomepageEndpoint(webserver)

  // set up service for authenticating users
  controller.createOauthEndpoints(webserver, (err, req, res) => {
    if (err) {
      // user oauth cancellation error handled by Slacbkot.js
      res.status(500).send('ERROR: ' + err);
    } else {
      res.send('Success!')
    }
  })
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

  // TODO: Add group to starred
  // pass userToken - auth'd user creates group
  webAPI.groups.create({
    token: userToken,
    name: groupTitle
  }, (e, response) => {
    if (e) {
      bot.replyPrivate(message, e)
    }

    // add newly created Aside group to firebase
    // {} for dynamically creating child inside firebase
    let literal = {}
    literal[response.group.id] = true
    asideRef.update(literal)

    // add newly-created group to teamData
    teamData.groups.push(response.group)

    // add the mentioned members to the group
    teamMembers.forEach(member => {
      webAPI.groups.invite({
        token: userToken,
        channel: response.group.id,
        user: member
      }, (e) => {
        if (e)
          throw new Error(e)

        // once Moranda in channel, initiate dialogue
        if (member === teamData.self.id) {
          let groupPurpose = message.text.replace(regexp, '')
            // TODO: use propper formatting to get username hyperlinks
            // https://api.slack.com/docs/formatting
            //
            // TODO: fetch bots name by referecing its ID
            //
            // use attachments if regular text formatting doesnt work
            // https://api.slack.com/docs/attachments
          let txt = `Welcome @${message.user_name + ', ' + message.text.match(regexp).join(', ')}!
@${message.user_name} created this Aside and set the purpose to:
> ${groupPurpose}
When you're done, I'll help summarize takeaways and offer to share them with a Channel (optional) before archiving the Sidebar for you.
Just @mention me in this sidebar and I'll take care of it: \`@gg done\``

          // Have Aside caller set purpose of the aside
          webAPI.groups.setPurpose({
            token: userToken,
            channel: response.group.id,
            purpose: groupPurpose
          }, e => {
            if (e)
              throw new Error(e)
          })

          // have Moranda say introductory statements
          webAPI.chat.postMessage({
            token: botToken,
            channel: response.group.id,
            text: txt,
            as_user: true
          }, e => {
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

// This handler gets triggered in any channel in which @gg is in, regardless of whether it's an aside or not
// TODO: @gg has to discern whether a given channel is an aside or not
// Once ''@gg done' is mentioned within the same channel, start summarization conversation
controller.hears(['done'], 'mention,direct_mention', (bot, message) => {

  // asideData queries return:
  // - true if Aside still open
  // - false if Aside has been archived
  // - undefined if Aside doesn't exist (message.channel is not referencing an aside)
  if (asideData[message.channel]) {

    // botkit using message.user to track who the bot is responding to
    // TODO: change .startConversation method so that multiple people can talk to the bot at once
    ggBot.startConversation(message, (e, convo) => {
      if (e)
        throw new Error(e)

      function handleEndOfConvo(c) {
        if (convo.status === 'completed') {

          webAPI.groups.archive({
            token: userToken,
            channel: message.channel
          })
          asideRef.child(message.channel).set(false)

        } else {
          console.log('ERROR: something happened that caused the conversation to stop prematurely. convo.status: ')
          console.console.log(convo.status)
        }
        // not sure if necessary
        c.next()
      }
      convo.on('end', handleEndOfConvo)

      let introQuestion = `OK, <@${message.user}>, before I archive this Aside, would you mind summarizing the conversation for the group? What were the key takeaways?`
      convo.ask(introQuestion, (response, convo) => {

          convo.ask(
            'do you want to share this Summary with a Channel? You can say: `#channel-name` or `nope` to skip it.',
            [
              {
                pattern: new RegExp(/<#\w+>/gi),
                callback: (response, convo) => {
                  let channelRegex = /<#(\w+)>/gi
                  let match = channelRegex.exec(response.text)
                  let channels = []
                  let groupName = null
                  let groupPurpose = null
                  let userHandle = null
                  let userImg = null

                  // extract all mentions of channels
                  while (match) {
                    channels.push(match[1])
                    match = channelRegex.exec(response.text)
                  }

                  // find group's info
                  for (var i = 0; i < teamData.groups.length; i++) {
                    if (teamData.groups[i].id === response.channel) {
                      groupName = teamData.groups[i].name
                      groupPurpose = teamData.groups[i].purpose.value // null because teamData not updated
                      console.log(">>>>>> groupData: ")
                      console.log(teamData.groups[i])
                      break
                    }
                  }

                  // get user data
                  for (i = 0; i < teamData.users.length; i++) {
                    if (teamData.users[i].id === response.user) {
                      userHandle = teamData.users[i].name
                      userImg = teamData.users[i].profile.image_24
                      break
                    }
                  }


                  let asideSummary = [{
                      fallback: 'An Aside summary.',
                      color: "#36a64f",
                      author_name: '@' + userHandle,
                      author_icon: userImg,
                      fields: [
                        {
                          title: "Purpose",
                          value: groupPurpose
                        },
                        {
                          title: "Summary",
                          value: convo.extractResponse('summary')
                        }
                      ]
                    }]

                  // share summary on each mentioned channel
                  channels.forEach(channel => webAPI.chat.postMessage({
                    token: botToken,
                    channel: channel,
                    text: `Here\'s an update of the \"${groupName}\" Sidebar`,
                    attachments: asideSummary,
                    as_user: true
                  }, (e, response) => {
                    if (e && e === 'not_in_channel') {
                      // Error: not_in_channel thrown if asked to
                      // post in channel that gg is not in

                      // TODO: start a dialogue around whether to add the bot to the channel or not
                      //        if invited to channel, call postMessage once more to add message to slack
                      //        if @gg is invited to new channel, actually share the post
                      console.log('>>>>>>> not_in_channe')
                      convo.ask(
                        `Woah! It seems like I\'m not in <#${channel}>.\nAll you gotta do is invite me: \`/invite <@${teamData.self.id}> <#${channel}>\`.\nOr just say \`cancel\``,
                        [
                          {
                            pattern: bot.utterances.no,
                            callback: (response, convo) => {
                              convo.say(`Ok. I won't share the summary with <#${channel}>`)
                              convo.next()
                            }
                          },
                          {
                            default: true,
                            callback: (response, convo) => {
                              convo.say('woo default response')
                              convo.next()
                            }
                          }
                        ])
                    } else {
                      throw new Error(e)
                    }
                    // convo.repeat ???
                  }))

                  // TODO: have a list of the channels that the summary was ACTUALLY added to
                  convo.say(`Great, I will share this summary with ${response.text.match(channelRegex).join(', ')}`)
                  convo.next()
                }
            }, {
              pattern: bot.utterances.no,
              callback: (response, convo) => {
                // TODO: actually DM the summary
                convo.say('Ok, I will DM you a summary!')
                convo.next()
              }
            }, {
              default: true,
              callback: (response, convo) => {
                convo.say('default response!!')
                console.log('>>>>>> default response')
                console.log(response)
                convo.next()
              }
            }], {
              key: 'share'
            })

          // continue the conversation
          convo.next()
        }, {
          key: 'summary'
        }) // using summary key for testing

    })
  }
})


// update relevant teamData info
controller.on('group_purpose', (bot, message) => {
  // should only care if that channel is an OPEN Aside
  // closed and non-existent asides are falsey
  if (asideData[message.channel]) {
    for (var i = 0; i < teamData.groups.length; i++) {
      if (teamData.groups[i].id === message.channel) {
        teamData.groups[i].purpose.value = message.purpose.trim()
        break
      }
    }
  }
})
