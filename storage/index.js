'use strict'

const Firebase = require('firebase')

function Storage(url, accountInfo) {

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
      get: function(id) {
        // return promise with dataSnapshot
        return db.ref('teams/' + id).once('value')
      },
      save: function(team) {
        if (!team.id) {
          return Promise.reject('No ID specified')
        } else {
          return db.ref('teams/' + team.id).update(team)
        }
      },
      all: 3
    },
    users: {
      get: function(id) {
        if (!id) {
          return Promise.reject('No ID specified')
        } else {
          // return promise with dataSnapshot
          return db.ref('users/' + id).once('value')
        }
      },
      save: function(user) {
        if (!user.id) {
          return Promise.reject('No ID specified')
        } else {
          // create user reference ordered by team_id
          // create username reference ordered by team_id
          return db.ref(`users/${user.team_id}/${user.id}`).update(user)
        }
      },
      all: 3
    },
    channels: {
      get: 1,
      save: 2,
      all: 3
    }
  }

  /**
   * Utility function to receive JSON payload data from startRTM
   * and update firebase
   * @param  obj - teamData obj literal containing team data - see res.json for payload example
   * @return Promise          promise that resolves once all operations completed
   */
  storage.updateDB = function(teamData) {
    // we only care about non-deleted users
    // get data for active team members
    // set 'scopes' to false so that we know
    // they haven't authenticated yet
    // get their name so that we may cross reference their name with their uid

    let activeUsers = {}
    let userImages = {}
    teamData.users.forEach(user => {
      if (!user.deleted) {
        activeUsers[user.id] = {
          scopes: false,
          user: user.name
        }
        userImages[user.id] = user.profile.image_24
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
              console.log(childSnapshot.key);
              console.log(childSnapshot.val())

              activeUsers[childSnapshot.key] = childSnapshot.val()
            })
          }

          console.log('>>>>> activeUsers')
          console.log(activeUsers)

          Promise.all([
            db.ref(`users/${teamData.team.id}`).update(activeUsers),
            db.ref(`images/${teamData.team.id}`).update(userImages)
          ])

        })
    )

  }


  /**
   * get id of username
   * @param  {String}   teamId  Slack id of team
   * @param  {String}   text    message text to parse for username mentions
   * @param  {String}   owner   the user who called the command
   * @return {Promise}          promise with object containing array of user ids and user access token
   *
   * TODO: there should be a key-value map / hash table storing name - id pairs
   */
  storage.getId = function(teamId, ownerId, text) {
    console.log('>>>>> Inside storage.getId');
    // search for @ mentions and capture only the name mentioned
    let regexp = /@(\w+)/gi
    let match = regexp.exec(text)
    let teamMembers = []
    let token = null

    return (
      db.ref(`users/${teamId}`).once('value')
        .then(snapshot => {

          let userData = snapshot.val()
          let keys = Object.keys(userData)

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
        })
    )

  }

  /**
   * creates a reference in firebase for a newly-created aside
   * @param  {obj} asideData     object literal containing true and group purpose
   * @return {Promise}           [description]
   */
  storage.createAside = function(asideData, asideId) {
    return db.ref(`asides/${asideId}`).update(asideData)
  }

  /**
   * set an aside as closed in Firebase
   * @param  {Number}   asideId    the id of the aside (group id)
   * @return {Promise}
   */
  storage.closeAside = function(asideId) {
    return db.ref(`asides/${asideId}`).child('open').set(false)
  }

  return storage

}

module.exports = Storage
