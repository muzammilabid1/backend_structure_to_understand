import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    RelationId,
    UpdateDateColumn
} from 'typeorm';

import { LwpSchoolImpactReport } from './lwp_school_impact_report';
import { StaticLwpPeriod } from './static_period';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpSchoolDates, AdminWriteAllRead)
export class LwpSchoolDates extends BaseAuthorizerEntity {
    @Field()
    @Column()
    @AuthorizeField(TeacherField)
    termName: string;

    @Field()
    @Column()
    @Index()
    startDate: Date;

    @Field()
    @Column()
    endDate: Date;

    @OneToMany(() => LwpSchoolImpactReport, (t) => t.term)
    @Field(() => [LwpSchoolImpactReport], { nullable: true })
    impactReports: LwpSchoolImpactReport[];

    @ManyToOne(() => StaticLwpPeriod, (t) => t.terms, { onDelete: 'SET NULL' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @JoinColumn()
    period: StaticLwpPeriod;

    @RelationId((term: LwpSchoolDates) => term.period)
    periodIndex: number;

    @Field({ nullable: true })
    termPeriodIndex: number;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logCreatedBy.id'])
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;
}
