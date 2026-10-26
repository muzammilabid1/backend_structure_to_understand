export interface PaginationResultInterface<PaginationEntity> {
    results: PaginationEntity[];
    total: number;
    limit: number;
    offset: number;
    next?: string;
    previous?: string;
}
