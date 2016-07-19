'use strict'

const Firebase = require('firebase')
const upgradedScopes = require('../utils/scopes').upgradedScopes.split(',')

function Storage () {
  // Initialize the app with a service account, granting admin privileges
  // https://firebase.google.com/docs/database/server/start
  Firebase.initializeApp({
    databaseURL: 'https://project-3576296690235739912.firebaseio.com/',
    serviceAccount: './dbaccount.json'
  })

  let db = Firebase.database()

  // workaround for SlackBot.js calling users.get without a reference to a team id (SlackBot.js:481)
  let lastUpdatedTeamId = null

  /**
   * Update a single user on Firebase 
   * 
   * @param {Object} userObj - Object literal containing user data
   * @returns {Promise} 
   */
  function saveSingleUser (userObj, cb) {
    // users.save can save data for one user or do a bulk update for all users given a teamid
    if (!userObj.id || !userObj.team_id) {
      return Promise.reject('No ID specified')
    }
    // create user reference ordered by team_id
    // create username reference ordered by team_id
    return db.ref(`users/${userObj.team_id}/${userObj.id}`).update(userObj).then(() => {
      // if we passed a callback function as second param (meaning this was called from SlackBot.js:493)
      if (cb)
        cb(null, userObj.id)
    })
  }

  /**
   * 
   * 
   * @param {String} teamId - id of team that the users belong to
   * @param {Object} usersObjects - object containing all team members
   * @returns {Promise}
   */
  function saveGroup (teamId, usersObjects) {
    return db.ref(`users/${teamId}`).update(usersObjects)
  }

  // consider switching to const if all methods
  // added to obj immediately
  let storage = {
    teams: {
      get: function (teamId, cb) {

        db.ref(`teams/${teamId}`).once('value')
          .then(teamSnapshot => cb(null, teamSnapshot.val()))
          .catch(err => cb(err))
      },
      save: function (team, cb) {
        if (!team.id) {
          return Promise.reject('No ID specified')
        } else {
          return db.ref('teams/' + team.id).update(team).then(() => {
            if (cb) {
              lastUpdatedTeamId = team.id
              cb(null, team.id)
            }
          }).catch(e => {
            throw new Error(e)
          })
        }
      },
      all: function () {
        return db.ref('teams').once('value')
      }
    },
    users: {
      get: function (identity) {
        let team = null
        let user = null
        let hasCallback = false

        // consider normalizing arguments before passing them into this function
        if (identity.team_id && identity.user_id) {
          team = identity.team_id
          user = identity.user_id
        } else if (identity.team && identity.user) {
          team = identity.team
          user = identity.user
        } else if (identity.team_id && identity.id) {
          team = identity.team_id
          user = identity.id
        } else if (arguments.length === 2 && typeof arguments[1] === 'function') {
          // Probably being called from SlackBot.js in oauth flow (SlackBot.js:481)
          hasCallback = true
          team = lastUpdatedTeamId
          user = identity
        } else {
          return Promise.reject('object must contain team id and user id properties')
        }
        // return promise with dataSnapshot
        return db.ref(`users/${team}/${user}`).once('value').then(userSnapshot => {
          if (hasCallback && userSnapshot.exists() && userSnapshot.val().access_token) {
            // TODO: img node disappears when user updates credentials

            /**
             * the problem with the way i've structured this method is:
             *  - the user who adds moranda to slack gets an access_token given to him, which is saved in db
             *  - all other team members are also added to db but are missing access_tokens
             *  - when any other user goes to get a token, their token is not saved because 
             *    botkit thinks they already have all their data (incuding token) saved to db 
             *    (SlackBot.js:482) 
             *  - 
             */

            // if we are updating an existing user, return that user
            let userObj = userSnapshot.val() 

            // append new scopes to already existsing scopes
            userObj.scopes = userObj.scopes.concat(upgradedScopes)

            // invoke callback with userobj
            return arguments[1](null, userObj)
          } else if (hasCallback && !userSnapshot.exists()) {
            // if the user is new (and has no reference in firebase) then there is nothing to pass the callback
            return arguments[1](null, null)
          } else if (hasCallback && userSnapshot.exists() && !userSnapshot.val().access_token) {
            // user was added as part of adding moranda to slack but never actually got authenticated (user doesnt have a token)
            
            // TODO: users lose certain scopes in firebase because of the way im saving scopes 
            //        howver, the token has increased access within Slack and so apis requesting
            //        the requisite permissions will have them already
            //        userObj.scopes.concat(upgradedScopes) works but only for the user who installed Moranda
            //        need a way to keep old scopes and concat / append new scopes into firebase
            return arguments[1](null, null)
          }
          return userSnapshot.val()
        })
        .catch(e => {
          throw new Error(e)
        })
      },
      /**
       * 
       * @param  {Object}   user  contains [.team_id, .user_id, .text]
       * @return {Promise}           promise with object containing array of user ids and user access token
       *
       */
      save: function (data) {
        let cb
        // check if we passed in an object literal as second param (containing all users of a particular slack team)
        if (arguments.length === 2 && arguments[1] !== null && typeof arguments[1] === 'object') {
          return saveGroup(arguments[0], arguments[1])
        } 
        // check if we passed a callback function as second param (meaning this was called from SlackBot.js:493)
        else if (arguments.length === 2 && typeof arguments[1] === 'function') {
          cb = arguments[1]
        }

        return saveSingleUser(data, cb)
      },
      all: function(identity) {
        // identity most likely a Botkit msg object containing team_id property
        // otherwise the team_id is being passed directly (team_id === identity)
        let teamId = identity.team_id ? identity.team_id : identity

        return db.ref(`users/${teamId}`).once('value').then(usersSnapshot => {
          if (usersSnapshot.exists()) {
            return usersSnapshot.val()
          }

          return new Error(`Reference to users node for team ${teamId} does not exist`)
        })
      }
    },
    channels: {
      get: 1,
      save: 2,
      all: 3
    },
    asides: {
      get: function (response) {
        if (!response.team || !response.channel) {
          return Promise.reject('must specify teamid and userid')
        }
        return db.ref(`asides/${response.team}/${response.channel}`).once('value').then(asideSnapshot => asideSnapshot.val())
      },
      save: function (asideData, teamId, groupId) {
        return db.ref(`asides/${teamId}/${groupId}`).update(asideData)
      },
      all: function (teamId) {
        return db.ref(`asides/${teamId}`).once('value').then(asidesSnapshot => asidesSnapshot.val())
      }
    }
  }

  /**
   * get id of username  message.team_id, message.user_id, message.text
   * @param  {Object}   message  contains [.team_id, .user_id, .text]
   * @return {Promise}           promise with object containing array of user ids and user access token
   *
   */
  storage.getId = function (msg) {
    
    return storage.users.all(msg.team_id)
            .then(snapshot => returnIds(snapshot))
  }

  /**
   * set an aside as closed in Firebase
   * @param  {Number}   asideId    the id of the aside (group id)
   * @return {Promise}
   */
  storage.closeAside = function (identity, summary) {
    console.log('>>>> closeAside identity')
    console.log(identity)
    if (!identity.team || !identity.channel) {
      return Promise.reject('must specify teamid and userid')
    }
    return db.ref(`asides/${identity.team}/${identity.channel}`).update({
      open: false,
      summary: summary
    })
  }

  storage.isOpenAside = function (message) {
    if (!message.team || !message.channel) {
      return Promise.reject('must specify teamid and userid')
    }
    return (
    db.ref(`asides/${message.team}/${message.channel}`).once('value')
      .then(snapshot => {
        console.log('isOpenAside snapshot.val(): ')
        console.log(snapshot.val())
        return snapshot.val().open
      })
    )
  }

  /**
   * @param {Object} s - firebase snapshot containing JSON object of users node 
   * @returns 
   */ 
  function returnIds(s) {

    let userData = s.val()
    let keys = Object.keys(userData)
    // search for @ mentions and capture only the name mentioned
    let regexp = /@(\w+)/gi
    let match = regexp.exec(text)
    let teamMembers = []
    let token = null

    // get userid's of mentioned teammembers within text
    while (match) {
      let i = 0
      for (i; i < keys.length; i++) {
        // match[1] contains name without @
        if (userData[keys[i]].user === match[1]) {
          teamMembers.push(keys[i])
          break
        }
      }
      // look for additional matches
      match = regexp.exec(text)
    }

    token = userData[ownerId].access_token

    return {
      teamMembers: teamMembers,
      token: token
    }
  }

  return storage
}

module.exports = Storage()
