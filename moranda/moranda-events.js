'use strict'

const handleAsides = require('../asides')

function handleCreateBot (bot, config) {
    let _bots = {}

    if (_bots[bot.config.token]) {
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

    morandaBotkit.on('update_user', (bot, user) => {
        // use this to notify user that his changes have been saved
        console.log('update_user event - user')
        console.log(user)
    })

    // Upon registering a team, spawn a bot
    // and then connect it to RTM
    // fired within createOauthEndpoints
    morandaBotkit.on('create_bot', handleCreateBot)

    // register slash command handler for /Aside if other slash commands are created, this callback
    // must then filter to see which specific command was executed only the slash commands configured
    // to POST to our URL will trigger this handler
    morandaBotkit.on('slash_command', handleAsides)


    // This handler gets triggered in any channel in which @moranda is in, regardless of whether it's an aside or not
    // TODO: @gg has to discern whether a given channel is an aside or not
    // Once ''@gg done' is mentioned within the same channel, start summarization conversation
    morandaBotkit.hears(['done'], 'mention,direct_mention', (bot, message) => {

        console.log('.hears event')

        // asideData queries return:
        // - true if Aside still open
        // - false if Aside has been archived
        // - undefined if Aside doesn't exist (message.channel is not referencing an aside)
        db.isOpenAside(message)
            .then(open => {
            if (open) {
                console.log('done event listener - aside is open');
                closeConversation(bot, message)
            }
            })
            .catch(e => {
            console.log('isOpenAside - err: ', e)
            })
    })
}

module.exports = morandaEvents