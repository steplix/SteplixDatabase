'use strict';

const { Model, Database } = require('../core/steplix');

const DBConfig = {
    host: 'localhost',
    user: 'root',
    password: 'WwFFTRDJ7s2RgPWx',
    database: 'steplix'
};

let context;
let database;
let model;

before(() => {
    context = {};
});

after(() => {
    context = null;
});

beforeEach(() => {
    database = new Database(DBConfig);
    model = new Model('users', { database });
});

afterEach(done => {
    model = null;
    database.end().then(done);
});

describe('Model', () => {
    describe('Instance', () => {
        describe('#find', () => {
            it('should return all user models', done => {
                model
                    .find()
                    .then(result => {
                        expect(result).to.be.a('array').to.not.be.empty; // eslint-disable-line no-unused-expressions

                        done();
                    })
                    .catch(done);
            });

            it('should return user model by id', done => {
                model
                    .getById(1)
                    .then(result => {
                        expect(result).to.be.a('object').to.have.property('id');

                        done();
                    })
                    .catch(done);
            });

            it('should create user model', done => {
                const data = {
                    id: null,
                    active: 1,
                    created_at: Model.literal('NOW()'),
                    updated_at: null
                };

                model
                    .create(data)
                    .then(result => {
                        expect(result).to.be.a('object').to.have.property('id');

                        context.id = result.id;
                        done();
                    })
                    .catch(done);
            });

            it('should update user model', done => {
                const data = {
                    active: 0,
                    updated_at: Model.literal('NOW()')
                };

                model
                    .update(data, context.id)
                    .then(result => {
                        expect(result).to.be.a('object').to.have.property('id').equal(context.id);

                        done();
                    })
                    .catch(done);
            });

            it('should delete user model', done => {
                model.destroy(context.id).then(() => done()).catch(done);
            });

            it('should return count active user models', done => {
                const options = {
                    where: {
                        active: 1
                    }
                };

                model
                    .count(options)
                    .then(result => {
                        expect(result).to.be.a('number');

                        done();
                    })
                    .catch(done);
            });

            it('should check existance of user models', done => {
                const options = {
                    where: {
                        id: 99999999999
                    }
                };

                model
                    .exist(options)
                    .then(result => {
                        expect(result).to.be.a('boolean').equal(false);

                        done();
                    })
                    .catch(done);
            });

            it('should create, update and delete user model on transaction mode', done => {
                const dataInsert = {
                    id: null,
                    active: 1,
                    created_at: Model.literal('NOW()'),
                    updated_at: null
                };

                model
                    .transaction(() => {
                        return model.create(dataInsert).then(resultInsert => {
                            expect(resultInsert).to.be.a('object').to.have.property('id');

                            const dataUpdate = {
                                active: 0,
                                updated_at: Model.literal('NOW()')
                            };

                            return model.update(dataUpdate, resultInsert.id).then(resultUpdate => {
                                expect(resultUpdate).to.be.a('object').to.have.property('id').equal(resultUpdate.id);

                                return model.destroy(resultUpdate.id).then(() => done());
                            });
                        });
                    })
                    .catch(done);
            });
        });
    });
});
