'use strict'

// const controller = require('../controller')

function handleAsides(bot, msg) {
    // to send information by way of slash command use `bot`
    // to communicate using @gg use global ggBot

    let groupTitle = message.text.replace(/@(\w+)/gi, '').toLowerCase().trim()
    let dummy = null

    // have controller function that manages firebase
    
    db.getId(message)
    .then(memberObject => {
      // if no actual users mentioned then notify /Aside caller that this is required
      if (!memberObject.teamMembers.length) {
        throw new Error('/Aside requires @invitees')
      }

      // shorthand for api methods
      let webAPI = bot.api
      let teamMembers = memberObject.teamMembers
      let userToken = memberObject.token

      // add moranda id
      teamMembers.push(bot.config.bot.user_id)

      // TODO:
      // pass userToken - auth'd user creates group
      webAPI.groups.create({
        token: userToken,
        name: groupTitle
      }, (e, response) => {
        if (e && e === 'missing_scope') {

          // sends JSON response ...
          // bot.replyPrivate(message, e)

          addNewScopes(message, bot)
        } else if (e && e === 'name_taken') {
          // TODO: rename closed aside and then try this call once more
          // if the aside name that is colliding with this one is open then rename it
          throw new Error('name_taken')
        } else {
          console.log('>>>>> webAPI.groups.create - response');
          // add newly created Aside group to firebase
          // {} for dynamically creating child inside firebase
          console.log(response)
          let aside = {}
          aside.open = true
          aside.purpose = groupTitle
          aside.created = Date.now()
          db.asides.save(aside, message.team_id, response.group.id)

          // add newly-created group to teamData
          //teamData.groups.push(response.group)

          // add the mentioned members to the group
          teamMembers.forEach(member => {
            webAPI.groups.invite({
              token: userToken,
              channel: response.group.id,
              user: member
            }, (e) => {
              if (e)
                throw new Error(e)

              // once Moranda in channel, initiate dialogue
              if (member === bot.config.bot.user_id) {

                  // TODO: use propper formatting to get username hyperlinks
                  // https://api.slack.com/docs/formatting
                  //
                  // TODO: fetch bots name by referecing its ID
                  //
                  // use attachments if regular text formatting doesnt work
                  // https://api.slack.com/docs/attachments
                let txt = `Welcome @${message.user_name + ', ' + message.text.match(/@(\w+)/gi).join(', ')}!
@${message.user_name} created this Aside and set the purpose to:
> ${groupTitle}
When you're done, I'll help summarize takeaways and offer to share them with a Channel (optional) before archiving the Sidebar for you.
Just @mention me in this sidebar and I'll take care of it: \`<@${bot.config.bot.user_id}> done\``

                // Have Aside caller set purpose of the aside
                webAPI.groups.setPurpose({
                  token: userToken,
                  channel: response.group.id,
                  purpose: groupTitle
                }, e => {
                  if (e)
                    throw new Error(e)
                })

                // TODO: replace 'txt' w attachment. Formatting all wonky
                // have Moranda say introductory statements
                webAPI.chat.postMessage({
                  token: bot.config.bot.token,
                  channel: response.group.id,
                  text: txt,
                  as_user: true
                }, e => {
                  if (e)
                    throw new Error(e)
                })
              }
            })
          })

          // let Slack servers know that things went well
          // any string passed to .send() gets posted by slackbot
          bot.res.status(200).send()
        }

      })

    })

}


module.exports = handleAsides