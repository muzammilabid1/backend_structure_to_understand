import 'tsconfig-paths/register';

import process from 'node:process';

import { createPostgresClient, type Schema } from '@lwp/postgres-client';
import type { Kysely } from 'kysely';

/**
 * Build the connection string from the same PG* variables TypeORM reads, so the Kysely client
 * used for seeding and the connection the services run on always address one database. Set
 * TEST_DATABASE_URL to point the tests elsewhere. DATABASE_URL is not used: it carries a unix
 * socket path in local development, which is not reachable from a test run on the host.
 */
const connectionString = (): string => {
    if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

    const { PGAPPUSER, PGAPPPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;

    return `postgresql://${PGAPPUSER}:${encodeURIComponent(PGAPPPASSWORD ?? '')}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
};

export const createDb = (): Kysely<Schema.DB> => createPostgresClient({ connectionString: connectionString() });
