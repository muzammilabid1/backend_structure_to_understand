import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { StaticLwpPageAnnouncement } from './static_lwp_page_announcement';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@Index('idx_unique_user_pageAnnouncement', ['user', 'pageAnnouncement'], { unique: true }) // for documentation
@ActsAsAuthorizer(LwpUserPageAnnouncement, async ({ opType, id, token, parentId }) => {
    if (token.userType === UserType.ADMIN) return '*';

    if (opType === OpType.Read) {
        return (await LwpUserPageAnnouncement.createQueryBuilder('lupa')
            .innerJoin('lupa.user', 'lu')
            .where('lu.id = :id', { id: token.sub })
            .andWhere('id = :id', { id })
            .getCount()) == 1
            ? '*'
            : false;
    } else if (opType === OpType.Write && token.sub === parentId) {
        return '*';
    }

    return false;
})
export class LwpUserPageAnnouncement extends BaseAuthorizerEntity {
    @ManyToOne(() => LwpUser, (u) => u.lwpUserPageAnnouncements, { onDelete: 'CASCADE' })
    @Field(() => LwpUser)
    @Index(['user.id'])
    user: LwpUser;

    @ManyToOne(() => StaticLwpPageAnnouncement, (interstitial) => interstitial.lwpUserPageAnnouncements, { onDelete: 'CASCADE' })
    @Field(() => StaticLwpPageAnnouncement)
    pageAnnouncement: StaticLwpPageAnnouncement;

    @Field()
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
    seenAt: Date;

    // Common Fields - in future we will reduce this duplication
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @CreateDateColumn({
        type: 'timestamp',
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

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL', nullable: true })
    @Field(() => LwpUser, { nullable: true })
    logCreatedBy?: LwpUser | null;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL', nullable: true })
    @Field(() => LwpUser, { nullable: true })
    logUpdatedBy?: LwpUser | null;
}
