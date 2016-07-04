
function setUpServerAndEndPoints (morandaBotkit, config) {

    // global access to express server available through morandaBotkit.webserver
    morandaBotkit.setupWebserver(config.PORT, (err, webserver) => {
        if (err) {
            throw new Error(err)
        }

        // configure server for /Aside commands and all other outgoing webhooks
        // /Aside currently the only command sending outgoing webhooks
        // listen for POST requests at '/slack/receive'
        // Each application can have only one slash command token, even if they have multiple commands associated with an app
        morandaBotkit.createWebhookEndpoints(webserver, config.SLASH_COMMAND_TOKEN)

        morandaBotkit.createHomepageEndpoint(webserver)

        // set up service for authenticating users
        // can pass optional cb with (err, req, res)
        morandaBotkit.createOauthEndpoints(webserver)
    })

    return
}

module.exports = setUpServerAndEndPoints