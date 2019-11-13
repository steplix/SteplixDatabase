'use strict';

const chai = require('chai');

global.request = require('supertest');
global.chai = chai;

global.assert = chai.assert;
global.expect = chai.expect;
global.should = chai.should();
