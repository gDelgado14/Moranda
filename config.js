'use strict'

// heroku Local reads configuration variables from a .env file

const config = {
  ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 3000,
  PROXY_URI: process.env.PROXY_URI,
  WEBHOOK_URL: process.env.WEBHOOK_URL,
  SLASH_COMMAND_TOKEN: process.env.ASIDE_COMMAND_TOKEN,
  SLACK_TOKEN: process.env.SLACK_TOKEN,
  GG_BOT_TOKEN: process.env.GG_BOT_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  CLIENT_SECRET: process.env.CLIENT_SECRET
}

module.exports = (key) => {
  if (!key) return config

  return config[key]
}
