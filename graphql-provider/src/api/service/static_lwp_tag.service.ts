import { Injectable } from '@nestjs/common';

import { LwpUser } from '../entities/user';
import { OperationStatus } from '../model';

@Injectable()
export abstract class StaticLwpTagService<Entity, CreateInput, UpdateInput> {
    abstract addNewTag(input: CreateInput, user: LwpUser): Promise<Entity>;

    abstract updateTag(input: UpdateInput, user: LwpUser): Promise<Entity>;

    abstract getTagsByIds(id: string[]): Promise<Entity[]>;

    abstract getTagsForAdmin(): Promise<Entity[]>;

    abstract deleteTag(id: string, deletedBy: LwpUser): Promise<OperationStatus>;
}
