import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { SchoolClassLicenceOperationType } from '../model';
import { LwpSchool } from './school';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(LogSchoolClassLicense, AdminOnly)
export class LogSchoolClassLicense extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(TeacherField)
    id: string;

    @Field(() => SchoolClassLicenceOperationType, { nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    operationType: SchoolClassLicenceOperationType;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    fullProgrammeClassCount: number;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readyTeddyClassCount: number;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    totalClassCount: number;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    requestedFullProgrammeClassCount: number;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    requestedReadyTeddyClassCount: number;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    requestedReadingOnlyClassCount: number;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    requestedUpgradeClassCount: number;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    fullProgrammeClassPrice: number;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readingOnlyClassPrice: number;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    readyTeddyClassPrice: number;

    @Column({ default: 0, nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    totalPrice: number;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    schoolPeriod: string;

    @ManyToOne(() => LwpSchool, (school) => school.logSchoolClassLicenses, { onDelete: 'SET NULL' })
    @Field(() => LwpSchool)
    @AuthorizeField(TeacherField)
    school: LwpSchool;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(TeacherField)
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(TeacherField)
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    logUpdatedBy: LwpUser;
}
