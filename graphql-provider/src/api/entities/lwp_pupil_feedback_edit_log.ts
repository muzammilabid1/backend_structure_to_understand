import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { Delegate } from 'src/auth/authorizers/Delegate';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Index } from 'typeorm';

import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(LwpPupilFeedbackEditLog, Delegate(() => LwpPupilFeedback, 'pupilFeedback'))
export class LwpPupilFeedbackEditLog extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @ManyToOne(() => LwpPupilFeedback, (t) => t.history, { onDelete: 'CASCADE' })
    @Field(() => LwpPupilFeedback, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    @Index(['feedback.id'])
    feedback: LwpPupilFeedback;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    @AuthorizeField(UnrestrictedField)
    logCreatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    logCreatedBy: LwpUser;
}
