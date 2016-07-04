'use strict'

// heroku Local reads configuration variables from a .env file
// the following line is for debugging on VS CODE
if (!process.env.heroku) require('dotenv').load()

const config = {
  ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 3000,
  SLASH_COMMAND_TOKEN: process.env.SLASH_COMMAND_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET
}

module.exports = config
