'use strict'

const setUpCustomEventHandlers = require('./moranda-events')
const setUpWebServerAndEndpoints = require('./moranda-server-setup')
const storage = require('../storage')
const initialScopes = require('../utils').scopes

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
            redirectUri: 'https://c6dcfdc7.ngrok.io/oauth',
            scopes: initialScopes // ask for the most basic permissions and subsequently add more scopes as needed
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

    return morandaBotkit
}

module.exports = Moranda