import 'tsconfig-paths/register';
import process from 'node:process';

import { type Schema } from '@lwp/postgres-client';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export const createDb = (): Kysely<Schema.DB> => {
    const pool = new Pool({
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT),
        database: process.env.PGDATABASE,
        user: process.env.PGAPPUSER,
        password: process.env.PGAPPPASSWORD
    });

    return new Kysely<Schema.DB>({
        dialect: new PostgresDialect({ pool })
    });
};
