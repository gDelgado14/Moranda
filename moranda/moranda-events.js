'use strict'

const asides = require('../asides')

const createAside = asides.createAside
const initFinalizeAside = asides.initFinalizeAside

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



function handleCreateBot (bot, config) {
    let bots = bot.botkit.bots

    if (bots[bot.config.token]) {
        // already online! do nothing.
        return
    }

    bot.startRTM((err, bot, res) => {

        if (err) {
            throw new Error('startRTM error: ', err)
        }

        morandaBotkit.trackBot(bot)

        // add bot data to firebase or update it if its already there
        db.updateDB(res)
        .then(() => {
            console.log('>>>>>> successfully updated firebase!')

            bot.startPrivateConversation({user: config.createdBy}, function(err,convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say(`Oh, hey <@${config.createdBy}>! I'm so excited to be part of your team.\n\nI\'m currently in alpha so I cannot do too much at the moment.\n\nIf you want to try out my current feature, just type \`/aside _topic_name_ @invitees\`\n\nThis command will create an Aside: a private temporary group to discuss information.\n\nOnce your conversation is over, I will help distribute the key takeways to their respective channels.\n\nThat's it for now. Have a wonderful day.\n\nHere's another cute cat gif just for you.\n\nhttp://www.cutecatgifs.com/wp-content/uploads/2015/04/cute-aww.gif`)
            }
            });

            return
        })
        .catch(e => {
            console.log('errroorororrrr');
            throw new Error(e)
        })
        

    });
}

/**
 * 
 * 
 * @param {Object} morandaBotkit - extended Botkit module
 */
function morandaEvents (morandaBotkit) {

    morandaBotkit
        .on('update_user', (bot, user) => {
            // use this to notify user that his changes have been saved
            console.log('update_user event - user')
            console.log(user)
        })

        // Upon registering a team, spawn a bot
        // and then connect it to RTM
        // fired within createOauthEndpoints
        .on('create_bot', handleCreateBot)

        // register slash command handler for /Aside if other slash commands are created, this callback
        // must then filter to see which specific command was executed only the slash commands configured
        // to POST to our URL will trigger this handler
        .on('slash_command', createAside)

        // update team whenever new users enter
        .on('team_join', (bot, message) => {
            console.log('TEAM JOIN EVENT FIRED')
        })

        // This handler gets triggered in any channel in which @moranda is in, regardless of whether it's an aside or not
        // TODO: @gg has to discern whether a given channel is an aside or not
        // Once ''@gg done' is mentioned within the same channel, start summarization conversation
        .hears(['done'], 'mention,direct_mention', initFinalizeAside)
        
}

module.exports = morandaEvents