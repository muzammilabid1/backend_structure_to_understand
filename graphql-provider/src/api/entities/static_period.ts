import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
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
    OneToOne,
    PrimaryColumn,
    UpdateDateColumn
} from 'typeorm';

import { PupilMathscotsCharacter, PupilMathscotsColour } from '../model';
import { ImportedSchool } from './imported_school';
import { ImportedSchoolClass } from './imported_school_class';
import { dateValueTransformer } from './lib/date_value_transformer';
import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpSchoolDates } from './lwp_school_dates';
import { LwpSchoolHoliday } from './lwp_school_holiday';
import { LwpSchoolImpactReport } from './lwp_school_impact_report';
import { LwpPupilMathscot } from './pupil_mathscot';
import { LwpPupilTopic } from './pupil_topic';
import { DateOnly } from './scalar/DateOnly.scalar';
import { LwpSchool } from './school';
import { LwpSchoolClass } from './school_class';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(StaticLwpPeriod, AdminWriteAllRead)
export class StaticLwpPeriod extends BaseAuthorizerEntity {
    @PrimaryColumn()
    @Field()
    @AuthorizeField(UnrestrictedField)
    index: number;

    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    shortName: string;

    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    longName: string;

    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    isCurrentPeriod: boolean;

    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    isPreviousPeriod: boolean;

    @Field(() => DateOnly, { nullable: true })
    @Column({ type: 'date', transformer: dateValueTransformer, nullable: true })
    @AuthorizeField(UnrestrictedField)
    startDate: Date;

    @Field(() => DateOnly, { nullable: true })
    @Column({ type: 'date', transformer: dateValueTransformer, nullable: true })
    @AuthorizeField(UnrestrictedField)
    endDate: Date;

    @Column({ type: 'jsonb', nullable: true, default: [] })
    @Field(() => [PupilMathscotsCharacter])
    @AuthorizeField(UnrestrictedField)
    characters: PupilMathscotsCharacter[];

    @Column({ type: 'jsonb', nullable: true, default: [] })
    @Field(() => [PupilMathscotsColour])
    @AuthorizeField(UnrestrictedField)
    colours: PupilMathscotsColour[];

    @OneToOne(() => StaticLwpPeriod, (p) => p.nextPeriod, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @JoinColumn()
    @AuthorizeField(UnrestrictedField)
    nextPeriod: StaticLwpPeriod;

    @OneToOne(() => StaticLwpPeriod, (p) => p.previousPeriod, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => StaticLwpPeriod, { nullable: true })
    @JoinColumn()
    @AuthorizeField(UnrestrictedField)
    previousPeriod: StaticLwpPeriod;

    @OneToMany(() => LwpSchool, (t) => t.curentPeriod)
    @Field(() => [LwpSchool], { nullable: true })
    schools: LwpSchool[];

    @OneToMany(() => LwpSchoolClass, (t) => t.period)
    @Field(() => [LwpSchoolClass], { nullable: true })
    schoolClasses: LwpSchoolClass[];

    @OneToMany(() => LwpSchoolImpactReport, (t) => t.period)
    @Field(() => [LwpSchoolImpactReport], { nullable: true })
    impactReports: LwpSchoolImpactReport[];

    @OneToMany(() => LwpSchoolDates, (t) => t.period)
    @Field(() => [LwpSchoolDates], { nullable: true })
    terms: LwpSchoolDates[];

    @OneToMany(() => LwpPupilTopic, (t) => t.period)
    @Field(() => [LwpPupilTopic], { nullable: true })
    pupilTopics: LwpPupilTopic[];

    @OneToMany(() => LwpPupilFeedback, (t) => t.period)
    @Field(() => [LwpPupilFeedback], { nullable: true })
    pupilFeedbacks: LwpPupilFeedback[];

    @OneToMany(() => ImportedSchool, (t) => t.period)
    @Field(() => [ImportedSchool], { nullable: true })
    importedSchools: ImportedSchool[];

    @OneToMany(() => ImportedSchoolClass, (t) => t.period)
    @Field(() => [ImportedSchoolClass], { nullable: true })
    importedSchoolClasses: ImportedSchoolClass[];

    @OneToMany(() => LwpPupilMathscot, (t) => t.period)
    @Field(() => [LwpPupilMathscot], { nullable: true })
    pupilMathscot: LwpPupilMathscot[];

    @OneToMany(() => LwpSchoolHoliday, (holiday) => holiday.period)
    @Field(() => [LwpSchoolHoliday], { nullable: true })
    schoolHolidays: LwpSchoolHoliday[];

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
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
