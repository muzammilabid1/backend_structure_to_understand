import { ObjectType } from '@nestjs/graphql';

import { PaginationResultInterface } from './pagination.results.interface';

@ObjectType()
export class Pagination<PaginationEntity> {
    public results: PaginationEntity[];
    public page_total: number;
    public total: number;
    public limit: number;
    public offset: number;

    constructor(paginationResults: PaginationResultInterface<PaginationEntity>) {
        this.results = paginationResults.results;
        this.page_total = paginationResults.results.length;
        this.total = paginationResults.total;
        this.limit = paginationResults.limit;
        this.offset = paginationResults.offset;
    }
}
