import { Field, ObjectType } from '@nestjs/graphql';
import { AdminField, AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminWriteAllRead } from 'src/auth/authorizers/AdminWriteAllRead';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';

import { LwpPupilTrophy } from './pupil_trophy';
import { StaticLwpSubject } from './static_lwp_subject';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(StaticLwpTrophy, AdminWriteAllRead)
export class StaticLwpTrophy extends BaseAuthorizerEntity {
    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    logo: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    certificatePdf: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    order: number;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    title: string;

    @ManyToMany(() => StaticLwpSubject, (child) => child.trophies, { onDelete: 'CASCADE' })
    @JoinTable({ name: 'lwp_trophy_subjects' })
    @Field(() => [StaticLwpSubject], { nullable: true })
    @AuthorizeField(AdminField)
    subjects: StaticLwpSubject[];

    @CreateDateColumn({
        type: 'timestamp'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
    startDate: Date;

    @CreateDateColumn({
        type: 'timestamp'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
    endDate: Date;

    @Field()
    @Column({ default: false })
    @AuthorizeField(UnrestrictedField)
    isActive: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    isPupilMail: boolean;

    @Field()
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    isTeacherMail: boolean;

    @Field({ nullable: true })
    @Column({ type: 'jsonb', nullable: true, array: false })
    @AuthorizeField(TeacherField)
    certificate: string;

    @OneToMany(() => LwpPupilTrophy, (t) => t.trophy)
    @Field(() => [LwpPupilTrophy])
    trophies: LwpPupilTrophy[];

    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

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
