/**
 * initFinalizeAsides
 * -------------------------------------------------------
 * Begins closing conversation flow within an open aside
 * -------------------------------------------------------
 */

'use strict'

const db = require('../storage')
const promisify = require('promisify-node')


/**
 * Get token of user who created aside
 * This user's token will be used to add moranda
 * channels he was not previously in
 * 
 * @param {Object} res   Botkit conversation response object
 * @returns {Promise}
 */
function getToken (res) {
  return db.asides.get(res).then(asideObject => {
    return asideObject.token
  })
}

/**
 * 
 * @param {String} id                  the id to find if invited to specific channels
 * @param {Array} requestedChannels    the channels to search in
 * @param {Array} channelList          Array of channel Objects - the entire list of open channels for a particular slack team
 * @return {Array}                     array containing the channels where the bot is not invited
 */
function findUninvitedChannels (id, requestedChannels, channelList) {
  // index of channels
  let c

  // search each requested channel
  return requestedChannels.filter(channel => {

    // look through all channels for a particular slack team
    for (c = 0; c < channelList.length; c++) {

      // if the current iteratee channel is one that was asked for
      // begin searching array of users that are members of that particular channel
      // return if not member of that channel
      if (channel === channelList[c].id) {
        return channelList[c].members.indexOf(id) === -1
      }
    }
  })
  
}

/**
 * Share a user's Aside summary with the provided channels
 * @param  {Object} bot      Object containing a team's bot
 * @param  {Object} res      Object containing response data
 * @param  {Object} convo    Object containing conversational methods and past messages
 * @return {Undefined}       No return specified
 */
function shareSummary (bot, res, convo) {
  let webAPI = promisify(bot.api)
  let botId = bot.config.bot.user_id

  // 'res.match' contains array of matches of the form <#CHANNELID>
  // mapping over each element to extract channel id and remove <# >
  // TODO: remove duplicate channel mentions
  let channels = res.match.map(channel => channel.replace(/(<#|>)/gi, ''))
  
  Promise.all([
    webAPI.channels.list({
      token: bot.config.bot.token
    }),
    getToken(res) // get token of user who created the aside
  ])
  .then(fulfilledPromise => {
    let channelResponse = fulfilledPromise[0]
    let userToken = fulfilledPromise[1]

    console.log('botId: ', botId)

    // check if Moranda is in the mentioned channels
    let notMemberOf = findUninvitedChannels(botId, channels, channelResponse.channels)

    // automatically add moranda to teams where he wasn't a member before
    if (notMemberOf.length > 0) {
      let alreadyMemberOf = channels.filter(chan => notMemberOf.indexOf(chan) === -1)

      // return promise inviting to all channels and also array 
      return Promise.all(notMemberOf.map(channel => webAPI.channels.invite({
              token: userToken,
              channel: channel,
              user: botId})).concat(alreadyMemberOf)
            )
      
    }

    return channels

  }).then(shareChannels => {
    // shareChannels is an array of all the channels to share a summary with
    // if Moranda was just added to the channel, then the element will be a response object
    // if Moranda was already a member then the element will simply be the channel ID
    
  })
  .catch(e => {
    console.log('>>> error fetching channel list')
  })

  let groupName = null
  let groupPurpose = null
  let userHandle = null
  let userImg = null
  
  /*

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
  })
  */
}

/**
 * Initialize dialogue for closing Asides
 * 
 * Uses Aside creator's token to close aside regardless of who
 * started the ending conversation flow
 * 
 * @param {Object} bot - Botkit object
 * @param {Object} msg - Slack message object
 */
function beginCloseConversation (bot, msg) {

  let webAPI = promisify(bot.api)
  let startConversation = promisify(bot.startConversation)
  let userToken = null

  function askKeyTakeAways (response, convo) {
    let introQuestion = `OK, <@${msg.user}>, before I archive this Aside, would you mind summarizing the conversation for the group? What were the key takeaways?`
    convo.ask(introQuestion, (response, convo) => {
      convo.say('Great.')
      askToShare(response, convo)
      convo.next()
    })
  }

  function askToShare (response, convo) {
    convo.ask('do you want to share this Summary with a Channel? You can say: `#channel-name` or `nope` to skip it.', [
      { 
        // user responded with channels to share
        pattern: new RegExp(/<#\w+>/gi),
        callback: (response, convo) => {
          console.log('>>>> share w channel - response')
          console.log(response)
          shareSummary(bot, response, convo)
          convo.next()
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
    }])
  }

  // convo.ask should only be used when a response to a question alters the outcome of a conversation
  // in which case, there needs to be a way to store the responses that were said when conov.ask was NOT used
  bot.startConversation(msg, askKeyTakeAways)
  
  

  /*
  db.users.get(msg)
    .then(snapshot => {
      let user = snapshot.val()
      if (!user.access_token) {
        // sometimes an unauthed user may execute 
        bot.botkit.addNewScopes(message, bot)
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
    */
}








/**
 * Check if '@moranda done' was said within an aside
 * and if so, then start ending conversation flow
 * 
 * @param {Object} bot
 * @param {Object} message
 */
function initFinalizeAsides (bot, msg) {

    // asideData queries return:
    // - true if Aside still open
    // - false if Aside has been archived
    // - undefined if Aside doesn't exist (message.channel is not referencing an aside)
    db.asides.get(msg).then(asideObject => {
        if (asideObject.open) {
            beginCloseConversation(bot, msg)
        }
    })
    .catch(e => {
        console.log('isOpenAside - err: ', e)
        throw new Error(e)
    })

}

module.exports = initFinalizeAsides