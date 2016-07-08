## asides.js

#### Better way to get access to storage?

example:

```javascript

function getUsers (bot, msg) {
  let db = bot.botkit.storage
  return db.users.all(msg)
}

```

every bot has access to the core botkit module, which itself has access to my storage module

Would it be bad practice to require my storage module again within asides.js?

Don't want to init app again ... 

---

#### Better function design

prevent things such as the following:


```javascript

saveNewAside(bot, aside, msg.team_id, response.group.id)

```


---

#### How to think about creating new 

Should the asides module be written as a constructor? 

There's a lot of async work, and communication between slack and firebase servers


--- 
#### Using destructuring for cleaner module imports

Is it fine to use the following code in vanilla node:

```javascript
const {thing1, thing2} = require('moduleOfThings')
```

---

#### How to think about having a consistent storage.js API

some functions within storage.js take in data in one way while others take in date some other way. How to think about this? 


---

#### Thinking about extending botkit

Is the way I extended botkit good?

How can I improve upon it?

How to fix awkward naming situations. i.e.: 

```javascript
// moranda.js
morandaBotkit.addNewScopes = function addNewScopes (slackMessageObj, bot) { ... }

// createAside.js
bot.botkit.addNewScopes(msg, bot)
```


---

#### Handling early returns within a promise

```javascript
  if (!userObj[msg.user_id].scopes) {
    // should I be using return Promise.reject() ??? 
    bot.botkit.addNewScopes(msg, bot)
    return
  }

...

.then(response => { // expecting a JSON response but receives nothing because of early return
  ...  
})
```


*throw new error* .. i.e. scopes_missing and have the catch statement handle it