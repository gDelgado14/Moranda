# CoreBot.js

Constructor for all bots in Slack, Facebook, and Twilio

Module returns `CoreBot` obj.




---
## `CoreBot` Methods & Objects

### `.utterances` obj

| Pattern Name | Description
|--- |---
| utterances.yes | Matches phrases like yes, yeah, yup, ok and sure.
| utterances.no | Matches phrases like no, nah, nope


### `.middleware` obj

```javascript
// define some middleware points where custom functions
// can plug into key points of botkit's process
botkit.middleware = {
  send: ware(),
  receive: ware()
};
```

On **[extending Botkit's functionality using middleware](https://github.com/howdyai/botkit/blob/master/readme.md#middleware)**.



## Responding to events

Once connected to a messaging platform, bots receive a constant stream of events - everything from the normal messages you would expect to typing notifications and presence change events. The set of events your bot will receive will depend on what messaging platform it is connected to.

All platforms will receive the `message_received` event. This event is the first event fired for every message of any type received - before any platform specific events are fired.

```javascript
controller.on('message_received', function(bot, message) {

    // carefully examine and
    // handle the message here!
    // Note: Platforms such as Slack send many kinds of messages, not all of which contain a text field!
});
```

Due to the multi-channel, multi-user nature of Slack, Botkit does additional filtering on the messages (after firing message_recieved), and will fire more specific events based on the type of message - for example, `direct_message` events indicate a message has been sent directly to the bot, while `direct_mention` indicates that the bot has been mentioned in a multi-user channel.
[List of Slack-specific Events](readme-slack.md#slack-specific-events)



### `.on(events, cb)`
Returns **`CoreBot`** obj

| Argument     | Description |
| ------------ | ----------- |
| events (str) | a string containg one or more comma separated event names |
| cb           | a callback function that gets called by `.trigger`

**Description**: Listen to events. Register an event handler and saves it to `CoreBot.events`


<br />


### `.hears(patterns, events[, middleware], cb)`
Returns **`CoreBot`** obj

| Argument | Description
|--- |---
| patterns | An _array_ or a _comma separated string_ containing a list of regular expressions to match
| events  | An _array_ or a _comma separated string_ of the message events in which to look for the patterns
| middleware *optional* | function to redefine how patterns are matched. see [Botkit Middleware](#middleware)
| callback | callback function that receives a message object. Invoked by `.trigger`


**Description**: Wrapper on top of `.on` method

Configures event handlers based on matching specific keywords or phrases in the message text.
The hears function works just like the other event handlers, but takes a third parameter which
specifies the keywords to match.

Registers an event handler using `.on` for each event passed.

Note that events can have multiple handlers attached to them. Each callback is called in the order in which its corresponding event handler was registered.

uses `.on` method to pass `bot` and `message` to callback function.

callbacks are called using the `.trigger` method



```javascript
controller.hears(['keyword','^pattern$'],['message_received'],function(bot,message) {

  // do something to respond to message
  bot.reply(message,'You used a keyword!');

});
```

When using the built in regular expression matching, the results of the expression will be stored in the `message.match` field and will match the expected output of normal Javascript `string.match(/pattern/i)`. For example:

```javascript
controller.hears('open the (.*) doors',['message_received'],function(bot,message) {
  var doorType = message.match[1]; //match[1] is the (.*) group. match[0] is the entire group (open the (.*) doors).
  if (doorType === 'pod bay') {
    return bot.reply(message, 'I\'m sorry, Dave. I\'m afraid I can\'t do that.');
  }
  return bot.reply(message, 'Okay');
});
```

### `.trigger(event, data)`
returns **`undefined`**

| Argument     | Description                                   |
| ------------ | --------------------------------------------- |
| event (str)  | a string containing the event to be triggered |
| data         | an array containing 0 or more pieces of data  |

**Description**: Trigger all callbacks (registered events) associated with `event`




### `.spawn(config, cb)`
returns a **`slackbot_worker`** instance

| Argument     | Description                                            |
| ------------ | ---------------------------------------------          |
| config       | configuration options for a `slackbot_worker` instance |
| cb    *optional*       | function that gets passed the newly-created `slackbot_worker` instance as a param           |  

**Description**: Spawn an instance of your bot and connect it to Slack. This function takes a configuration object which should contain at least one method of talking to the Slack API.

mutates the worker (adds a `.say` method using [ware](https://www.npmjs.com/package/ware)) so that we can call middleware

Spawn `config` object accepts these properties:

| Name | Value | Description
|--- |--- |---
| token | String | Slack bot token
| retry | Positive integer or `Infinity` | Maximum number of reconnect attempts after failed connection to Slack's real time messaging API. Retry is disabled by default








---

<br />


## Debugging

### `.debug` & `.log`



---


<br />


## Storing Information

Botkit has a built in storage system used to keep data on behalf of users and teams between sessions. Botkit uses this system automatically when storing information for Slack Button applications (see below).

By default, Botkit will use [json-file-store](https://github.com/flosse/json-file-store) to keep data in JSON files in the filesystem of the computer where the bot is executed. (Note this will not work on Heroku or other hosting systems that do not let node applications write to the file system.) Initialize this system when you create the bot:
```javascript
var controller = Botkit.slackbot({
  json_file_store: 'path_to_json_database'
});
```

This system supports freeform storage on a team-by-team, user-by-user, and channel-by-channel basis. Basically ```controller.storage``` is a key value store. All access to this system is through the following nine functions. Example usage:

```javascript
controller.storage.users.save({id: message.user, foo:'bar'}, function(err) { ... });
controller.storage.users.get(id, function(err, user_data) {...});
controller.storage.users.all(function(err, all_user_data) {...});

controller.storage.channels.save({id: message.channel, foo:'bar'}, function(err) { ... });
controller.storage.channels.get(id, function(err, channel_data) {...});
controller.storage.channels.all(function(err, all_channel_data) {...});

controller.storage.teams.save({id: message.team, foo:'bar'}, function(err) { ... });
controller.storage.teams.get(id, function(err, team_data) {...});
controller.storage.teams.all(function(err, all_team_data) {...});
```

Note that save must be passed an object with an id. It is recommended to use the team/user/channel id for this purpose.

```
[user/channel/team]_data
```

will always be an object while

```
all_[user/channel/team]_data
```

 will always be a list of objects.


---

<br />

## Utilities:

### `Conversation(task, message)` Constructor

**Description**: Conversation object definition used by `Task` class


### `Task(bot, message, botkit)` Constructor

**Description**: Task object used by `CoreBot.startTask`


### `.hears_regexp(tests, message)`


| Argument | Description |
| -------- | ----------- |
| tests | array of regex patterns |
| message | string to test |


**Description**: default regex testing function for hearing. Test `message` against all provided `tests`


### `.changeEars(new_test)`

Returns **`undefined`**

**Description**: change the default matching function



### `.startConversation(bot, message, cb)`
returns **`undefined`**

| Argument     | Description                                   |
| ------------ | --------------------------------------------- |
| bot          | an instance of `slackbot_worker`|
| message      | incoming message to which the conversation is in response  |
| cb           | a callback function in the form of `function(err,conversation) { ... }` |

**Description**: This function is used by `worker` instances defined by `slackbot_worker`.

creates conversation in response to an incoming message.
The conversation will occur *in the same channel* in which the incoming message was received.

Only the user who sent the original incoming message will be able to respond to messages in the conversation.

calls on `CoreBot.startTask`.

Fires a `conversationStarted` event


### `.defineBot(unit)`
returns **`undefined`**

| Argument     | Description                                   |
| ------------ | --------------------------------------------- |
| unit         | an instance of `slackbot_worker`              |


**Description**: Used by `SlackBot.js` to define what a bot is.

Replaces the default `worker` object defined within `CoreBot.worker`



### `.startTicking()`
returns **`undefined`**

**Description**: calls on `CoreBot.tick()` if no `tickInterval` has been set already.


### `.shutdown()`
returns **`undefined`**

**Description**: if a tickInterval has been set, `CoreBot.tickInterval` is cleared


### `.startTask(bot, message, cb)`
returns **`undefined`**

| Argument     | Description                                   |
| ------------ | --------------------------------------------- |
| bot          |              |
| message      |              |
| cb           |              |


**Description**: starts a task. Utility for `CoreBot.startConversation` and 'slackbot_worker.startPrivateConversation'

If a callback is passed, passes a newly created `Task` object and `convo` object to the callback as params


### `.receiveMessage(bot, message)`
returns **`undefined`**

| Argument     | Description                                   |
| ------------ | --------------------------------------------- |
| bot          | an instance of `slackbot_worker`         |
| message      | a Slack object literal representing msg data             |


**Description**: Triggers `handleSlackEvents`. utility to figure out what type of message was sent. Used in `SlackBot.createWebhookEndpoints` to trigger either `outgoing_webhook` or `slash_command` events


### `.tick()`
returns **`undefined`**

**Description**: utility for `Conversation` objects
