'use strict'

// import {} from 'utils'

const Firebase = require('firebase')

function Storage () {
  let url = 'https://project-3576296690235739912.firebaseio.com/'
  let accountInfo = './dbaccount.json'

  // Initialize the app with a service account, granting admin privileges
  // https://firebase.google.com/docs/database/server/start
  Firebase.initializeApp({
    databaseURL: url,
    serviceAccount: accountInfo
  })

  let db = Firebase.database()

  // consider switching to const if all methods
  // added to obj immediately
  let storage = {
    teams: {
      get: function (team_id, cb) {

        db.ref(`teams/${team_id}`).once('value')
          .then(teamSnapshot => cb(null, teamSnapshot.val()))
          .catch(err => cb(err))
      },
      save: function (team) {
        if (!team.id) {
          return Promise.reject('No ID specified')
        } else {
          return db.ref('teams/' + team.id).update(team)
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
        if (identity.team_id && identity.user_id) {
          team = identity.team_id
          user = identity.user_id
        } else if (identity.team && identity.user) {
          team = identity.team
          user = identity.user
        } else if (identity.team_id && identity.id) {
          team = identity.team_id
          user = identity.id
        } else {
          return Promise.reject('object must contain team id and user id properties')
        }
        // return promise with dataSnapshot
        return db.ref(`users/${team}/${user}`).once('value').then(userSnapshot => userSnapshot.val())
      },
      save: function (user) {
        if (!user.id) {
          return Promise.reject('No ID specified')
        }
        // create user reference ordered by team_id
        // create username reference ordered by team_id
        return db.ref(`users/${user.team_id}/${user.id}`).update(user)
        
      },
      all: function(identity) {
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
      save: function (asideData, teamId, asideId) {
        return db.ref(`asides/${teamId}/${asideId}`).update(asideData)
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
