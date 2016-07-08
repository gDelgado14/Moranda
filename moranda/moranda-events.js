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