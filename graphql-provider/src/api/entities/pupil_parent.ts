import { Field, ObjectType } from '@nestjs/graphql';
import { PupilParentStatus } from 'lwp-shared';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { AuthTokenJWT } from 'src/auth/types/AuthToken';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { PupilParentContext } from '../model';
import { LogLwpEntityStatusChange } from './log_lwp_entity_status_change';
import { LwpPupil } from './pupil';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpPupilParent, Delegate(() => LwpPupil, 'pupil'))
@Unique('UQ_PUPIL_PARENT', ['parent', 'pupil'])
export class LwpPupilParent extends BaseAuthorizerEntity {
    @ManyToOne(() => LwpPupil, (child) => child.parents, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @Field(() => LwpPupil)
    @AuthorizeField(UnrestrictedField)
    pupil: LwpPupil;

    @Index('lwp_pupil_parent_pupilid_idx')
    @Column({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    pupilId: string;

    @ManyToOne(() => LwpUser, (child) => child.pupils, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    @Field(() => LwpUser)
    @Index()
    @AuthorizeField(UnrestrictedField)
    parent: LwpUser;

    @Column({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    parentId: string;

    @Column()
    @Field(() => PupilParentStatus, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    status: PupilParentStatus;

    @Column({ nullable: true, type: 'bigint' })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    importedStudentContactID: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TeacherField)
    lastInvitationEmailSent: Date;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    logLastStatusChange: Date;

    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    lastAccess: Date;

    @Column({ default: true })
    @Field()
    @AuthorizeField(UnrestrictedField)
    showInterstitial: boolean;

    @Field(() => PupilParentContext)
    @AuthorizeField(UnrestrictedField)
    @Column({
        type: 'jsonb',
        array: false,
        default: {
            isReadingSectionShown: false,
            isTopicsSectionShown: false
        }
    })
    interstitialContext: PupilParentContext;

    @Field({ nullable: true })
    // this should only ever be executed by the user themselves. never by anyone else.
    @AuthorizeField(({ object, token }: { object: LwpPupilParent; token?: AuthTokenJWT }) => token.sub === object.parentId)
    rejectMagicLink: string;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['deletedBy.id'])
    deletedBy: LwpUser;

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

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logCreatedBy.id'])
    @AuthorizeField(TeacherField)
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser, { nullable: true })
    @Index(['invitedBy.id'])
    @AuthorizeField(TeacherField)
    invitedBy: LwpUser;

    @Column({ nullable: true, type: 'bigint' })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    invitedById: string;

    @Field(() => [LogLwpEntityStatusChange], { nullable: true })
    @AuthorizeField(TeacherField)
    logStatusChange: LogLwpEntityStatusChange[];

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    @AuthorizeField(TeacherField)
    logUpdatedBy: LwpUser;
}
