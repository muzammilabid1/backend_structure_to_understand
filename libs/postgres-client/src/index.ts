import { Kysely, PostgresDialect } from 'kysely';
import { Pool, type PoolConfig } from 'pg';

import type { DB } from './schema.gen.ts';

export type * as Schema from './schema.gen.ts';

export type CreatePostgresClientOpts = PoolConfig;

export const createPostgresClient = (
    opts: CreatePostgresClientOpts,
): Kysely<DB> =>
    new Kysely<DB>({
        dialect: new PostgresDialect({
            pool: new Pool(opts),
        }),
    });
