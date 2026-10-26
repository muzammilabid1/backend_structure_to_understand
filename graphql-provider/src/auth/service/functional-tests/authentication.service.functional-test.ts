import type { Schema } from '@lwp/postgres-client';
import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type Kysely, type Selectable } from 'kysely';
import type { Pool } from 'pg';
import { createUtils } from 'src/api/service/functional-tests/utils';
import { AuthenticationService } from 'src/auth/service/authentication.service';
import { AuthMethod } from 'src/auth/types/AuthMethod';
import { SessionLength } from 'src/auth/types/SessionLength';
import { BaseModule } from 'src/base.module';
import { createDb } from 'src/data-import/functional-tests/utils';
import { Connection } from 'typeorm';
import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';

jest.setTimeout(120000);

/** How long each connection-holding statement sleeps for. Comfortably longer than the refresh deadline. */
const HOLD_SECONDS = 10;

/** How long a refresh is given before it is declared stuck. A healthy refresh takes milliseconds. */
const REFRESH_DEADLINE_MS = 4000;

/**
 * Rejects if the promise has not settled within the deadline.
 *
 * @template T the promise's result type
 * @param {Promise<T>} promise the promise to wait for
 * @param {number} ms the deadline in milliseconds
 * @param {string} message the error message to reject with
 * @return {Promise<T>} the promise's result
 */
const withDeadline = async <T>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timer: NodeJS.Timeout;

    const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
    });

    try {
        return await Promise.race([promise, deadline]);
    } finally {
        clearTimeout(timer);
    }
};

/**
 * On 14 September 2026 both production backends froze for an hour. refreshSession held a pooled
 * connection (and a row lock) for its transaction, then reached for a second pooled connection to
 * build the access token. Once every connection in the pool belonged to a refresh waiting for a
 * second one, nothing could proceed and the health check hung with them (LEA-6693).
 *
 * This test recreates a nearly saturated pool against a real Postgres and requires a refresh to
 * complete on its transaction's connection alone.
 */
describe('AuthenticationService.refreshSession under connection-pool pressure (LEA-6693)', () => {
    let db: Kysely<Schema.DB>;
    let utils: ReturnType<typeof createUtils>;
    let app: INestApplication;
    let authService: AuthenticationService;
    let connection: Connection;
    let pool: Pool;

    let parent: Selectable<Schema.LwpUser>;
    let session: Selectable<Schema.LwpUserSession>;
    let heldConnections: Promise<unknown>[] = [];

    beforeAll(async () => {
        db = createDb();
        utils = createUtils(db);
        app = await NestFactory.create(BaseModule);
        authService = app.get(AuthenticationService);
        connection = app.get(Connection);
        pool = (connection.driver as PostgresDriver).master;

        parent = await utils.createParent({ firstname: 'Pool', lastname: 'Pressure' });
    });

    beforeEach(async () => {
        session = await db
            .insertInto('lwp_user_session')
            .values({
                userId: parent.id,
                ip: '127.0.0.1',
                userAgent: 'jest',
                authMethod: AuthMethod.MagicLink,
                sessionLength: SessionLength.Short,
                refreshToken: `jti-${Date.now()}`
            })
            .returningAll()
            .executeTakeFirstOrThrow();
    });

    afterEach(async () => {
        await Promise.allSettled(heldConnections);
        heldConnections = [];

        await db.deleteFrom('lwp_user_session').where('userId', '=', parent.id).execute();
    });

    afterAll(async () => {
        await utils.deleteUser(parent.id);
        await app.close();
        await db.destroy();
    });

    /**
     * Occupies every pooled connection but one with a long-running statement: the state of a busy
     * server whose pool is nearly saturated by other requests.
     */
    const leaveOneFreeConnection = async (): Promise<void> => {
        // pg-pool keeps its configuration on `options`; the typings do not expose it.
        const { max = 10 } = (pool as Pool & { options: { max?: number } }).options;
        const toHold = max - 1;

        heldConnections = Array.from({ length: toHold }, () => connection.query(`SELECT pg_sleep(${HOLD_SECONDS})`));

        const giveUpAt = Date.now() + 5000;

        while (pool.totalCount - pool.idleCount < toHold) {
            if (Date.now() > giveUpAt) {
                throw new Error(`Only ${pool.totalCount - pool.idleCount} of ${toHold} pooled connections could be occupied`);
            }

            await new Promise((resolve) => setTimeout(resolve, 25));
        }
    };

    it('completes on the transaction connection alone when only one pooled connection is free', async () => {
        await leaveOneFreeConnection();

        const tokenPair = await withDeadline(
            authService.refreshSession(parent.id, session.refreshToken),
            REFRESH_DEADLINE_MS,
            `refreshSession did not finish within ${REFRESH_DEADLINE_MS}ms: it is holding its transaction's connection while waiting for a second one from the pool`
        );

        expect(tokenPair.accessToken).toBeTruthy();
        expect(tokenPair.refreshToken).toBeTruthy();

        const rotated = await db.selectFrom('lwp_user_session').selectAll().where('id', '=', session.id).executeTakeFirstOrThrow();

        expect(rotated.previousRefreshToken).toEqual(session.refreshToken);
        expect(rotated.refreshToken).not.toEqual(session.refreshToken);
    });
});
