import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, UpdateDateColumn } from 'typeorm';

import { MagicLinkContext, MagicLinkType } from '../model';
import { LwpPupil } from './pupil';
import { LwpUser } from './user';

@Entity()
@ObjectType()
// never read or written publicly other than by redeeming a magic link token, so NOT an authorizer.
// Field authorisers in here therefore only relate to while there is access through a token
export class LwpMagicLink {
    @Column({ default: () => 'nanoid()', primary: true })
    @AuthorizeField(UnrestrictedField)
    @Field()
    url: string;

    @Column()
    @Field()
    @AuthorizeField(TeacherField)
    expiryTime: Date;

    @Column({ nullable: true })
    @Field({ nullable: true })
    lastRegeneratedAt: Date;

    @Column()
    @Field()
    type: MagicLinkType;

    @Column({ default: false })
    @Field()
    isUsed: boolean;

    @ManyToOne(() => LwpUser, (child) => child.magicLinks, { onDelete: 'CASCADE', nullable: true })
    @Field(() => LwpUser, { nullable: true })
    @Index()
    @AuthorizeField(UnrestrictedField)
    user: LwpUser;

    @Field(() => LwpPupil, { nullable: true })
    @AuthorizeField(UnrestrictedField)
    pupil: LwpPupil;

    @Field()
    @Column({ nullable: true, type: 'bigint' })
    pupilId: string;

    @Field(() => MagicLinkContext, { nullable: true })
    @Column({ type: 'jsonb', nullable: true, array: false })
    context: MagicLinkContext;

    // Common Fields - in future we will reduce this duplication
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
}
