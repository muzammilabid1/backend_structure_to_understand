import type { ChangeOperation } from 'src/data-import/types/change-operation';
import type { ChangeStatus } from 'src/data-import/types/change-status';
import type { EntityType } from 'src/data-import/types/entity-type';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ImportedSchoolDataProposedChange {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column()
    platformSchoolId: string;

    @Column()
    status: ChangeStatus;

    @Column()
    entityType: EntityType;

    @Column()
    operation: ChangeOperation;

    @Column({ type: 'bigint', nullable: true })
    platformEntityId: string | null;

    @Column({ nullable: true })
    fieldName: string | null;

    @Column({ type: 'jsonb', nullable: true })
    proposedValue: string | null;

    @Column({ nullable: true })
    rejectedImportedAt: Date | null;
}
