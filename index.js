// Moranda source code
// (c) 2016 Giorgio Delgado



/**
 *
 *	deploy with git push heroku botkit:master
 *
 *  managing multiple heroku environments
 *	https://devcenter.heroku.com/articles/multiple-environments#advanced-linking-local-branches-to-remote-apps
 *
 * TODO:
 *  - Only I have the ability to go call the 'done' aside flow.
 *  	- Auth other users before they can use this funcitonality???
 *  - have a bug reporter set up on firebase
 *  - listen to events that change the composition of a team or an aside
 *  	- type: team_join etc ..
 *  		- moranda can't find newly added team members
 *  	- type: message, subtype: group_unarchive
 * 	- replace test token with user tokens
 * 	- update scopes node for each user that upgrades their scopes
 * 	- isten for archive events. If a user manually archives an Aside without using moranda, Firebase should be aware of the change
 * 	- have @gg respond to empty mentions (i.e. '@gg') within groups and channels that @gg is in
 * 	- have @gg respond to DMs (use 'ambient' msg type)
 * 	- Add aside to starred
 * 	- user friendly error messages - don't just throw uncaught errors
 * 		- Error: /Aside requires @invitees
 * 	- timestamp each Aside and remind users that they're still open
 * 	- close asides automatically for people ??
 * 	- have a /feedback slash command
 * 	- have a help command
 * 	- set up 'message' event handlers to maintain updated state with slack
 * 		- type: message  --> subtype: channel_purpose
 * 	- teamData should be an object with handlers bound to it that keep it in sync with slack data
 * 	- keep a handle on the bot's id. maybe teamData.self.id does this?
 */

'use strict'

const Botkit = require('botkit')
const config = require('./config')
const Moranda = require('./moranda')

// controller is an instance of SlackBot
// slackBot inherits properties of CoreBot
let landingPageDir = __dirname + '/public'
let controller = Moranda(Botkit, config, landingPageDir)


// connect all bots to Slack
controller.storage.teams.all()
  .then(snapshot => {
    snapshot.forEach(childSnapshot => {
      if (childSnapshot.val().bot) {
        controller.spawn(childSnapshot.val()).startRTM((err, bot) => {
          if (err) {
            console.log('Error connecting bot to Slack:',err)
          } else {
            controller.trackBot(bot)
          }
        })
      }
    })
  })