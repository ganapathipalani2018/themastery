"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const environment_1 = require("./config/environment");
const pool = new pg_1.Pool(environment_1.dbConfig);
exports.default = pool;
