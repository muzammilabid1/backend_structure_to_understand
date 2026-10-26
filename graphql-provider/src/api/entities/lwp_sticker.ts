import { Field, ObjectType } from '@nestjs/graphql';
import { AuthorizeField, TeacherField, UnrestrictedField } from 'src/auth/auth.field.decorators';
import { ActsAsAuthorizer } from 'src/auth/auth.object.decorators';
import { BaseAuthorizerEntity } from 'src/auth/types/BaseAuthorizerEntity';
import { OpType } from 'src/auth/types/OpType';
import { UserType } from 'src/auth/types/UserType';
import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { LwpStickerCharacterItem } from './lwp_sticker_character_item';
import { LwpSchool } from './school';
import { LwpUser } from './user';

@Entity()
@ObjectType()
@ActsAsAuthorizer(LwpSticker, async ({ id, token, opType }) => {
    if (token.userType === UserType.ADMIN) return '*'; // admins can always access

    if (token.isSchoolLeader) {
        const query = LwpSticker.createQueryBuilder('lwp_sticker')
            .leftJoin('lwp_sticker.school', 'school')
            .where('lwp_sticker.id = :stickerId', { stickerId: id });

        if (opType === OpType.Write) {
            const stickerCount = await query
                .andWhere('school.id = :schoolId', {
                    schoolId: token.schoolId
                })
                .select('lwp_sticker.id')
                .getCount();

            return stickerCount > 0 ? '*' : false;
        }

        if (opType === OpType.Read) {
            const stickerCount = await query
                .andWhere('(school.id = :schoolId OR school.id IS NULL)', {
                    schoolId: token.schoolId
                })
                .select('lwp_sticker.id')
                .getCount();

            return stickerCount > 0 ? '*' : false;
        }
    }

    return false;
})
export class LwpSticker extends BaseAuthorizerEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    @Field()
    @AuthorizeField(UnrestrictedField)
    id: string;

    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    alt: string;

    @Column()
    @Field()
    @AuthorizeField(UnrestrictedField)
    fileName: string;

    @Field()
    @AuthorizeField(TeacherField)
    @Column({ default: false })
    isActive: boolean;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    label: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    textColor: string;

    @Column({ nullable: true })
    @Field({ nullable: true })
    @AuthorizeField(TeacherField)
    borderColor: string;

    @ManyToOne(() => LwpStickerCharacterItem, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpStickerCharacterItem, { nullable: true })
    @AuthorizeField(TeacherField)
    character: LwpStickerCharacterItem;

    @ManyToOne(() => LwpStickerCharacterItem, { nullable: true, onDelete: 'SET NULL' })
    @Field(() => LwpStickerCharacterItem, { nullable: true })
    @AuthorizeField(TeacherField)
    item: LwpStickerCharacterItem;

    @ManyToOne(() => LwpSchool, (school) => school.stickers, { nullable: true, onDelete: 'CASCADE' })
    @Field(() => LwpSchool, { nullable: true })
    @AuthorizeField(TeacherField)
    school: LwpSchool;

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
    logCreatedBy: LwpUser;

    @ManyToOne(() => LwpUser, (user) => user.id, { onDelete: 'SET NULL' })
    @Field(() => LwpUser)
    @Index(['logUpdatedBy.id'])
    logUpdatedBy: LwpUser;

    @Field()
    @AuthorizeField(UnrestrictedField)
    imageUrl: string;
}
