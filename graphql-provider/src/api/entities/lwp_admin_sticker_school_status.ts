import { Field, ObjectType } from '@nestjs/graphql';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { LeaderOnly } from 'src/auth/authorizers/LeaderOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { LwpSticker } from './lwp_sticker';
import { LwpSchool } from './school';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(LwpAdminStickerSchoolStatus, LeaderOnly)
export class LwpAdminStickerSchoolStatus extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    id: string;

    @ManyToOne(() => LwpSticker, { onDelete: 'CASCADE' })
    @Field(() => LwpSticker)
    sticker: LwpSticker;

    @ManyToOne(() => LwpSchool, { onDelete: 'CASCADE' })
    @Field(() => LwpSchool)
    school: LwpSchool;

    @Column()
    @Field()
    isActive: boolean;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    logCreatedAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    @Field()
    logUpdatedAt: Date;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    logUpdatedBy: LwpUser;
}
