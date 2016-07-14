'use strict'

const db = require('../storage')
const initialScopes = require('./scopes').initialScopes.split(',')


function updateUsers (teamId, users) {
    return db.users.save(teamId, users)
}

/**
 * fetch all team members of a particular team
 * 
 * @param {string} teamId
 * @returns {Promise} resolves to Object containing all users of a particular team
 */
function getUsers (teamId) {
    return db.users.all(teamId)
}

/**
 * Update a team based on the response object
 * returned from rtm.start
 * 
 * Response object:
 * https://api.slack.com/methods/rtm.start
 * 
 * @param {Object} teamData   - response object returned from call to rtm.start
 * @return {Promise}            - promise that resolves once all operations completed
 */
function updatedb (teamData) {
    // we only care about non-deleted users
    // get data for active team members
    // set 'scopes' to false so that we know
    // they haven't authenticated yet
    // get their name so that we may cross reference their name with their uid
    let activeUsers = {}
    teamData.users.forEach(user => {
      if (!user.deleted) {
        activeUsers[user.id] = {
          scopes: initialScopes,
          user: user.name,
          img: user.profile.image_24
        }
      }
    })

    return updateUsers(teamData.team.id, activeUsers)
}
    
/*
    let activeUsers = {}
    teamData.users.forEach(user => {
      if (!user.deleted) {
        activeUsers[user.id] = {
          scopes: false,
          user: user.name,
          img: user.profile.image_24
        }
      }
    })

    return (
    db.ref(`users/${teamData.team.id}`).once('value')
      .then(snapshot => {

        console.log('>>>>> DataSnapshot')
        console.log(snapshot.val())

        if (snapshot.exists()) {
          snapshot.forEach(childSnapshot => {

            console.log('>>>>> ChildSnapshot')
            console.log(childSnapshot.key)
            console.log(childSnapshot.val())

            // replace activeusers node with existing value in firebase
            // but append img property to existing firebase value
            let img = activeUsers[childSnapshot.key].img
            activeUsers[childSnapshot.key] = childSnapshot.val()
            activeUsers[childSnapshot.key].img = img
          })
        }

        console.log('>>>>> activeUsers')
        console.log(activeUsers)

        db.ref(`users/${teamData.team.id}`).update(activeUsers)
      })
    )
  }

*/

function handleCreateBot (bot, config) {
    let morandaBotkit = bot.botkit
    let bots = morandaBotkit.bots
    
    if (bots[bot.config.token]) {
        // already online! do nothing.
        return
    }

    bot.startRTM((err, bot, res) => {

        if (err) {
            throw new Error('startRTM error: ', err)
        }

        morandaBotkit.trackBot(bot)

        // add bot data to firebase
        updatedb(res)
        .then(() => {            
            bot.startPrivateConversation({user: config.createdBy}, (err,convo) => {
                if (err)
                    throw new Error(err)
                
                convo.say(`Oh, hey <@${config.createdBy}>! I'm so excited to be part of your team.\n\nI\'m currently in alpha so I cannot do too much at the moment.\n\nIf you want to try out my current feature, just type \`/session _topic_name_ @invitees\`\n\nThis command will create a Session: a private temporary group to discuss anything.\n\nOnce your conversation is over, I will help distribute the key takeways to their respective channels.\n\nThat's it for now. Have a wonderful day.\n\nHere's a cute cat gif just for you.\n\nhttp://www.cutecatgifs.com/wp-content/uploads/2015/04/cute-aww.gif`)
            
                convo.next()
            })
            return
        })
        .catch(e => {
            throw new Error(e)
        })
        
    })
}


module.exports = handleCreateBot