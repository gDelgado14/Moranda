'use strict'

const sessions = require('../sessions')
const handleCreateBot = require('../utils').handleCreateBot

const createSession = sessions.createSession
const initFinalizeSession = sessions.initFinalizeSession


/**
 * 
 * 
 * @param {Object} morandaBotkit - extended Botkit module
 */
function morandaEvents (morandaBotkit) {

    morandaBotkit
        .on('update_user', (bot, user) => {
            // use this to notify user that his changes have been saved
            // this could be used to let the user know that he is now able to do Sessions
        })

        // Upon registering a team, spawn a bot
        // and then connect it to RTM
        // fired within createOauthEndpoints
        .on('create_bot', handleCreateBot)

        // register slash command handler for /Aside if other slash commands are created, this callback
        // must then filter to see which specific command was executed only the slash commands configured
        // to POST to our URL will trigger this handler
        .on('slash_command', createSession)

        // update team whenever new users join the team
        .on('team_join', (bot, message) => {
            console.log('TEAM JOIN EVENT FIRED')
        })

        // Botkit parses 'message' events and gives more specific events
        .on('ambient', (bot, message) => {
            console.log('>>> message event fired')
            // check if is Session
            // then check if message posted is a link

        })

        .on('group_archive', (bot, message) => {
            // noop
            // ensure that 'open' property on firebase is set to false
            // if a Session was archived manually
        })

        .on('group_unarchive', (bot, message) => {
            // noop
            // ensure that 'open' property on firebase is set to true
            // if a Session was unarchived manually
        })

        // This handler gets triggered in any channel in which @moranda is in, regardless of whether it's an aside or not
        // TODO: @gg has to discern whether a given channel is an aside or not
        // Once ''@gg done' is mentioned within the same channel, start summarization conversation
        .hears(['done'], 'mention,direct_mention', initFinalizeSession)
        
}

module.exports = morandaEvents