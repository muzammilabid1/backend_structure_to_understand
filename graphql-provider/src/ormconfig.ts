import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

dotenv.config();

/** defaultConfig is the default database connection, intended for use throughout the application. */
export const defaultConfig: PostgresConnectionOptions = {
    type: 'postgres',
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT, 10),
    username: process.env.PGAPPUSER,
    password: process.env.PGAPPPASSWORD,
    database: process.env.PGDATABASE,
    entities: [__dirname + '/**/entities/**/!(*.spec){.ts,.js}'],

    extra: {
        statement_timeout: process.env.ALLOW_SCHEDULING === 'true' || process.env.REPL === 'true' ? 0 : 30000 // 30s for web, 0 for notifs
    },

    ssl:
        process.env.NODE_ENV === 'production'
            ? {
                  ca: fs
                      .readFileSync(
                          path.resolve(__dirname, '..', 'lib', 'eu-west-2-bundle.pem').replace(path.sep + 'dist' + path.sep, path.sep)
                      )
                      .toString()
              }
            : false,

    synchronize: false,

    // Run migrations automatically,
    // you can disable this if you prefer running migration manually.
    migrationsRun: false,
    logging: ['error'],
    logger: 'file',

    // allow both start:prod and start:dev to use migrations
    // __dirname is either dist or src folder, meaning either
    // the compiled js in prod or the ts in dev
    migrations: [__dirname + '/migrations/**/*{.ts,.js}'],

    // Runs each migration in its own transaction instead of a single global one.
    migrationsTransactionMode: 'each',
    cli: {
        migrationsDir: 'src/migrations'
    }
};

let configs = [defaultConfig];

/** superuserConfig is intended for use only in the CLI, never in the app itself. */
if (process.env.PGSUPERUSER) {
    console.log('WARNING: superuser database connection is defined. This is fine in development but should not be done in production.');
    const superuserConfig: PostgresConnectionOptions = {
        ...defaultConfig,
        name: 'Superuser',
        username: process.env.PGSUPERUSER,
        password: process.env.PGSUPERPASSWORD,
        extra: {} // no statement timeout for superuser database connections
    };

    if (process.env.NOAPPCONNECTIONS) {
        configs = [superuserConfig];
    } else {
        configs.push(superuserConfig);
    }
}

export default configs;
