import { ObjectType } from '@nestjs/graphql';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { AdminOnly } from 'src/auth/authorizers/AdminOnly';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { LwpPupilFeedback } from './lwp_pupil_feedback';
import { LwpSticker } from './lwp_sticker';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(LogLwpParentStickerNotification, AdminOnly)
@Index(['sticker.id', 'user.id'], { unique: true })
export class LogLwpParentStickerNotification extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    @ManyToOne(() => LwpSticker, { onDelete: 'CASCADE' })
    sticker: LwpSticker;

    @ManyToOne(() => LwpUser, { onDelete: 'CASCADE' })
    user: LwpUser;

    @ManyToOne(() => LwpPupilFeedback, { nullable: true, onDelete: 'SET NULL' })
    feedback: LwpPupilFeedback;

    @CreateDateColumn({
        type: 'timestamp',
        nullable: true,
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    logCreatedAt: Date;
}
