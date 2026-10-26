import { Field, ObjectType } from '@nestjs/graphql';
import { FeedbackReplyType } from 'lwp-shared';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpSticker } from './lwp_sticker';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpFeedbackReply, async ({ id, token, parentId, opType }) => {
    if (token.userType === UserType.ADMIN) return '*'; // admins allowed

    if (token.userType === UserType.PARENT && opType === OpType.Write) return false; // parents allowed to read only

    if (id === null) {
        // Check if the feedback is linked with the teacher's school
        return (await LwpPupilFeedback.createQueryBuilder('lpf')
            .leftJoin('lpf.pupils', 'pupil')
            .leftJoin('pupil.classes', 'class')
            .leftJoin('class.school', 'school')
            .where('lpf.id = :id', { id: parentId })
            .andWhere('school.id = :schoolId', { schoolId: token.schoolId })
            .andWhere('lpf.userType = :userType', { userType: UserType.PARENT })
            .getCount()) > 0
            ? '*'
            : false;
    }

    if (opType === OpType.Write)
        return (await LwpFeedbackReply.createQueryBuilder('lfr')
            .leftJoin('lfr.logCreatedBy', 'createdBy')
            .where('lfr.id = :id', { id })
            .andWhere('createdBy.id = :userId', { userId: token.sub })
            .getCount()) === 1
            ? '*'
            : false;

    return '*';
})
@Index(['feedback.id'])
export class LwpFeedbackReply extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @AuthorizeField(UnrestrictedField)
    @Field()
    id: string;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    reply: string;

    @Column({ nullable: true })
    @Field(() => FeedbackReplyType)
    @AuthorizeField(UnrestrictedField)
    type: FeedbackReplyType;

    @Field({ defaultValue: false })
    @Column({ default: false })
    @AuthorizeField(TeacherField)
    parentNotified: boolean;

    @ManyToOne(() => LwpPupilFeedback, (pupilFeedback) => pupilFeedback.feedbackReplies, { onDelete: 'CASCADE' })
    feedback: LwpPupilFeedback;

    @ManyToOne(() => LwpSticker, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => LwpSticker, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    sticker: LwpSticker;

    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    @Column({ nullable: true, type: 'bigint' })
    originalFeedbackReplyId: string;

    @Column({ type: 'timestamp', nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    originalFeedbackReplyDeletedAt: Date;

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
    @Field(() => LwpUser, { nullable: true })
    @Index()
    @AuthorizeField(UnrestrictedField)
    logCreatedBy: LwpUser | null;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    @AuthorizeField(UnrestrictedField)
    logUpdatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    deletedBy: LwpUser;
}
