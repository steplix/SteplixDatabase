# Steplix Database

Steplix Database is a promise-based Node.js ORM for MySQL.

## Index

* [Download & Install][install].
* [How is it used?][how_is_it_used].
* [Tests][tests].

## Download & Install

### NPM
```bash
$ npm install steplix-database
```

### Source code
```bash
$ git clone https://github.com/comodinx/SteplixDatabase.git
$ cd SteplixDatabase
$ npm install
```

### How is it used?

### Create new **Database** instance.

```js
const { Database } = require('steplix-database');
// For more information of Database connections. See: https://www.npmjs.com/package/mysql#connection-options
const db = new Database({
  host: 'localhost',
  user: 'myuser',
  password: 'mypass',
  database: 'mydbname'
});
```

#### Simple query Execution
```js
db.query(/* YOUR SQL QUERY */).then(/* array */ result => /*...*/).catch(/*...*/);
```

#### Query for one result
```js
db.queryOne(/* YOUR SQL QUERY */).then(/* object|undefined */ result => /*...*/).catch(/*...*/);
```

#### Handle transaction

This function is automatically responsible for `commit` or `rollback` (as appropriate).
The `commit` will be performed once the `callback` function received as an argument is finished. In case the `callback` function returns a promise, the commit will be made at the end of this promise.
In case of any failure, a `rollback` will be performed automatically (even if the `commit` fails).

```js
db.transaction(/* callback */ () => {
  return db
    .query(/* FIRST SQL QUERY */)
    .then(/* array */ result => {
      return db.query(/* SECOND SQL QUERY */).then(/*...*/);
    });
})
.catch(/*...*/);
```

#### Check if database connection found
```js
db.isAlive().then(/* boolean */ alive => /*...*/).catch(/*...*/);

// OR

db.ping().then(/* boolean */ alive => /*...*/).catch(/*...*/);
```

#### End connection
```js
db.end().then(/*...*/).catch(/*...*/);
```

#### Reconnect
```js
db.connect().then(/*...*/).catch(/*...*/);
```

### Create new **Model** instance.

```js
const { Model, Database } = require('steplix-database');
const db = new Database({/* ... */});
const model = new Model('users', {
  database: db
});
```

#### Find models
```js
const options = {
  where: {
    id: 1,
    deleted_at: {
      is: null
    }
  },
  order: [['id', 'DESC'], ['created_at', 'ASC']],
  offset: 10,
  limit: 10
};

model.find(options).then(/* array */ models => /*...*/).catch(/*...*/);

// ------------------------------------------------------------------------------------

const options = {
  fields: ['id', 'active'],
  where: {
    OR: {
      deleted_at: {
        is: null,
        '>': '2019-06-01 00:00:00'
      }
    }
  }
};

model.find(options).then(/* array */ models => /*...*/).catch(/*...*/);
```

#### Get by ID
```js
model.getById(1).then(/* object|undefined */ model => /*...*/).catch(/*...*/);
```

#### Get one
```js
const options = {
  where: {
    id: [1, 2, 3]
  }
};

model.getOne(options).then(/* object|undefined */ model => /*...*/).catch(/*...*/);
```

#### Exist
```js
const options = {
  where: {
    id: 1
  }
};

model.exist(options).then(/* boolean */ exist => /*...*/).catch(/*...*/);
```

#### Count
```js
const options = {
  where: {
    active: 1
  }
};

model.count(options).then(/* number */ total => /*...*/).catch(/*...*/);
```

#### Insert new model
```js
const data = {
  id: null,
  active: 1,
  created_at: Model.literal('NOW()'),
  updated_at: null
};

model.create(data).then(/* object */ model => /*...*/).catch(/*...*/);
```

#### Update existing model
```js
const data = {
  active: 0,
  updated_at: Model.literal('NOW()')
};

model.update(data, /* ID value */ 1).then(/* object */ model => /*...*/).catch(/*...*/);

// Or update more rows

const data = {
  active: 1
};

model.update(data, /* All disactive rows */ 0, /* Reference field name */ 'active').then(/* array */ models => /*...*/).catch(/*...*/);
```

#### Delete model
```js
model.destroy(/* ID value */ 1).then(/* object */ model => /*...*/).catch(/*...*/);
```

#### Handle transaction

This function is automatically responsible for `commit` or `rollback` (as appropriate).
The `commit` will be performed once the `callback` function received as an argument is finished. In case the `callback` function returns a promise, the commit will be made at the end of this promise.
In case of any failure, a `rollback` will be performed automatically (even if the `commit` fails).

```js
model.transaction(/* callback */ () => {
  const options = {
    where: {
      username: 'myusername'
    }
  };

  return model
    .exist(options)
    .then(exist => {
      if (exist) return model.update(data, 'myusername', 'username');
      return model.create(data);
    })
    .then(result => model.getById(result.id));
})
.catch(/*...*/);
```

## Tests

In order to see more concrete examples, **I INVITE YOU TO LOOK AT THE TESTS :)**

### Run the unit tests
```bash
npm install
npm test
```

<!-- deep links -->
[install]: #download--install
[how_is_it_used]: #how-is-it-used
[tests]: #tests
