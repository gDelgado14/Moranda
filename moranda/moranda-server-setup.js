'use strict'

const express = require('express')
// const webhooks = express()

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
        //
        // TODO: add authoentication tokens once botkit's bug is updated: 
        //       https://github.com/howdyai/botkit/issues/307
        // morandaBotkit.createWebhookEndpoints(webhooks, config.SLASH_COMMAND_TOKEN)
        //
        // morandaBotkit.createWebhookEndpoints(webhooks)
        // using sub-apps
        // https://expressjs.com/en/4x/api.html#app.use
        // webserver.use('/slack/receive', webhooks)
        morandaBotkit.createWebhookEndpoints(webserver)

        // set up service for authenticating users
        // can pass optional cb with (err, req, res)
        morandaBotkit.createOauthEndpoints(webserver)

        morandaBotkit.createHomepageEndpoint(webserver)

        /*
        // set up let's encrypt stuff
        webserver.get('/.well-known/acme-challenge/:id', function(req, res) {
            res.redirect()
        })
        */

        webserver.get('/.well-known/acme-challenge/:id', (req, res) => {
            res.send('rGjFXJevQSXK6qLk4LjofPwFL5dwDsNiO1mQo4ttD18.SCcnnKcGDDN0_1WfGOT0_xMqC8PDN-MQWnbFI1Ritq8')
        })

    })

    return
}

module.exports = setUpServerAndEndPoints