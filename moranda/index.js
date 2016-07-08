'use strict'

const setUpCustomEventHandlers = require('./moranda-events')
const setUpWebServerAndEndpoints = require('./moranda-server-setup')
const storage = require('../storage')

// extend Slack_Bot functionalities
function Moranda(Botkit, config, dirname) {
    let morandaBotkit = Botkit.slackbot({
            storage: storage,
            webserver: {
                static_dir: dirname
            }
        }).configureSlackApp({
            clientId: config.CLIENT_ID,
            clientSecret: config.CLIENT_SECRET,
            scopes: 'commands,bot' // ask for the most basic permissions and subsequently add more scopes as needed
        })

    setUpCustomEventHandlers(morandaBotkit)
    setUpWebServerAndEndpoints(morandaBotkit, config)

    // extending controller to manage bot instances
    morandaBotkit.bots = {} // this will hold all bot instances being managed accross all teams

    /** Keep track of instantiated bots - don't connect to RTM more than once per bot
     * @param  {Object} botInstance - instance of a bot to track 
     */
    morandaBotkit.trackBot = function trackBot (botInstance) {
        morandaBotkit.bots[botInstance.config.token] = botInstance
    }

    // TODO: create module 
    morandaBotkit.addNewScopes = function addNewScopes (slackMessageObj, bot) {
        let scopes = ['groups:write', 'groups:read', 'chat:write:bot', 'im:read']
        let url = bot.botkit.getAuthorizeURL(null, scopes) // returns the url to acquire the scopes from oauth flow
        let msg = `You don\'t have permission to do asides.\nplease authorize with the following link:\n${url}\nTry your command once more after you have authorized.`

        bot.replyPrivate(slackMessageObj, msg)
    }

    
    return morandaBotkit
}

module.exports = Moranda