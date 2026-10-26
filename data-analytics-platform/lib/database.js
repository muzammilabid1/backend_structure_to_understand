"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.createDatabaseConnection = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const postgres_client_1 = require("@lwp/postgres-client");
// Create database connection using the shared postgres client
const createDatabaseConnection = () => {
    return (0, postgres_client_1.createPostgresClient)({
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGAPPUSER,
        password: process.env.PGAPPPASSWORD,
        database: process.env.PGDATABASE,
        ssl: process.env.PGHOST !== 'localhost'
            ? {
                ca: fs_1.default.readFileSync(path_1.default.resolve(process.cwd(), '..', 'graphql-provider', 'lib', 'eu-west-2-bundle.pem')).toString(),
                rejectUnauthorized: false
            }
            : false,
    });
};
exports.createDatabaseConnection = createDatabaseConnection;
// Re-export the database instance
exports.db = (0, exports.createDatabaseConnection)();
