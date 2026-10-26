import { StubRepository } from './StubRepository';

/**
 * StubRepositoryContainer acts to proxy requests for
 * stub repositories so that we're never missing any
 * that we might need.
 *
 * @export
 * @class StubRepositoryContainer
 */
export class StubRepositoryContainer {
    private stubRepos: Record<string, StubRepository<never>> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private accessHandler = (thisContainer: StubRepositoryContainer): any => {
        return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            get: function (target: Record<string, StubRepository<never>>, name: symbol): any {
                if (Object.prototype.hasOwnProperty.call(target, name)) {
                    return target[name.toString()];
                }

                return thisContainer.createRepo(name.toString());
            }
        };
    };

    private proxy = new Proxy(this.stubRepos, this.accessHandler(this));

    /**
     * Gets access to all the repositories. Arbitrary access
     * to create new ones is also permitted.
     *
     * @return {Record<string, StubRepository<never>>} the repositories
     * @memberof StubRepositoryContainer
     */
    public repos(): Record<string, StubRepository<never>> {
        return this.proxy;
    }

    /**
     * Clears all mock repositories.
     *
     * @memberof StubRepositoryContainer
     */
    public clearAll(): void {
        for (const repo of Object.values(this.stubRepos)) {
            repo.clear();
        }
    }

    /**
     * Creates a repo.
     *
     * @private
     * @param {string} name the repo to create
     * @return {StubRepository<never>} the repo
     * @memberof StubRepositoryContainer
     */
    private createRepo(name: string): StubRepository<never> {
        const newRepo = new StubRepository<never>(this);

        this.stubRepos[name] = newRepo;

        return newRepo;
    }
}
