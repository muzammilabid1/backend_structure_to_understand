import type { ChangeOperation } from 'src/data-import/types/change-operation';
import type { EntityType } from 'src/data-import/types/entity-type';

export type ClassChange = {
    id: string;
    operation: ChangeOperation;
    entityType: EntityType.CLASS;
    platformEntityId: string;
    fieldName: string;
    proposedValue: string;
};
