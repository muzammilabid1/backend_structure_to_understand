/* eslint-disable @typescript-eslint/no-explicit-any */
import _ from 'lodash';

import { BaseDBObject, StubRepository } from './StubRepository';

export class StubQueryBuilder<T extends BaseDBObject> {
    private aliasList: Record<string, QueryPathPart | [QueryPathPart]> = {};
    private currentData: T[];
    private selection = new QueryPathPart('');

    constructor(
        private repo: StubRepository<T>,
        private baseAlias: string
    ) {
        this.aliasList[baseAlias] = new QueryPathPart('');
        this.currentData = repo.items;
    }

    distinct(): StubQueryBuilder<T> {
        return this;
    }

    distinctOn(_distinctOn: Array<string>): StubQueryBuilder<T> {
        return this;
    }

    innerJoin(path: QueryPathPart, alias: string): StubQueryBuilder<T> {
        const finalPath = this.replaceAllAliasesIn(path);

        if (this.currentData.some((dataItem) => Array.isArray(this.getItemInObjectFromString(dataItem, path)))) {
            this.aliasList[alias] = [new QueryPathPart(finalPath)];
        } else {
            this.aliasList[alias] = new QueryPathPart(finalPath);
        }

        return this;
    }

    leftJoin = this.innerJoin;

    where(condition: string, params: Record<string, any>): StubQueryBuilder<T> {
        // for now we only support != and =

        if (condition.includes('!=')) {
            this.matchFilter(condition, params, '!=', (actual, desired) => {
                return actual !== desired;
            });
        } else {
            this.matchFilter(condition, params, '=', (actual, desired) => {
                return actual === desired;
            });
        }

        return this;
    }

    andWhere = this.where;

    orWhere(condition: string, params: Record<string, any>): StubQueryBuilder<T> {
        const newQb = new StubQueryBuilder(this.repo, this.baseAlias);

        newQb.aliasList = this.aliasList;

        newQb.where(condition, params);

        this.currentData = [...this.currentData, ...newQb.getMany()];

        return this;
    }

    select(selected: string): this {
        this.selection = new QueryPathPart(selected);

        return this;
    }

    getRawOne(): any {
        return this.getRawMany()[0];
    }

    getRawMany(): any {
        return this.currentData.map((item) =>
            Object.fromEntries([[this.selection.replace('.', '_'), this.getItemInObjectFromString(item, this.selection)]])
        );
    }

    getMany(): T[] {
        return this.currentData;
    }

    getOne(): T {
        return this.currentData[0];
    }

    getCount(): number {
        return this.currentData.length;
    }

    private matchFilter(condition: string, params: Record<string, any>, op: string, matcher: (actual: any, desired: any) => boolean): void {
        const filter = condition.split(new RegExp(String.raw`\s*${op}\s*`));

        const filterVal = params[filter[1].match(/:(\w+)/)[1]];

        const aliasCallMatcher = (item: any): boolean => {
            const base = this.getItemInObjectFromString(item, new QueryPathPart(filter[0]));

            if (!Array.isArray(base)) return matcher(base, filterVal);

            if (base.length === 0) return false;

            if (base[0]['type'] === QueryPathPart) return base.some((item) => aliasCallMatcher(item));

            return base.some((item) => matcher(item, filterVal));
        };

        this.currentData = this.currentData.filter(aliasCallMatcher);
    }

    private replaceAllAliasesIn(pathWithAlias: QueryPathPart): QueryPathPart {
        return Object.entries(this.aliasList).reduce((existingPath, [alias, path]) => {
            if (alias === '') return existingPath;

            // we actively want to have the extra brackets here for clarity
            return new QueryPathPart(
                existingPath.replace(`${alias}.`, `${path}${Array.isArray(path) ? '[]' : path.toString() === '' ? '' : '.'}`)
            );
        }, pathWithAlias);
    }

    /**
     * Gets the item from a nested object by string filter.
     *
     * @private
     * @param {*} item the nested object to look at
     * @param {QueryPathPart} filter the filter to go down to
     * @return {*} whatever is found
     * @memberof StubQueryBuilder
     */
    private getItemInObjectFromString(item: any, filter: QueryPathPart): any {
        const path = this.replaceAllAliasesIn(filter);
        const arrayComponents = path.split('[]');

        if (arrayComponents.length === 1) return this.getComponentFromItemOrItems(item, arrayComponents[0]);

        const firstComponent = arrayComponents.shift();

        return this.getItemInObjectFromString(
            this.getComponentFromItemOrItems(item, firstComponent),
            new QueryPathPart(arrayComponents.join('[]'))
        );
    }

    private getComponentFromItemOrItems(itemOrItems: any | any[], component: string): any {
        return Array.isArray(itemOrItems) ? itemOrItems.flatMap((i) => _.get(i, component)) : _.get(itemOrItems, component);
    }
}

class QueryPathPart extends String {
    readonly type = QueryPathPart;
}
