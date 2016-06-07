# SlackBot.js

Controller for managing [multiple] slack bot instances.

Extends `CoreBot`.

Module returns extended `CoreBot` obj.

Uses `CoreBot.defineBot(require(__dirname + '/Slackbot_worker.js'))` to define a bot class.


---
## `SlackBot` Methods


### `.configureSlackApp(config[, cb])`
Returns **`SlackBot`** obj

| Argument | Description |
| -------- | ----------- |
| Config   | configuration object containing `clientId`, `clientSecret`, `redirectUri` and `scopes` |
| cb  *(optional)*     | once slack app configured, cb gets executed with `null` and `bot` as parameters |

**description**: Slack has [_many, many_ oauth scopes](https://api.slack.com/docs/oauth-scopes)
that can be combined in different ways. There are also [_special oauth scopes_
used when requesting Slack Button integrations](https://api.slack.com/docs/slack-button).
It is important to understand which scopes your application will need to function,
as without the proper permission, your API calls will fail.

```javascript
var Botkit = require('botkit')
var controller = Botkit.slackbot();

controller.configureSlackApp({
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret,
  redirectUri: 'http://localhost:3002',
  scopes: ['incoming-webhook','team:read','users:read','channels:read','im:read','im:write','groups:read','emoji:read','chat:write:bot']
});
```


### `.setupWebserver(port[, landingPageDir, cb])`
Returns **`SlackBot`** obj

| Argument | Description |
| -------- | ----------- |
| port     |  port for webserver |
| landingPageDir| address of your public directory |
| callback *(optional)* | node-style callback function passed `null` and the created `webserver`|


**description**: Instantiate an [Express webserver](http://expressjs.com/en/index.html) for
use with `createWebhookEndpoints()`

Globally available through `SlackBot.webserver`

If you need more than a simple webserver to receive webhooks,
you should by all means create your own Express webserver!

The callback function receives the Express object as a parameter,
which may be used to add further web server routes.

```javascript
controller.setupWebserver(process.env.port, (err,webserver) => { ... })
```




### `.createHomepageEndpoint(webserver)`
Returns **`SlackBot`** obj

| Argument | Description |
| -------- | ----------- |
| webserver| express server instance |

**description**: set up a web route that is a landing page

```javascript
var Botkit = require('botkit')
var controller = Botkit.slackbot()

controller.setupWebserver(process.env.port,function(err,webserver) {

  controller.createHomepageEndpoint(webserver)
})
```


### `.createWebhookEndpoints(webserver[, authenticationTokens])`
Returns **`SlackBot`** obj

| Argument | Description |
| -------- | ----------- |
| webserver| express server instance |
| authenticationTokens *(optional)* | if passed, Botkit will ensure only registered slash commands are processed |

**description**: This function configures the route `http://_your_server_/slack/receive`
to receive webhooks from Slack.

This url should be used when configuring Slack.

When a slash command is received from Slack, Botkit fires the `slash_command` event.

When an outgoing webhook is recieved from Slack, Botkit fires the `outgoing_webhook` event.



### `.createOauthEndpoints(webserver[, callback])`
Returns **`SlackBot`** obj

| Argument | Description |
| -------- | ----------- |
| webserver| express server instance |
| authenticationTokens *(optional)* | if passed, Botkit will ensure only registered slash commands are processed |

**description**: Call this function to create two web urls that handle login via Slack.
Once called, the resulting webserver will have two new routes: `http://_your_server_/login` and `http://_your_server_/oauth`. The second url will be used when configuring
the "Redirect URI" field of your application on Slack's API site.


```javascript
var Botkit = require('botkit');
var controller = Botkit.slackbot();

controller.configureSlackApp({
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret,
  redirectUri: 'http://localhost:3002',
  scopes: ['incoming-webhook','team:read','users:read','channels:read','im:read','im:write','groups:read','emoji:read','chat:write:bot']
});

controller.setupWebserver(process.env.port,function(err,webserver) {

  // set up web endpoints for oauth, receiving webhooks, etc.
  controller
    .createHomepageEndpoint(controller.webserver)
    .createOauthEndpoints(controller.webserver,function(err,req,res) { ... })
    .createWebhookEndpoints(controller.webserver);

});

```

---

## Utilities:


### `.saveTeam(team, cb)`

**description**: utility method for `.createOauthEndpoints`


### `.getAuthorizeURL(team_id)`

**description**: get a team url to redirect the user through oauth process

utility method for `.createOauthEndpoints`


### `.findteambyid(id, cb)`

**description**: utility method for `.createOauthEndpoints` and `.createWebhookEndpoints`

### `function secureWebhookEndpoints()`

**description**: adds the webhook authentication middleware module to the webserver

utility for `.createWebhookEndpoints`


### `.handleSlackEvents()`

**description**: utility method to set up the RTM message handlers
