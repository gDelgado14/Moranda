'use strict'

const setUpCustomEventHandlers = require('./moranda-events')
const setUpWebServerAndEndpoints = require('./moranda-server-setup')
const storage = require('../storage')

// extend Slack_Bot functionalities
function Moranda(Botkit, config) {
    let morandaBotkit = Botkit.slackbot({
            storage: storage()
        }).configureSlackApp({
            clientId: config.CLIENT_ID,
            clientSecret: config.CLIENT_SECRET,
            scopes: 'commands,bot'
        })
    
    setUpCustomEventHandlers(morandaBotkit)
    setUpWebServerAndEndpoints(morandaBotkit, config)

    // extending controller to manage bot instances
    morandaBotkit.bots = {} // this will hold all bot instances being managed accross all teams

    /** Keep track of instantiated bots - don't connect to RTM more than once per bot
     * @param  {Object} botInstance - instance of a bot to track 
     */
    morandaBotkit.trackBot = function trackBot(botInstance) {
        morandaBotkit.bots[botInstance.config.token] = botInstance
    }

    
    return morandaBotkit
}

module.exports = Moranda