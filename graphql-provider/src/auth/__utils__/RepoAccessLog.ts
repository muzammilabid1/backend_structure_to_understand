/**
 * The "connection" a repository call ran on: the injected default repositories
 * (backed by the connection pool) or repositories handed out by a transaction's
 * EntityManager (backed by the transaction's own connection).
 */
export type RepoConnection = 'pool' | 'transaction';

export interface RepoAccess {
    connection: RepoConnection;
    entity: string;
    method: string;
}

/**
 * RepoAccessLog records every repository method call made through the repositories
 * it wraps, along with which connection the call ran on.
 *
 * It exists so tests can assert that a transactional code path does all of its
 * database work on the transaction. A query that reaches for a default repository
 * while a transaction is open needs a second pooled connection per request, and
 * under load that deadlocks the whole pool (LEA-6693).
 *
 * @export
 * @class RepoAccessLog
 */
export class RepoAccessLog {
    readonly entries: RepoAccess[] = [];

    /**
     * Wraps a repository so that every method call on it is recorded.
     *
     * Calls are forwarded to the original repository with the original `this`,
     * so a repository method calling another of its own methods is recorded once.
     *
     * @template T the repository type
     * @param {T} repo the repository to wrap
     * @param {RepoConnection} connection the connection the wrapped repository represents
     * @param {string} entity the name of the entity the repository is for
     * @return {T} the wrapped repository
     * @memberof RepoAccessLog
     */
    track<T extends object>(repo: T, connection: RepoConnection, entity: string): T {
        return new Proxy(repo, {
            get: (target, property, receiver): unknown => {
                const value = Reflect.get(target, property, receiver);

                if (typeof value !== 'function') return value;

                return (...args: unknown[]): unknown => {
                    this.entries.push({ connection, entity, method: property.toString() });

                    return value.apply(target, args);
                };
            }
        });
    }

    /**
     * Describes the recorded calls, in order, as `connection:Entity.method`.
     *
     * @param {RepoConnection} [connection] only include calls on this connection
     * @return {string[]} the descriptions
     * @memberof RepoAccessLog
     */
    describe(connection?: RepoConnection): string[] {
        return this.entries
            .filter((entry) => !connection || entry.connection === connection)
            .map((entry) => `${entry.connection}:${entry.entity}.${entry.method}`);
    }

    /**
     * Forgets everything recorded so far.
     *
     * @memberof RepoAccessLog
     */
    clear(): void {
        this.entries.length = 0;
    }
}
