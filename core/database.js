'use strict';

const _ = require('lodash');
const P = require('bluebird');
const mysql = require('mysql');

function _connect (options) {
    return mysql.createConnection(options);
}

class Database {
    constructor (options) {
        this.options = options;
        this.connection = _connect(this.options);
    }

    query (query, args = []) {
        return new P((resolve, reject) => {
            this.connection.query(query, args, (error, result) => {
                if (error) return reject(error);
                return resolve(result);
            });
        });
    }

    queryOne (query, args = [], fn) {
        return this.query(query, args).then(results => {
            let result;

            if (results && results.length) {
                result = results[0];
            }
            return P.resolve(result);
        });
    }

    transaction (callback) {
        return new P((resolve, reject) => {
            this.connection.beginTransaction(error => {
                if (error) return reject(error);

                return P.resolve()
                    .then(() => callback())
                    .then(() => {
                        return new P((resolve, reject) => {
                            this.connection.commit(error => {
                                if (error) return reject(error);
                                return resolve();
                            });
                        });
                    })
                    .catch(error => {
                        return this.connection.rollback(() => {
                            throw error;
                        });
                    });
            });
        });
    }

    connect () {
        return new P((resolve, reject) => {
            if (!this.connection) {
                this.connection = _connect(this.options);
            }
            return P.return(this.connection);
        });
    }

    isAlive () {
        return this.query(`SELECT TABLE_NAME AS name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${this.options.database}'`).then(tables => {
            return !!_.find(tables, 'name');
        });
    }

    ping () {
        return new P((resolve, reject) => {
            this.connection.ping(error => {
                if (error) return reject(error);
                return resolve(true);
            });
        });
    }

    end () {
        return new P((resolve, reject) => {
            this.connection.end(error => {
                if (error) return reject(error);

                this.connection = null;
                return resolve();
            });
        });
    }
}

module.exports = Database;
