import { Field, ObjectType } from '@nestjs/graphql';
import { AdminField, AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { StaticLwpFeatureTooltip } from './static_lwp_feature_tooltip';
import { LwpUser } from './user';

@ObjectType()
@Entity()
@ActsAsAuthorizer(LwpUserTooltipHistory, async ({ opType, id, token }) => {
    if (opType === OpType.Read) {
        return (await LwpUserTooltipHistory.createQueryBuilder('luth')
            .innerJoin('luth.user', 'lu')
            .where('lu.id = :id', { id: token.sub })
            .andWhere('id = :id', { id })
            .getCount()) == 1
            ? '*'
            : false;
    }

    return '*';
})
export class LwpUserTooltipHistory extends BaseAuthorizerEntity {
    @ManyToOne(() => LwpUser, (user) => user.tooltips, { onDelete: 'SET NULL' })
    @Field(() => LwpUser, { nullable: true })
    @Index(['user.id'])
    @JoinColumn()
    user: LwpUser;

    @ManyToOne(() => StaticLwpFeatureTooltip, (s) => s.history, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => StaticLwpFeatureTooltip, { nullable: true })
    @Index(['featureTooltip.id'])
    @JoinColumn()
    @AuthorizeField(AdminField)
    featureTooltip: StaticLwpFeatureTooltip;

    // Common Fields - in future we will reduce this duplication
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
    @Index()
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index()
    logUpdatedBy: LwpUser;
}
