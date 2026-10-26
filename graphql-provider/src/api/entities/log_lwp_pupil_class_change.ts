import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { SchoolClassStatus } from '../model';
import { PupilClassActionType } from '../types/PupilClassActionType';

@Entity()
@ActsAsAuthorizer(LogLwpPupilClassChange, AdminOnly)
export class LogLwpPupilClassChange extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @Column({ type: 'bigint' })
    pupilId: string;

    @Column({ type: 'bigint' })
    classId: string;

    @Column()
    action: PupilClassActionType;

    @Column()
    status: SchoolClassStatus;

    @Column({ type: 'bigint', nullable: true })
    logCreatedById: string | null;

    @CreateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    logCreatedAt: Date;
}
