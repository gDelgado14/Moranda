/**
 * initFinalizeAsides
 * -------------------------------------------------------
 * Begins closing conversation flow within an open aside
 * -------------------------------------------------------
 */

const db = require('../storage')
const promisify = require('promisify-node')


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

  // convo.ask should only be used when a response to a question alters the outcome of a conversation
  // in which case, there needs to be a way to store the responses that were said when conov.ask was NOT used
  startConversation(msg)
    .then(convo => {
    
    })
    .catch(e => {

    })
  
  

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
function initFinalizeAsides (bot, message) {

    // asideData queries return:
    // - true if Aside still open
    // - false if Aside has been archived
    // - undefined if Aside doesn't exist (message.channel is not referencing an aside)
    db.asides.get(msg).then(asideObject => {
        if (asideObject.open) {
            beginCloseConversation(bot, message)
        }
    })
    .catch(e => {
        console.log('isOpenAside - err: ', e)
        throw new Error(e)
    })

}

module.exports = initFinalizeAsides