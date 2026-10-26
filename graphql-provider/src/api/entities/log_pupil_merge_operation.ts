import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class LogPupilMergeOperation {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    logCreatedAt: Date;

    @Column({ type: 'bigint' })
    userId: string;

    @Column({ type: 'bigint' })
    schoolId: string;

    @Column({ type: 'bigint' })
    sourcePupilId: string;

    @Column({ type: 'bigint' })
    destinationPupilId: string;

    @Column({ type: 'bigint', array: true })
    reassignedPupilFeedbackIds: Array<string>;

    @Column({ type: 'bigint', array: true })
    redundantPupilFeedbackIds: Array<string>;

    @Column({ type: 'bigint', array: true })
    reassignedReadingPupilTopicIds: Array<string>;

    @Column({ type: 'bigint', array: true })
    reassignedActivityPupilTopicIds: Array<string>;

    @Column({ type: 'bigint', array: true })
    reassignedActivityPupilActivityIds: Array<string>;

    @Column({ type: 'bigint', array: true })
    detachedParentIds: Array<string>;

    @Column({ type: 'bigint', array: true })
    detachedClassIds: Array<string>;

    @Column({ type: 'boolean' })
    sourcePupilRemovedFromSchool: boolean;
}
