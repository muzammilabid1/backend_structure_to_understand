import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TrustedUserField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { MediaType } from '../model';
import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpPupilFeedbackMedia, async ({ id, opType, token }) => {
    if (id === null) return '*'; // Anyone can add a media object.

    return (await LwpPupilFeedback.authorize({
        id: id
            ? (
                  await LwpPupilFeedbackMedia.createQueryBuilder('lpfm')
                      .innerJoin('lpfm.feedback', 'lpf')
                      .where('lpfm.id = :id', { id })
                      .select('lpf.id')
                      .getRawOne<{ lpf_id: string }>()
              )?.lpf_id
            : null,
        opType,
        token
    }))
        ? '*'
        : false;
})
export class LwpPupilFeedbackMedia extends BaseAuthorizerEntity {
    @Field(() => LwpPupilFeedback, { nullable: true })
    @ManyToOne(() => LwpPupilFeedback, (child) => child.media, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn()
    @Index(['feedback.id'])
    // Nobody should need to go from media to its feedback parent.
    feedback: LwpPupilFeedback;

    @Field({ nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(TrustedUserField)
    filename: string;

    @Field(() => MediaType, { nullable: true })
    @Column({ nullable: true })
    @AuthorizeField(UnrestrictedField)
    type: MediaType;

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
