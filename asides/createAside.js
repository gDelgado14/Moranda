'use strict'

const db = require('../storage')
const promisify = require('promisify-node')

/**
 * Get the unique Ids of each user
 * 
 * @param {Array}  usernames
 * @param {Object} contains object represenation of user data for a specific team
 * @returns {Array} id's that correspond to the usernames
 */
function getInviteeIds (usernames, userObject) {
  let userIdsArray = Object.keys(userObject)
  return usernames.map(username => {
    let i
    
    // trim whitespace and @
    let cleanedUsername = username.replace(' @', '')
    
    for (i = 0; i < userIdsArray.length; i++) {
      let userId = userIdsArray[i]
      if (userObject[userId].user === cleanedUsername) {
        return userId
      }
    }
  })
}

/**
 * check if user has permission to user asides
 * 
 * @param {any} msg
 * @return {Promise} resolves to object containing a team's users
 */
function getUsers (msg) {
  return db.users.all(msg)
}

/**
 * Save newlycreated aside
 * 
 * @param {Object} aside -   new Aside object to be saved to firebase
 * @param {String} team_id - team id for corresponding aside
 * @param {String} groupId - the id of the Aside ('group' in Slack vernacular)
 * @return {Promise} -      Firebase promise
 */
function saveNewAside (aside, team_id, groupId) {
  return db.asides.save(aside, team_id, groupId)
}

function openAside (bot, msg) {
  let asideTitle
  let inviteeUsernames
  let inviteeIds
  let token
  let webAPI = promisify(bot.api)
  
  //check if user even has permission to do asides
  getUsers(msg)
    .then(userObj => {
      // TODO: Ensure consistency in data (Issue #18)
      // see if the person who sent the aside request has the proper scopes
      if (!userObj[msg.user_id].scopes) {
        // TODO: throw within this statement, catch, and handle accordingly
        bot.botkit.addNewScopes(msg, bot)
        return
      }
      
      asideTitle = msg.text.replace(/@(\w+)/gi, '').toLowerCase().trim()
      if (!asideTitle) {
        // TODO: throw within this statement, catch, and handle accordingly
        bot.replyPrivate(msg, '/Aside requires a channel topic!')
        return
      }

      inviteeUsernames = msg.text.match(/\s@\w+/gi)
      if (!inviteeUsernames) {
        // TODO: throw within this statement, catch, and handle accordingly
        bot.replyPrivate(msg, '/Aside requires @invitees')
        return
      } 
      
      // get all invitee ids
      inviteeIds = getInviteeIds(inviteeUsernames, userObj)
      
      // add moranda to Aside as well
      inviteeIds.push(bot.config.bot.user_id)

      token = userObj[msg.user_id].access_token

      return webAPI.groups.create({
        token: token,
        name: asideTitle
      })
    })
    .then(response => {
      let aside = {}
          aside.open = true
          aside.purpose = asideTitle
          aside.created = response.group.created
          // add token of user who created aside
          // for the sake of hijaking the token
          // to have all aside members be able to use asides
          aside.token = token

      saveNewAside(aside, msg.team_id, response.group.id)

      // wait until all invitees have been added to the Aside
      return Promise.all(inviteeIds.map(invitee => webAPI.groups.invite({
              token: token,
              channel: response.group.id,
              user: invitee}))
            )
    })
    .then(responseArray => {
      // TODO: replace 'txt' w attachment. Formatting all wonky
      let txt = `Welcome @${msg.user_name + ', ' + msg.text.match(/@(\w+)/gi).join(', ')}!
<@${msg.user_id}> created this Aside and set the purpose to:
> ${asideTitle}
When you're done, I'll help summarize takeaways and offer to share them with a Channel (optional) before archiving the Sidebar for you.
Just @mention me in this sidebar and I'll take care of it: \`<@${bot.config.bot.user_id}> done\``
      let groupId = responseArray[0].group.id
      
      // let Slack servers know that things went well
      // any string passed to .send() gets posted by slackbot
      bot.res.status(200).send()
      
      return Promise.all([
        // Have Aside caller set purpose of the aside
        webAPI.groups.setPurpose({
          token: token,
          channel: groupId,
          purpose: asideTitle
        }),
        // have Moranda say introductory statements
        webAPI.chat.postMessage({
          token: bot.config.bot.token,
          channel: groupId,
          text: txt,
          as_user: true
        })
      ])
    })
    .catch(e => {
      if (e === 'name_taken') {
        // name taken event fired (Issue #3)
        bot.replyPrivate(msg, 'This Aside topic is already taken! Try another topic instead.')
        return
      }
      throw e
    })
}

module.exports = openAside