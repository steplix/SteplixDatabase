'use strict';

const debug = require('debug')('steplix:database');

class Logger {
    query (sql) {
        this.print(`${'SQL Query: '.yellow} ${sql}`);
    }

    print (str) {
        debug(str);
    }
}

module.exports = new Logger();
