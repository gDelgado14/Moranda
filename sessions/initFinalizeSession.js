/**
 * initFinalizeAsides
 * -------------------------------------------------------
 * Begins closing conversation flow within an open aside
 * -------------------------------------------------------
 */

'use strict'

const db = require('../storage')
const promisify = require('promisify-node')
let userObj

function doSomethingCrazy () {
  // noop
}

// utility to stall the archiving of a Session
function stall () {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('Stalling complete')
      }, 1000)
    })
}
/**
 * Create Slack compliant attachment that will be stringified by Botkit
 * 
 * @param {String} purpose    - Session purpose set by user
 * @param {String} summary    - Session summary / key takeaways set by user
 * @returns {Array} will be stringified by Botkit
 */
function createSummary (purpose, summary) {

  return [{
            fallback: 'An Aside summary.',
            color: "#36a64f",
            fields: [
              {
                title: "Purpose",
                value: purpose
              },
              {
                title: "Summary",
                value: summary
              }
            ]
          }]
}

/**
 * Fetch Session purpose from database
 *
 * @param  {Object} res      Botkit response Object containing conversation response data
 * @returns {Promise} containing Session purpose
 */
function getAsidePurpose (res) {
  return db.asides.get(res).then(asideObj => asideObj.purpose)
}

/**
 * Get token of user who created aside
 * This user's token will be used to add moranda
 * channels he was not previously in
 * 
 * @param {Object} res   Botkit conversation response object
 * @returns {Promise}
 */
function getUserObj (res) {
  return db.users.get(res)
}


/**
 * Given a set of channels and a list of all slack channels, return an array
 * of the channels that the user is not a member of
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

function dmSummary(response, convo, bot) {
  let webAPI = promisify(bot.api)

  return webAPI.im.list({
    token: bot.config.bot.token
  })
  .then(imList => {

    getAsidePurpose(response)
    .then(asidePurpose => {
      let i
      let asideSummary = createSummary(asidePurpose, convo.extractResponse('summary'))
      
      // find the right user to DM the summary to
      for (i = 0; i < imList.ims.length; i++) {
        if (imList.ims[i].user === response.user) {
          break
        }
      }

      return webAPI.chat.postMessage({
            token: bot.config.bot.token,
            channel: imList.ims[i].id,
            text: 'Here is your Aside summary',
            attachments: asideSummary
          })

    })
  })
  .catch(err => bot.say(err))
}



/**
 * Get user to invite Moranda to channels it is not part of
 * 
 * Note: To automaically invite Moranda to channels using a user's token
 * That token requires channels:write scope
 * 
 * Issue: Refer to Issue #4 comment on this function
 * 
 * @param {Object} bot        - Botkit bot
 * @param {Object} convo      - Botkit conversation object
 * @param {Array} notMember   - Array of channel id's that Moranda is not a member of 
 */
function askForInvite (bot, convo, notMember) {

  return new Promise((resolve, reject) => {
    let channels = notMember.map(chan => ` <#${chan}>`).toString().trim()

    convo.ask(
    `Woah! It seems like I\'m not in ${channels}\nAll you gotta do is invite me: \`/invite <@${bot.config.bot.user_id}> #ChannelName\`. Once you've added me, say \`Ok\`.\nOr just say \`No\``,
    [{
        pattern: bot.utterances.no,
        callback: (response, convo) => {
          convo.say(`Ok. I won't share the summary with ${channels}`)
          convo.next()
          resolve([])
        }
      },
      {
        pattern: bot.utterances.yes,
        callback: (response, convo) => {
          // TODO: figure out which channels Moranda was actually invited to
          //        currently assuming moranda was added to all the channels
          convo.say(`great! I will now archive this Session.`)
          convo.next()
          resolve(notMember)
        }
      },
      {
        default: true,
        callback: (response, convo) => {
          convo.say('woo default response')
          convo.next()
          resolve()
        }
      }] // end array of decisions
    ) // end ask
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

  // this data will be fetched asynchronously
  let asidePurpose

  // 'res.match' contains array of matches of the form <#CHANNELID>
  // mapping over each element to extract channel id and remove <# >
  // TODO: remove duplicate channel mentions
  let channels = res.match.map(channel => channel.replace(/(<#|>)/gi, ''))
  
  Promise.all([
    webAPI.channels.list({
      token: bot.config.bot.token
    }),
    getUserObj(res),
    getAsidePurpose(res)
  ])
  .then(fulfilledPromise => {
    let channelResponse = fulfilledPromise[0]
    userObj = fulfilledPromise[1]
    asidePurpose = fulfilledPromise[2]

    // check if Moranda is in the mentioned channels
    let notMemberOf = findUninvitedChannels(botId, channels, channelResponse.channels)
    
    // automatically add moranda to teams where he wasn't a member before
    if (notMemberOf.length > 0) {
      let alreadyMemberOf = channels.filter(chan => notMemberOf.indexOf(chan) === -1)

      // return the final array of channels the user wants to share the summary with
      return Promise.all([
        askForInvite(bot, convo, notMemberOf),
        alreadyMemberOf,
        channels
      ])
      
    }

    return channels

  }).then(shareChannels => {
    // shareChannels is either:
    //  - an array of all the channels to share a summary with
    //  - two arrays containing:
    //    - an array of the channels Moranda was just invited to
    //    - an array of the channels Moranda was already a member of

    // the user was not a member of one or more requested channels
    // this does not mean that shareChannels[1] (alreadyMemberOf) contains any channels
    if (shareChannels.length === 3) {
      shareChannels = shareChannels[0].concat(shareChannels[1])

      // if there are no channels to share to ...
      if (shareChannels.length === 0) {
        convo.say(`Instead I'll DM <@${userObj.id}> the summary. Have a wonderful rest of your day!`)
        convo.next()
        return dmSummary(res, convo, bot)
      }
    }

    let asideSummary = createSummary(asidePurpose, convo.extractResponse('summary'))
    let channelNames = shareChannels.map(chan => `<#${chan}> `)
    convo.say(`Great, I will share this summary with ${channelNames}`)

    
    return Promise.all(shareChannels.map(chan => webAPI.chat.postMessage({
      token: bot.config.bot.token,
      channel: chan,
      text: `Here\'s an update of the \"${asidePurpose}\" Sidebar`,
      attachments: asideSummary,
      as_user: true })
      ).concat(stall) // TODO: stall not working
    )
  })
  .then(postMessageResponseArray => {
    // TODO: set asides as closed in db
    webAPI.groups.archive({
      token: userObj.access_token,
      channel: res.channel
    })
  })
  .catch(e => {
    console.log('>>> error: ', e)
    bot.say(e)
  })
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
  // let startConversation = promisify(bot.startConversation)

  function askKeyTakeAways (response, convo) {

    let introQuestion = `OK, <@${msg.user}>, before I archive this Aside, would you mind summarizing the conversation for the group? What were the key takeaways?`
    convo.ask(introQuestion, (response, convo) => {
      convo.say('Great.')
      askToShare(response, convo)
      convo.next()
    }, { key: 'summary' })
  }

  function askToShare (response, convo) {
    convo.ask('Do you want to share this Summary with a Channel? You can say: `#channel-name` or `nope` to skip it.', [
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

}


/**
 * Check if '@moranda done' was said within an aside
 * and if so, then start ending conversation flow
 * 
 * @param {Object} bot
 * @param {Object} message
 */
function initFinalizeAsides (bot, msg) {
    // this handler is used for when a user invites moranda into channels it was previously not in
    // doSomethingCrazy is a noop
    bot.botkit.on('channel_joined', doSomethingCrazy)

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