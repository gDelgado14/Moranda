// Moranda source code
// (c) 2016 Giorgio Delgado



/**
 *
 *	deploy with git push heroku botkit:master
 *
 *  managing multiple heroku environments
 *	https://devcenter.heroku.com/articles/multiple-environments#advanced-linking-local-branches-to-remote-apps
 *
 * TODO:
 *  - Only I have the ability to go throw the 'done' aside flow.
 *  	- Auth other users before they can use this funcitonality???
 *  - have a bug reporter set up on firebase
 *  - listen to events that change the composition of a team or an aside
 *  	- type: team_join etc ..
 *  		- moranda can't find newly added team members
 *  	- type: message, subtype: group_unarchive
 * 	- replace test token with user tokens
 * 	- update scopes node for each user that upgrades their scopes
 * 	- listen for archive events. If a user manually archives an Aside without using moranda, Firebase should be aware of the change
 * 	- have @gg respond to empty mentions (i.e. '@gg') within groups and channels that @gg is in
 * 	- have @gg respond to DMs (use 'ambient' msg type)
 * 	- Add aside to starred
 * 	- user friendly error messages - don't just throw uncaught errors
 * 		- Error: /Aside requires @invitees
 * 	- timestamp each Aside and remind users that they're still open
 * 	- close asides automatically for people ??
 * 	- have a /feedback slash command
 * 	- have a help command
 * 	- set up 'message' event handlers to maintain updated state with slack
 * 		- type: message  --> subtype: channel_purpose
 * 	- teamData should be an object with handlers bound to it that keep it in sync with slack data
 * 	- keep a handle on the bot's id. maybe teamData.self.id does this?
 */

'use strict'

const Botkit = require('botkit')
const config = require('./config')
const Moranda = require('./moranda')

// controller is an instance of SlackBot
// slackBot inherits properties of CoreBot
// ask for the most basic permissions
// and subsequently add more scopes as needed
let controller = Moranda(Botkit, config)

function addNewScopes(src, bot) {
  let scopes = ['groups:write', 'chat:write:bot', 'groups:read', 'im:read']
  let url = controller.getAuthorizeURL(null, scopes) // returns the url to acquire the scopes from oauth flow
  let msg = `please authorize with the following link.\n${url}\nTry your command once more after you have authorized.`

  bot.replyPrivate(src, msg)
}

function dmSummary(response, convo, bot) {
  bot.api.im.list({
    token: bot.config.bot.token
  }, (err, imList) => {
      if (err) {
        throw new Error(err)
      }

      db.asides.get(response)
        .then(snapshot => {
          let asidePurpose = snapshot.val().purpose

          let asideSummary = [{
              fallback: 'An Aside summary.',
              color: "#36a64f",
              fields: [
                {
                  title: "Purpose",
                  value: asidePurpose
                },
                {
                  title: "Summary",
                  value: convo.extractResponse('summary')
                }
              ]
            }]

          let i = 0
          for (i; i < imList.ims.length; i++) {
            if (imList.ims[i].user === response.user) {
              bot.api.chat.postMessage({
                token: bot.config.bot.token,
                channel: imList.ims[i].id,
                text: 'Here is your Aside summary',
                attachments: asideSummary
              })
              break
            }
          }

        })
  })
}

/**
 * Share a user's Aside summary with the provided channels
 * @param  {Object} response Object containing response data
 * @param  {Object} convo    Object containing conversational methods and past messages
 * @param  {Object} bot      Object containing a team's bot
 * @return {Undefined}       No return specified
 */
function shareSummary(response, convo, bot) {
  let channelRegex = /<#(\w+)>/gi
  let match = channelRegex.exec(response.text)
  let channels = []
  let groupName = null
  let groupPurpose = null
  let userHandle = null
  let userImg = null
  let webAPI = bot.api

  // extract all mentions of channels
  while (match) {
    channels.push(match[1])
    match = channelRegex.exec(response.text)
  }

  // db.asides.get(...)

  console.log('>>>>> shareSummary response')
  console.log(response)
  console.log('>>>>> shareSummary channels')
  console.log(channels)

  // TODO: move each users image to their corresponding node in the 'users' reference
  Promise.all([
    db.asides.get(response).then(snapshot => {
      let aside = snapshot.val()
      groupName = groupPurpose = aside.purpose // TODO: save aside name in some point in the future
    }),
    db.users.get(response).then(snapshot => {
      let user = snapshot.val()
      userHandle = user.user
      userImg = user.img
    })
  ])
  .then(() => {
    console.log('shareSummary - after promise - asideSummary')
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
      console.log(asideSummary)
      // share summary on each mentioned channel
      channels.forEach(channel => webAPI.chat.postMessage({
        token: bot.config.bot.token,
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
          // TODO: invite bot programmatically
          // https://api.slack.com/methods/channels.invite
          console.log('>>>>>>> not_in_channe')
          // https://github.com/howdyai/botkit/blob/master/readme.md#conversationask
          convo.ask(
            `Woah! It seems like I\'m not in <#${channel}>.\nAll you gotta do is invite me: \`/invite <@${bot.config.bot.user_id}> <#${channel}>\`.\nOr just say \`cancel\``,
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
        } else if (e) { // throw for all other errors
          throw new Error(e)
        }
        // convo.repeat ???
      }))

      // TODO: have a list of the channels that the summary was ACTUALLY added to
      convo.say(`Great, I will share this summary with ${response.text.match(channelRegex).join(', ')}`)
      convo.next()
  })
}

/**
 * @param {any} bot
 * @param {any} msg
 */
function closeConversation(bot, msg) {

  //console.log('closeConversation - bot')
  //console.log(bot)
  //console.log('closeConversation - msg')
  //console.log(msg)

  let webAPI = bot.api
  let userToken = null

  db.users.get(msg)
    .then(snapshot => {
      let user = snapshot.val()
      if (!user.access_token) {
        addNewScopes(message, bot)
      } else {
        userToken = user.access_token

        // botkit using message.user to track who the bot is responding to
        // TODO: change .startConversation method so that multiple people can talk to the bot at once
        bot.startConversation(msg, (e, convo) => {
          if (e)
            throw new Error(e)

          function handleEndOfConvo(c) {
            if (c.status === 'completed') {

              webAPI.groups.archive({
                token: userToken,
                channel: msg.channel
              }) // TODO: have some sort of error handling

              // *******************************************************
              //  TESTING TESTING TESTING TESTING TESTING TESTING TESTING
              // *******************************************************

              // webAPI.groups.close({
                // token: userToken,
                // channel: msg.channel
              // }) // TODO: have some sort of error handling

              // *******************************************************
              //  TESTING TESTING TESTING TESTING TESTING TESTING TESTING
              // *******************************************************

              db.closeAside(msg, c.extractResponse('summary'))

            } else {
              console.log('ERROR: something happened that caused the conversation to stop prematurely. convo.status: ')
              console.console.log(convo.status)
            }
            // not sure if necessary
            c.next()
          }
          convo.on('end', handleEndOfConvo)

          let introQuestion = `OK, <@${msg.user}>, before I archive this Aside, would you mind summarizing the conversation for the group? What were the key takeaways?`
          convo.ask(introQuestion, (response, convo) => {

              console.log('>>>> introQuestion response')
              console.log(response)
              convo.ask(
                'do you want to share this Summary with a Channel? You can say: `#channel-name` or `nope` to skip it.',
                [
                  {
                    pattern: new RegExp(/<#\w+>/gi),
                    callback: (response, convo) => {
                      console.log('>>>> share w channel - response')
                      console.log(response)
                      shareSummary(response, convo, bot)
                      // convo.next() inside shareSummary
                    }
                }, {
                  pattern: bot.utterances.no,
                  callback: (response, convo) => {
                    // TODO: actually DM the summary
                    console.log('>>>> don\'t share - response')
                    console.log(response)
                    dmSummary(response, convo, bot)
                    convo.say('Ok, I will DM you a summary!')
                    convo.next()
                  }
                }, {
                  default: true,
                  callback: (response, convo) => {
                    convo.say('Hey, I didn\'t catch what you said there')
                    convo.repeat()
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
}




// connect all bots to Slack
controller.storage.teams.all()
  .then(snapshot => {
    snapshot.forEach(childSnapshot => {
      if (childSnapshot.val().bot) {
        controller.spawn(childSnapshot.val()).startRTM((err, bot) => {
          if (err) {
            console.log('Error connecting bot to Slack:',err);
          } else {
            controller.trackBot(bot)
          }
        })
      }
    })
  })