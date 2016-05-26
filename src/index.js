
'use strict'

const slack = require('slack')
const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config')

let app = express()

// parse JSON
app.use(bodyParser.json())

// parse URLencoded bodies
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/commands/aside', (req, res) => {
  let payload = req.body

  console.log(config('ASIDE_COMMAND_TOKEN'))

  // ensure there's a payload and payload has an approved payload
  if (!payload || payload.token !== config('ASIDE_COMMAND_TOKEN')) {
    let err = '✋  Star—what? An invalid slash token was provided\n' +
              '   Is your Slack slash token correctly configured?'
    console.log(err)
    res.status(401).end(err)
    return
  }

  let msg = 'suh dude'
  let params = {
    token: config('SLACK_TOKEN'),
    name: 'dhruvs-channel'
  }

  slack.channels.create(params, (err, data) => {
    if (err) {
      console.log(err)
    }
  })

  // set content headers
  res.set('content-type', 'application/json')

  // set status code of 200 OK and send content as JSON
  res.status(200).json(msg)
})

app.listen(3000, (err) => {
  if (err) throw err

  console.log(`\n🚀  Starbot LIVES on PORT 3000 🚀`)
})
