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
        if (this.options.usePool) {
            this.poolOptions = options;
            // Default connection limit to 100
            if (!this.poolOptions.connectionLimit) {
                this.poolOptions.connectionLimit = 100;
                this.poolOptions.multipleStatements = true;
            }
            this.pool = mysql.createPool(this.poolOptions);
        }
    }

    getConnection () {
        if (this.options.usePool) {
            return new P((resolve, reject) => {
                this.pool.getConnection((error, connection) => {
                    if (error) return reject(error);
                    return resolve(connection);
                });
            });
        }
        return this.connection;
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

    async transaction (callback) {
        // Transactions must be executed in new conections to avoid undesired COMMIT or ROLLBACK from another TRANSACTION
        // Also queries inside the callback must be executed over the returned connection
        let newconnection;
        if (this.options.usePool) {
            newconnection = await this.getConnection();
        }
        else {
            newconnection = this.connection;
        }
        return new P((resolve, reject) => {
            return newconnection.beginTransaction(error => {
                if (error) return reject(error);
                return P.resolve()
                    .then(() => callback(newconnection))
                    .then(result => {
                        return new P((resolve, reject) => {
                            newconnection.commit(error => {
                                if (error) return reject(error);
                                return resolve(result);
                            });
                        });
                    })
                    .then(resolve)
                    .catch(error => newconnection.rollback(() => reject(error)));
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
            const handle = connection => {
                return connection.ping(error => {
                    if (error) return reject(error);
                    return resolve(true);
                });
            };

            if (this.options.usePool) {
                return this.connection.getConnection((error, connection) => {
                    if (error) return reject(error);
                    return handle(connection);
                });
            }
            return handle(this.connection);
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
