'use strict'

const handleCreateBot = require('./handleCreateBot')
const scopes = require('./scopes')

const Utils = {
    handleCreateBot: handleCreateBot,
    scopes: scopes.initialScopes,
    upgradedScopes: scopes.upgradedScopes
}

/**
 * Adds scopes to user tokens
 * 
 * @param {Object} slackMessageObj
 * @param {Object} bot
 */
Utils.addNewScopes = function addNewScopes (bot, slackMessageObj) {
    // getAuthorizeURL provies a url with the initial scopes
    // we then replace the initial scopes with the upgraded scopes
    let url = bot.botkit.getAuthorizeURL(slackMessageObj.team_id).replace(/&scope=(\w+(,\w+)*)/gi, '&scope=' + scopes.upgradedScopes)
    let msg = `Hey, you don\'t have the required authentication permissions to launch Sessions.\nplease authorize with the following link:\n${url}\nTry your command once more after you have authorized.`

    bot.replyPrivate(slackMessageObj, msg)
}



module.exports = Utils