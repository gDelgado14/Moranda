
'use strict'

const dotenv = require('dotenv')

if (!process.env.NODE_ENV) dotenv.load()

const config = {
  ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 3000,
  PROXY_URI: process.env.PROXY_URI,
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  ASIDE_COMMAND_TOKEN: process.env.ASIDE_COMMAND_TOKEN,
  SLACK_TOKEN: process.env.SLACK_TOKEN,
  GG_BOT_TOKEN: process.env.GG_BOT_TOKEN,
  ICON_EMOJI: ':stars:'
}

module.exports = (key) => {
  if (!key) return config

  return config[key]
}
