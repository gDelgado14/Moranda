'use strict'

const handleCreateBot = require('./handleCreateBot')
const initialScopes = require('./scopes')

const Utils = {
    handleCreateBot: handleCreateBot,
    scopes: initialScopes
}

/**
 * Adds scopes to user tokens
 * 
 * @param {Object} slackMessageObj
 * @param {Object} bot
 */
Utils.addNewScopes = function addNewScopes (slackMessageObj, bot) {
    let scopes = ['groups:write', 'groups:read', 'chat:write:bot', 'im:read']
    let url = bot.botkit.getAuthorizeURL(null, scopes) // returns the url to acquire the scopes from oauth flow
    let msg = `You don\'t have permission to do asides.\nplease authorize with the following link:\n${url}\nTry your command once more after you have authorized.`

    bot.replyPrivate(slackMessageObj, msg)
}



module.exports = Utils