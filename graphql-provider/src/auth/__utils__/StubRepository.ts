import { LwpPupil } from 'src/api/entities/pupil';
import { EntityManager, EntityNotFoundError, EntityTarget, FindConditions, FindManyOptions, FindOneOptions, FindOperator } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { StubQueryBuilder } from './StubQueryBuilder';
import { StubRepositoryContainer } from './StubRepositoryContainer';

export type BaseDBObject = {
    id: string;
};

export class StubRepository<T extends BaseDBObject> {
    items: T[];

    manager: Partial<EntityManager>;

    constructor(container: StubRepositoryContainer, items?: T[]) {
        this.items = items || [];

        this.manager = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transaction: (cbWithManager): any => {
                return cbWithManager({
                    getRepository: (repoKlass: EntityTarget<never>) => container.repos()[repoKlass['name'] || repoKlass.toString()]
                });
            }
        };
    }

    save(item: T): void {
        item.id = (this.items.length + 1).toString();

        this.items.push(item);
    }

    update(id: string, props: QueryDeepPartialEntity<T>): void {
        const item = this.findOne({ where: { id } });

        Object.entries(props)
            .sort(([, a], [, b]) => (typeof a === 'function' ? (typeof b === 'function' ? 0 : -1) : 1))
            .forEach(([k, v]) => {
                if (typeof v === 'function') {
                    item[k] = item[v().replace(/"/g, '')];
                } else {
                    item[k] = v;
                }
            });
    }

    findOne(opts: FindOneOptions<T>): T {
        const items = this.find(opts);

        return items.length > 0 && items[0];
    }

    findOneOrFail(opts: FindOneOptions<T>): T {
        const found = this.findOne(opts);

        if (found) return found;

        // TODO make this the proper class of the not-found entity: we don't use it anywhere for now.
        throw new EntityNotFoundError(LwpPupil, opts);
    }

    count(opts?: FindManyOptions<T>): number {
        return this.find(opts).length;
    }

    find(opts?: FindManyOptions<T>): T[] {
        if (!opts) return this.items;

        let optsCoerced: FindConditions<T>[];

        if (Array.isArray(opts.where)) {
            optsCoerced = opts.where as FindConditions<T>[];
        } else {
            optsCoerced = [opts.where as FindConditions<T>];
        }

        const items = optsCoerced.flatMap((clause) => {
            return Object.entries(clause).reduce(
                (acc, [key, val]) => acc.filter((item) => this.filterItemWithClause(item, key, val)),
                this.items
            );
        });

        return items;
    }

    delete(item: T): void {
        this.items = this.items.filter((i) => i !== item);
    }

    clear(): void {
        this.items = [];
    }

    createQueryBuilder(alias: string): StubQueryBuilder<T> {
        return new StubQueryBuilder(this, alias);
    }

    /**
     * Filters some items in where clause.
     *
     *
     * @private
     * @param {unknown} item the item to filter on
     * @param {string} filterKey the key to filter for
     * @param {unknown} filterVal the value to filter the {@link filterKey} to
     * @return {boolean} true if the item matches, false otherwise
     * @memberof StubRepository
     */
    private filterItemWithClause(item: unknown, filterKey: string, filterVal: unknown): boolean {
        const itemToFilter = item[filterKey];

        if (filterVal instanceof FindOperator) {
            switch (filterVal.type) {
                case 'not':
                    return itemToFilter !== filterVal.value;
                case 'moreThanOrEqual':
                    return itemToFilter >= filterVal.value;
            }
        }

        return itemToFilter === filterVal;
    }
}
