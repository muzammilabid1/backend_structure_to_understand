import type { ChangeOperation } from 'src/data-import/types/change-operation';
import type { EntityType } from 'src/data-import/types/entity-type';

export type PupilChange = {
    id: string;
    operation: ChangeOperation;
    entityType: EntityType.PUPIL;
    platformEntityId: string;
    fieldName: string;
    proposedValue: string;
};
