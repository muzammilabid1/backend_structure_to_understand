import type { EntityType } from 'src/data-import/types/entity-type';
import type { LinkStatus } from 'src/data-import/types/link-status';
import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity()
@Unique('UQ_IMPORTED_PLATFORM_ENTITY_ID', ['importedEntityId', 'platformEntityId'])
export class ImportedSchoolDataProposedLink {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column()
    platformSchoolId: string;

    @Column()
    status: LinkStatus;

    @Column()
    entityType: EntityType;

    @Column()
    importedEntityId: string;

    @Column({ type: 'bigint' })
    platformEntityId: string;

    @Column()
    isHighConfidence: boolean;

    /**
     * Bitmask of the criteria this candidate actually matched on, so two high-confidence
     * candidates for the same entity can be compared against each other rather than only counted.
     * Written by pupil linking (see MatchCriterion); class linking leaves it at zero, which no
     * candidate can be strictly better than, so class links still resolve on uniqueness alone.
     */
    @Column({ type: 'integer', default: 0 })
    matchCriteria: number;
}
