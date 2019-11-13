'use strict';

const _ = require('lodash');
const P = require('bluebird');
const Log = require('./helpers/logger');
const Query = require('./query');
const async = require('async');

const OMIT_OPTIONS_MAPPING = ['fields', 'where', 'order', 'group', 'limit', 'offset'];
const DEFAULT_FIELD_ID = 'id';
const DEFAULT_OPTIONS = {
    fields: ['*'],
    populate: true,
    debug: process.env.LOG_DATABASE || false
};

function _prepareOptions (options) {
    return _.defaultsDeep({}, options || {}, DEFAULT_OPTIONS);
}

class Model {
    constructor (entity, options) {
        options = options || {};

        this.entity = entity;
        this.options = options;
        this.db = options.database;

        if (!this.db) {
            throw new Error('The Steplix database model needs the "database" option (Steplix.Database instance) to function properly.');
        }
    }

    find (options) {
        options = options || {};
        options.fields = options.fields || ['id'];

        // Build query
        const query = Query.select(this.entity, options);

        // Debug query if necesary
        if (options.debug) Log.query(query);

        // Select models
        return this.db.query(query).then(models => {
            // Prevent unnecesary map models
            if (options.unfilled) return models;

            // Map all finded models
            return new P((resolve, reject) => {
                async.map(models, (model, next) => {
                    return this.getById(model.id, _.omit(options, OMIT_OPTIONS_MAPPING)).then(model => next(null, model));
                }, (error, models) => {
                    if (error) return reject(error);
                    return resolve(models);
                });
            });
        });
    }

    getById (id, field, options) {
        // Prepare options
        if (_.isObject(field)) {
            options = field;
            field = DEFAULT_FIELD_ID;
        }
        if (!_.isString(field)) {
            field = DEFAULT_FIELD_ID;
        }

        // Prepare where condition
        options = _prepareOptions(options);
        options.where = options.where || [];
        options.where[field] = id;

        return this.getOne(options);
    }

    getOne (options) {
        // Build query
        const query = Query.select(this.entity, options = _prepareOptions(options));

        // Debug query if necesary
        if (options.debug) Log.query(query);

        // Select models
        return this.db.queryOne(query).then(model => {
            if (model && options.populate) return this.populate(model, _.omit(options || {}, OMIT_OPTIONS_MAPPING));

            return model;
        });
    }

    create (data, options) {
        // Build query
        const query = Query.insert(this.entity, data, options = _prepareOptions(options));

        // Debug query if necesary
        if (options.debug) Log.query(query);

        return this.db.query(query).then(result => {
            // Prevent unnecesary map results
            if (options.raw || !result || result.insertId === undefined) return result;

            return this.getById(result.insertId, options);
        });
    }

    update (data, id, field, options) {
        // Prepare options
        if (_.isObject(field)) {
            options = field;
            field = DEFAULT_FIELD_ID;
        }
        if (!_.isString(field)) {
            field = DEFAULT_FIELD_ID;
        }

        // Prepare where condition
        options = _prepareOptions(options);
        options.where = options.where || [];
        options.where[field] = id;

        // Build query
        const query = Query.update(this.entity, data, options);

        // Debug query if necesary
        if (options.debug) Log.query(query);

        return this.db.query(query).then(result => {
            // Prevent unnecesary map results
            if (options.raw || !result) return result;

            return this.find(options).then(models => {
                if (models && models.length && models.length === 1) {
                    return models[0];
                }
                return models;
            });
        });
    }

    destroy (id, field, options) {
        // Prepare options
        if (_.isObject(field)) {
            options = field;
            field = DEFAULT_FIELD_ID;
        }
        if (!_.isString(field)) {
            field = DEFAULT_FIELD_ID;
        }

        // Prepare where condition
        options = _prepareOptions(options);
        options.where = options.where || [];
        options.where[field] = id;

        // Build query
        const query = Query.destroy(this.entity, options);

        // Debug query if necesary
        if (options.debug) Log.query(query);

        return this.db.query(query);
    }

    count (options) {
        options = options || {};
        options.fields = [Query.countField()];
        options.populate = false;

        return this.getOne(options).then(model => model.total || 0);
    }

    exist (options) {
        return this.getOne(options).then(model => !!model);
    }

    transaction (callback) {
        return this.db.transaction(callback);
    }

    populate (model, options) {
        return P.resolve(model);
    }

    static literal (value) {
        return Query.literal(value);
    }
}

module.exports = Model;
