'use strict';

const _ = require('lodash');

const DEFAULT_OPTIONS = {
    fields: ['*']
};

const IS_BETWEEN = ['BETWEEN', 'NOT BETWEEN'];

function _prepareOptions (options) {
    return _.defaultsDeep({}, options || {}, DEFAULT_OPTIONS);
}

class Query {
    select (entity, options) {
        options = _prepareOptions(options);

        return `SELECT ${this.fields(options.fields)} FROM ${entity}${this.conditions(options)}`;
    }

    insert (entity, data, options) {
        const keys = [];
        const values = [];

        options = options || {};

        _.each(data, (value, key) => {
            keys.push(options.keyParser ? options.keyParser(key) : key);

            // Handle string value. Example: { name: 'myname' }
            if (_.isString(value)) {
                values.push(`'${value}'`);
            }

            // Handle any value type. Example: { id: 1 }
            else {
                values.push(`${value}`);
            }
        });

        return `INSERT INTO ${entity} (${keys.join(', ')}) VALUES (${values.join(', ')})`;
    }

    inserts (entity, list, options) {
        const keys = [];
        const lines = [];

        options = options || {};

        _.each(list, (data, index) => {
            const isFirst = !index;
            const values = [];

            _.each(data, (value, key) => {
                if (isFirst) keys.push(options.keyParser ? options.keyParser(key) : key);

                // Handle string value. Example: { name: 'myname' }
                if (_.isString(value)) {
                    values.push(`'${value}'`);
                }

                // Handle any value type. Example: { id: 1 }
                else {
                    values.push(`${value}`);
                }
            });
            lines.push(`(${values.join(', ')})`);
        });

        return `INSERT INTO ${entity} (${keys.join(', ')}) VALUES ${lines.join(', ')}`;
    }

    update (entity, data, options) {
        const keys = [];
        const values = [];

        options = options || {};

        _.each(data, (value, key) => {
            keys.push(options.keyParser ? options.keyParser(key) : key);

            // Handle string value. Example: { name: 'myname' }
            if (_.isString(value)) {
                values.push(`${key} = '${value}'`);
            }

            // Handle any value type. Example: { id: 1 }
            else {
                values.push(`${key} = ${value}`);
            }
        });

        return `UPDATE ${entity} SET ${values.join(', ')}${this.conditions(options)}`;
    }

    destroy (entity, options) {
        options = options || {};

        return `DELETE FROM ${entity}${this.conditions(options)}`;
    }

    truncate (entity) {
        return `TRUNCATE TABLE ${entity}`;
    }

    conditions (options) {
        const conditions = [];

        if (options.where) {
            conditions.push(`WHERE ${this.where(options.where)}`);
        }
        if (options.order) {
            conditions.push(`ORDER BY ${_.reduce(options.order, function (carry, field) { return carry + (_.isArray(field) ? field.join(' ') : field); }, '')}`);
        }
        if (options.group) {
            conditions.push(`GROUP BY ${options.group.join(', ')}`);
        }
        if (options.limit) {
            conditions.push(`LIMIT ${options.limit}`);
        }
        if (options.offset) {
            conditions.push(`OFFSET ${options.offset}`);
        }
        return conditions.length ? ` ${conditions.join(' ')}` : '';
    }

    where (key, value, operator = '=', connector = ' AND ') {
        const where = key;

        if (_.isObject(where)) {
            // Handle object conditions
            // Example:
            //   {
            //     id: 1,
            //     auth_token: { 'is not': null }
            //   }
            return _.reduce(_.keys(where), (memo, key) => {
                const condition = where[key];

                // Handle OR conditions
                // Example:
                //   {
                //     id: 1,
                //     OR: {
                //       created_at: {
                //         '>': '1980-01-01 00:00:00',
                //         '<': '2000-01-01 00:00:00'
                //       }
                //     }
                //   }
                if (_.isString(key) && key.toUpperCase() === 'OR') {
                    memo.push(`(${this.where(condition, null, operator, ' OR ')})`);
                }

                // Handle object sub conditions
                // Example:
                //   {
                //     created_at: {
                //       '>': '1980-01-01 00:00:00',
                //       '<': '2000-01-01 00:00:00'
                //     }
                //   }
                else if (_.isObject(condition) && !_.isArray(condition)) {
                    _.each(condition, (value, operator) => memo.push(this.where(key, value, operator)));
                }

                // Handle simple condition. Example: { id: 1 }
                else {
                    memo.push(this.where(key, condition));
                }
                return memo;
            }, []).join(connector);
        }

        // Handle array values condition. Example: { id: [1, 2, 3] }
        // NOTE: We use JSON.stringify for handle string values.
        else if (_.isArray(value)) {
            // Handle between condition
            if (IS_BETWEEN.includes(operator.toUpperCase())) {
                return `${key} ${operator} '${value[0]}' AND '${value[1]}'`;
            }
            return `${key} IN (${JSON.stringify(value).substring(1).slice(0, -1)})`;
        }

        // Handle string value condition. Example: { name: 'myname' }
        else if (_.isString(value)) {
            return `${key} ${operator} '${value}'`;
        }

        // Handle any value type condition. Example: { id: 1 }
        return `${key} ${operator} ${value}`;
    }

    fields (fields) {
        return _.isArray(fields) ? fields.join(',') : fields;
    }

    countField (name = 'total') {
        return `COUNT(*) AS ${name}`;
    }

    literal (value) {
        return new QueryLiteral(value);
    }
}

class QueryLiteral {
    constructor (value) {
        this.value = value;
    }

    toString () {
        return this.value;
    }
}

module.exports = new Query();
